import puppeteer from "puppeteer";
import { InstagramProfile } from "./types";

function parseCount(text: string): number {
  if (!text) return 0;
  const clean = text.replace(/,/g, "").trim().toLowerCase();
  const match = clean.match(/^([\d.]+)\s*([kmb]?)$/);
  if (!match) return parseInt(clean, 10) || 0;
  const num = parseFloat(match[1]);
  const suffix = match[2];
  if (suffix === "k") return Math.round(num * 1000);
  if (suffix === "m") return Math.round(num * 1000000);
  if (suffix === "b") return Math.round(num * 1000000000);
  return Math.round(num);
}

export async function scrapeWithPuppeteer(
  username: string
): Promise<{ success: boolean; profile?: InstagramProfile; error?: string }> {
  let browser;
  try {
    const cleanUsername = username.replace(/^@/, "").trim();

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const page = await browser.newPage();

    // Disguise as a regular browser
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 900 });

    // Block images/videos/fonts to speed things up
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const url = `https://www.instagram.com/${cleanUsername}/`;
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    if (!response || response.status() === 404) {
      return { success: false, error: "Username not found" };
    }

    // Wait for the page content to load
    await page.waitForSelector("header", { timeout: 10000 }).catch(() => {});

    // Check for login wall / private account
    const pageContent = await page.content();

    if (pageContent.includes("This account is private")) {
      return {
        success: false,
        error: "This account is private. Please use manual entry instead.",
      };
    }

    // Try to extract data from the page's JSON-LD or meta tags first
    const profileData = await page.evaluate(() => {
      // Method 1: Try meta tags
      const description =
        document.querySelector('meta[name="description"]')?.getAttribute("content") ||
        document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
        "";
      const title =
        document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";

      // Method 2: Try _sharedData or other embedded JSON
      const scripts = Array.from(document.querySelectorAll("script"));
      let sharedData = null;
      for (const script of scripts) {
        const text = script.textContent || "";
        if (text.includes("window._sharedData")) {
          const match = text.match(/window\._sharedData\s*=\s*({.+?});/);
          if (match) {
            try {
              sharedData = JSON.parse(match[1]);
            } catch { /* ignore */ }
          }
        }
        // Also try __additionalDataLoaded
        if (text.includes("__additionalData")) {
          const match = text.match(/"user":\s*({[^}]+?"edge_followed_by"[^}]+?})/);
          if (match) {
            try {
              sharedData = { extracted_user: JSON.parse(match[1]) };
            } catch { /* ignore */ }
          }
        }
      }

      return { description, title, sharedData };
    });

    // Parse the meta description which usually has format:
    // "1.2M Followers, 500 Following, 300 Posts - See Instagram photos and videos from Name (@username)"
    const desc = profileData.description;
    const metaMatch = desc.match(
      /^([\d,.]+[KkMmBb]?)\s+Followers?,\s*([\d,.]+[KkMmBb]?)\s+Following,\s*([\d,.]+[KkMmBb]?)\s+Posts?\s*[-–—]\s*(?:See Instagram.*from\s+)?(.+?)(?:\s*\(@?\w+\))?$/i
    );

    let followersCount = 0;
    let followingCount = 0;
    let postsCount = 0;
    let fullName = "";

    if (metaMatch) {
      followersCount = parseCount(metaMatch[1]);
      followingCount = parseCount(metaMatch[2]);
      postsCount = parseCount(metaMatch[3]);
      fullName = metaMatch[4]?.trim() || "";
    }

    // If meta parsing failed, try scraping the header section directly
    if (followersCount === 0) {
      const headerData = await page.evaluate(() => {
        const headerEl = document.querySelector("header");
        if (!headerEl) return null;

        // Find all spans/divs with number-like content in the header
        const allText = headerEl.textContent || "";
        const numbers = allText.match(/[\d,.]+[KkMmBb]?/g) || [];

        // Try to get the display name
        const nameEl = headerEl.querySelector("span") || headerEl.querySelector("h1");
        const displayName = nameEl?.textContent?.trim() || "";

        return { numbers, displayName, fullText: allText };
      });

      if (headerData && headerData.numbers.length >= 3) {
        postsCount = parseCount(headerData.numbers[0] || "0");
        followersCount = parseCount(headerData.numbers[1] || "0");
        followingCount = parseCount(headerData.numbers[2] || "0");
        fullName = headerData.displayName || "";
      }
    }

    // Get the bio from the page
    const bio = await page.evaluate(() => {
      // Bio is usually in a div under the header section
      const bioSection = document.querySelector("header + section") ||
        document.querySelector('header div[style*="-webkit-line-clamp"]') ||
        document.querySelector("header");
      if (!bioSection) return "";

      // Look for bio-like text (not stats, not name)
      const spans = Array.from(bioSection.querySelectorAll("span"));
      for (const span of spans) {
        const text = span.textContent?.trim() || "";
        if (text.length > 20 && !text.match(/^\d/) && !text.includes("Followers")) {
          return text;
        }
      }
      return "";
    });

    if (followersCount === 0 && postsCount === 0) {
      return {
        success: false,
        error: "Could not extract profile data. Instagram may have changed its layout.",
      };
    }

    const profile: InstagramProfile = {
      username: cleanUsername,
      fullName: fullName || cleanUsername,
      biography: bio || "",
      followersCount,
      followingCount,
      postsCount,
      isPrivate: false,
      isVerified: false,
      profilePicUrl: "",
      recentPosts: [],
    };

    return { success: true, profile };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("timeout") || message.includes("Navigation timeout")) {
      return {
        success: false,
        error: "Instagram page load timed out. Please try again.",
      };
    }
    return { success: false, error: `Browser scraping failed: ${message}` };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
