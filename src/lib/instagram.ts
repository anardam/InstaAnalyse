import { InstagramProfile } from "./types";

export async function scrapeInstagramProfile(
  username: string
): Promise<{ success: boolean; profile?: InstagramProfile; error?: string }> {
  try {
    // Try Instagram's public web profile endpoint
    const cleanUsername = username.replace(/^@/, "").trim();
    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(cleanUsername)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-IG-App-ID": "936619743392459",
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.status === 404) {
      return { success: false, error: "Username not found" };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Instagram returned status ${response.status}. The profile may be private or Instagram is blocking requests.`,
      };
    }

    const data = await response.json();
    const user = data?.data?.user;

    if (!user) {
      return {
        success: false,
        error: "Could not parse profile data from Instagram",
      };
    }

    if (user.is_private) {
      return {
        success: false,
        error: "This account is private. Please use manual entry instead.",
      };
    }

    // Extract recent posts data
    const recentPosts =
      user.edge_owner_to_timeline_media?.edges?.slice(0, 12)?.map(
        (edge: {
          node: {
            edge_liked_by?: { count: number };
            edge_media_preview_like?: { count: number };
            edge_media_to_comment?: { count: number };
            edge_media_to_caption?: { edges: { node: { text: string } }[] };
            taken_at_timestamp?: number;
            is_video: boolean;
          };
        }) => ({
          likes:
            edge.node.edge_liked_by?.count ||
            edge.node.edge_media_preview_like?.count ||
            0,
          comments: edge.node.edge_media_to_comment?.count || 0,
          caption:
            edge.node.edge_media_to_caption?.edges?.[0]?.node?.text || "",
          timestamp: edge.node.taken_at_timestamp
            ? new Date(edge.node.taken_at_timestamp * 1000).toISOString()
            : undefined,
          isVideo: edge.node.is_video || false,
        })
      ) || [];

    const profile: InstagramProfile = {
      username: user.username,
      fullName: user.full_name || "",
      biography: user.biography || "",
      followersCount: user.edge_followed_by?.count || 0,
      followingCount: user.edge_follow?.count || 0,
      postsCount: user.edge_owner_to_timeline_media?.count || 0,
      isPrivate: user.is_private || false,
      isVerified: user.is_verified || false,
      profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url || "",
      externalUrl: user.external_url || undefined,
      recentPosts,
    };

    return { success: true, profile };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    if (message.includes("timeout") || message.includes("abort")) {
      return {
        success: false,
        error: "Request to Instagram timed out. Please try again or use manual entry.",
      };
    }
    return {
      success: false,
      error: `Failed to fetch profile: ${message}`,
    };
  }
}
