import { NextRequest, NextResponse } from "next/server";
import { scrapeInstagramProfile } from "@/lib/instagram";
import { scrapeWithInstaloader } from "@/lib/instaloader";
import { scrapeWithPuppeteer } from "@/lib/scraper-puppeteer";
import { scrapeWithRapidApi } from "@/lib/scraper-rapidapi";
import { analyzeProfile } from "@/lib/claude-cli";
import { analyzeWithApi } from "@/lib/claude-api";
import { checkRateLimit } from "@/lib/rate-limit";
import { analyzeCaption } from "@/lib/nlp";
import { getTrendDirection } from "@/lib/trends";
import { ManualProfileInput, InstagramProfile } from "@/lib/types";

const isVercel = !!process.env.VERCEL;

export async function POST(request: NextRequest) {
  // Get client IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  // Check for API key from client header or server env
  const clientApiKey = request.headers.get("x-api-key") || "";
  const serverApiKey = process.env.ANTHROPIC_API_KEY || "";
  const apiKey = clientApiKey || serverApiKey;

  // Rate limit check
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    const resetMinutes = Math.ceil(rateLimit.resetIn / 60000);
    return NextResponse.json(
      {
        success: false,
        error: `Rate limit exceeded. You can perform 5 analyses per hour. Try again in ${resetMinutes} minutes.`,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(
            Math.ceil(Date.now() / 1000 + rateLimit.resetIn / 1000)
          ),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { username, manualData } = body as {
      username?: string;
      manualData?: ManualProfileInput;
    };

    if (!username && !manualData) {
      return NextResponse.json(
        { success: false, error: "Username or manual data is required" },
        { status: 400 }
      );
    }

    let profileData: InstagramProfile | ManualProfileInput | undefined;

    if (manualData) {
      profileData = manualData;
    } else if (username) {
      let scraped = false;
      let lastError = "";

      if (isVercel) {
        // On Vercel: RapidAPI → Instagram public API → manual entry
        // (Puppeteer and Instaloader won't reliably work on serverless)

        // 1. RapidAPI Instagram scraper (primary on Vercel)
        try {
          const rapidResult = await scrapeWithRapidApi(username);
          if (rapidResult.success && rapidResult.profile) {
            profileData = rapidResult.profile;
            scraped = true;
          } else {
            lastError = rapidResult.error || "";
          }
        } catch {
          lastError = "RapidAPI scraping failed";
        }

        // 2. Instagram public API (fallback)
        if (!scraped) {
          try {
            const apiResult = await scrapeInstagramProfile(username);
            if (apiResult.success && apiResult.profile) {
              profileData = apiResult.profile;
              scraped = true;
            } else {
              lastError = apiResult.error || lastError;
            }
          } catch {
            // continue
          }
        }
      } else {
        // Local: Puppeteer → Instaloader → RapidAPI → Instagram API

        // 1. Puppeteer (headless browser)
        try {
          const puppeteerResult = await scrapeWithPuppeteer(username);
          if (puppeteerResult.success && puppeteerResult.profile) {
            profileData = puppeteerResult.profile;
            scraped = true;
          } else {
            lastError = puppeteerResult.error || "";
          }
        } catch {
          lastError = "Puppeteer scraping failed";
        }

        // 2. Instaloader
        if (!scraped) {
          try {
            const instaResult = await scrapeWithInstaloader(username);
            if (instaResult.success && instaResult.profile) {
              profileData = instaResult.profile;
              scraped = true;
            } else {
              lastError = instaResult.error || lastError;
            }
          } catch {
            // continue
          }
        }

        // 3. RapidAPI (if key is configured)
        if (!scraped) {
          try {
            const rapidResult = await scrapeWithRapidApi(username);
            if (rapidResult.success && rapidResult.profile) {
              profileData = rapidResult.profile;
              scraped = true;
            } else {
              lastError = rapidResult.error || lastError;
            }
          } catch {
            // continue
          }
        }

        // 4. Instagram public API
        if (!scraped) {
          const apiResult = await scrapeInstagramProfile(username);
          if (apiResult.success && apiResult.profile) {
            profileData = apiResult.profile;
            scraped = true;
          } else {
            lastError = apiResult.error || lastError;
          }
        }
      }

      if (!scraped) {
        return NextResponse.json(
          {
            success: false,
            error: lastError || "Could not fetch profile",
            requiresManualEntry: true,
          },
          { status: 422 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    if (!profileData) {
      return NextResponse.json(
        { success: false, error: "No profile data available" },
        { status: 400 }
      );
    }

    // Extract captions for NLP
    const captions: string[] = [];
    if ("recentPosts" in profileData && profileData.recentPosts) {
      for (const post of profileData.recentPosts) {
        if (post.caption) captions.push(post.caption);
      }
    }

    // NLP + Trends in parallel
    const [nlpResult, trendResult] = await Promise.all([
      Promise.resolve().then(() => {
        try {
          return analyzeCaption(captions);
        } catch {
          return null;
        }
      }),
      Promise.resolve().then(async () => {
        try {
          let niche = "";
          if ("contentNiche" in profileData && profileData.contentNiche) {
            niche = profileData.contentNiche;
          } else if ("biography" in profileData && profileData.biography) {
            niche = profileData.biography.split(/[,.|!\n]/).filter(Boolean)[0]?.trim() || "";
          }
          if (niche) return await getTrendDirection(niche);
          return null;
        } catch {
          return null;
        }
      }),
    ]);

    // Use API if key is available, otherwise fall back to CLI
    let analysis;
    if (apiKey) {
      analysis = await analyzeWithApi(apiKey, profileData, nlpResult, trendResult);
    } else {
      analysis = await analyzeProfile(profileData, nlpResult, trendResult);
    }

    if (!analysis.success) {
      return NextResponse.json(
        { success: false, error: analysis.error },
        { status: 500 }
      );
    }

    // Attach NLP and trend data
    if (analysis.report) {
      if (nlpResult) analysis.report.nlp = nlpResult;
      if (trendResult) analysis.report.trend = trendResult;
    }

    return NextResponse.json(
      { success: true, report: analysis.report },
      { headers: { "X-RateLimit-Remaining": String(rateLimit.remaining) } }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
