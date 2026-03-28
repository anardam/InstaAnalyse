import { InstagramProfile } from "./types";

/**
 * Fetch Instagram profile data via RapidAPI Instagram Scraper.
 * Requires RAPIDAPI_KEY env var set on the server.
 *
 * Supports multiple RapidAPI Instagram scraper response formats
 * to handle different providers.
 */
export async function scrapeWithRapidApi(
  username: string
): Promise<{ success: boolean; profile?: InstagramProfile; error?: string }> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return { success: false, error: "RAPIDAPI_KEY not configured" };
  }

  const cleanUsername = username.replace(/^@/, "").trim();

  // Try multiple RapidAPI providers in order of reliability
  const providers = [
    {
      name: "instagram-scraper-2025",
      url: `https://instagram-scraper-20251.p.rapidapi.com/userinfo/?username_or_id=${encodeURIComponent(cleanUsername)}`,
      host: "instagram-scraper-20251.p.rapidapi.com",
    },
    {
      name: "instagram-scraper-api2",
      url: `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(cleanUsername)}`,
      host: "instagram-scraper-api2.p.rapidapi.com",
    },
  ];

  for (const provider of providers) {
    try {
      const res = await fetch(provider.url, {
        method: "GET",
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": provider.host,
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        continue; // try next provider
      }

      const data = await res.json();
      const profile = parseResponse(data, cleanUsername);
      if (profile) {
        return { success: true, profile };
      }
    } catch {
      continue; // try next provider
    }
  }

  return {
    success: false,
    error: "Could not fetch profile from Instagram API providers",
  };
}

/**
 * Parse various RapidAPI response formats into our InstagramProfile type.
 * Different providers return slightly different shapes.
 */
function parseResponse(
  data: Record<string, unknown>,
  fallbackUsername: string
): InstagramProfile | null {
  // Unwrap nested data if present (some APIs wrap in { data: { ... } })
  const root =
    (data.data as Record<string, unknown>) ||
    (data.user as Record<string, unknown>) ||
    (data.result as Record<string, unknown>) ||
    data;

  // Try to extract follower count from various field names
  const followersCount =
    asNumber(root.follower_count) ||
    asNumber(root.followers_count) ||
    asNumber(root.followers) ||
    asNumber(root.edge_followed_by && (root.edge_followed_by as Record<string, unknown>).count) ||
    0;

  const followingCount =
    asNumber(root.following_count) ||
    asNumber(root.followings) ||
    asNumber(root.following) ||
    asNumber(root.edge_follow && (root.edge_follow as Record<string, unknown>).count) ||
    0;

  const postsCount =
    asNumber(root.media_count) ||
    asNumber(root.posts_count) ||
    asNumber(root.total_posts) ||
    asNumber(root.edge_owner_to_timeline_media && (root.edge_owner_to_timeline_media as Record<string, unknown>).count) ||
    0;

  // Need at least follower count to consider it valid
  if (followersCount === 0 && postsCount === 0) {
    return null;
  }

  const username =
    asString(root.username) || fallbackUsername;
  const fullName =
    asString(root.full_name) || asString(root.fullName) || asString(root.name) || username;
  const biography =
    asString(root.biography) || asString(root.bio) || "";
  const isPrivate = root.is_private === true;
  const isVerified = root.is_verified === true || root.verified === true;
  const profilePicUrl =
    asString(root.profile_pic_url_hd) ||
    asString(root.profile_pic_url) ||
    asString(root.profile_picture) ||
    asString(root.avatar) ||
    "";
  const externalUrl =
    asString(root.external_url) || asString(root.website) || undefined;

  // Try to extract recent posts
  const recentPosts = extractPosts(root);

  return {
    username,
    fullName,
    biography,
    followersCount,
    followingCount,
    postsCount,
    isPrivate,
    isVerified,
    profilePicUrl,
    externalUrl,
    recentPosts,
  };
}

function extractPosts(root: Record<string, unknown>) {
  // Try various post array locations
  const postsArr =
    (root.posts as unknown[]) ||
    (root.recent_posts as unknown[]) ||
    (root.media as unknown[]) ||
    (root.items as unknown[]) ||
    (root.edge_owner_to_timeline_media &&
      (root.edge_owner_to_timeline_media as Record<string, unknown>).edges as unknown[]) ||
    [];

  if (!Array.isArray(postsArr) || postsArr.length === 0) return [];

  return postsArr.slice(0, 12).map((post: unknown) => {
    const p = (post as Record<string, unknown>);
    // Handle GraphQL edge format: { node: { ... } }
    const node = (p.node as Record<string, unknown>) || p;

    return {
      likes:
        asNumber(node.like_count) ||
        asNumber(node.likes) ||
        asNumber(node.edge_liked_by && (node.edge_liked_by as Record<string, unknown>).count) ||
        asNumber(node.edge_media_preview_like && (node.edge_media_preview_like as Record<string, unknown>).count) ||
        0,
      comments:
        asNumber(node.comment_count) ||
        asNumber(node.comments) ||
        asNumber(node.edge_media_to_comment && (node.edge_media_to_comment as Record<string, unknown>).count) ||
        0,
      caption:
        asString(node.caption) ||
        asString(
          node.edge_media_to_caption &&
          Array.isArray((node.edge_media_to_caption as Record<string, unknown>).edges) &&
          ((node.edge_media_to_caption as Record<string, unknown>).edges as Record<string, unknown>[])[0]?.node &&
          ((((node.edge_media_to_caption as Record<string, unknown>).edges as Record<string, unknown>[])[0].node as Record<string, unknown>).text)
        ) ||
        undefined,
      timestamp:
        asString(node.taken_at) ||
        (node.taken_at_timestamp ? new Date(asNumber(node.taken_at_timestamp)! * 1000).toISOString() : undefined),
      isVideo: node.is_video === true || node.media_type === 2,
    };
  });
}

function asNumber(val: unknown): number | undefined {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

function asString(val: unknown): string | undefined {
  if (typeof val === "string" && val.length > 0) return val;
  return undefined;
}
