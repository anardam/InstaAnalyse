import { execFile } from "child_process";
import { promisify } from "util";
import { InstagramProfile } from "./types";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

// Resolve the venv Python path relative to the project root
const VENV_PYTHON = path.join(process.cwd(), ".venv", "bin", "python3");

function getPython(): string {
  // Prefer the project venv (has instaloader installed)
  if (fs.existsSync(VENV_PYTHON)) return VENV_PYTHON;
  return "python3";
}

const INSTALOADER_SCRIPT = `
import instaloader
import json
import sys
import os
import glob

username = sys.argv[1]
L = instaloader.Instaloader(
    download_pictures=False,
    download_videos=False,
    download_video_thumbnails=False,
    download_geotags=False,
    download_comments=False,
    save_metadata=False,
    compress_json=False,
    quiet=True
)

# Try to load a saved session for authenticated access
session_dir = os.path.expanduser("~/.config/instaloader")
if os.path.isdir(session_dir):
    session_files = glob.glob(os.path.join(session_dir, "session-*"))
    if session_files:
        session_user = os.path.basename(session_files[0]).replace("session-", "")
        try:
            L.load_session_from_file(session_user)
        except Exception:
            pass

try:
    profile = instaloader.Profile.from_username(L.context, username)

    if profile.is_private:
        print(json.dumps({"error": "private", "message": "This account is private"}))
        sys.exit(0)

    posts = []
    count = 0
    for post in profile.get_posts():
        if count >= 12:
            break
        posts.append({
            "likes": post.likes,
            "comments": post.comments,
            "caption": post.caption or "",
            "timestamp": post.date_utc.isoformat() if post.date_utc else None,
            "isVideo": post.is_video
        })
        count += 1

    result = {
        "username": profile.username,
        "fullName": profile.full_name or "",
        "biography": profile.biography or "",
        "followersCount": profile.followers,
        "followingCount": profile.followees,
        "postsCount": profile.mediacount,
        "isPrivate": profile.is_private,
        "isVerified": profile.is_verified,
        "profilePicUrl": str(profile.profile_pic_url) if profile.profile_pic_url else "",
        "externalUrl": profile.external_url or "",
        "recentPosts": posts
    }

    print(json.dumps(result))
except instaloader.exceptions.ProfileNotExistsException:
    print(json.dumps({"error": "not_found", "message": "Profile not found"}))
except Exception as e:
    print(json.dumps({"error": "unknown", "message": str(e)}))
`;

export async function scrapeWithInstaloader(
  username: string
): Promise<{ success: boolean; profile?: InstagramProfile; error?: string }> {
  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, "instaanalyse_scraper.py");

  try {
    // Write the Python script to a temp file
    fs.writeFileSync(scriptPath, INSTALOADER_SCRIPT, "utf-8");

    const pythonBin = getPython();
    const { stdout, stderr } = await execFileAsync(
      pythonBin,
      [scriptPath, username],
      { timeout: 60000, maxBuffer: 1024 * 1024 * 5 }
    );

    if (!stdout.trim()) {
      return {
        success: false,
        error: stderr
          ? `Instaloader error: ${stderr}`
          : "No output from Instaloader",
      };
    }

    const data = JSON.parse(stdout.trim());

    if (data.error === "private") {
      return {
        success: false,
        error: "This account is private. Please use manual entry instead.",
      };
    }

    if (data.error === "not_found") {
      return { success: false, error: "Username not found" };
    }

    if (data.error) {
      return { success: false, error: data.message || "Unknown Instaloader error" };
    }

    const profile: InstagramProfile = {
      username: data.username,
      fullName: data.fullName,
      biography: data.biography,
      followersCount: data.followersCount,
      followingCount: data.followingCount,
      postsCount: data.postsCount,
      isPrivate: data.isPrivate,
      isVerified: data.isVerified,
      profilePicUrl: data.profilePicUrl,
      externalUrl: data.externalUrl || undefined,
      recentPosts: data.recentPosts || [],
    };

    return { success: true, profile };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT") || message.includes("python3")) {
      return {
        success: false,
        error: "Python3 or Instaloader not found. Falling back to API scraping.",
      };
    }
    if (message.includes("timeout")) {
      return {
        success: false,
        error: "Instaloader timed out. Falling back to API scraping.",
      };
    }
    return { success: false, error: `Instaloader failed: ${message}` };
  } finally {
    // Clean up temp script
    try {
      fs.unlinkSync(scriptPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
