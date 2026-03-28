import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const execFileAsync = promisify(execFile);

const VENV_PYTHON = path.join(process.cwd(), ".venv", "bin", "python3");

function getPython(): string {
  if (fs.existsSync(VENV_PYTHON)) return VENV_PYTHON;
  return "python3";
}

export async function POST(request: NextRequest) {
  try {
    const { igUsername, igPassword } = await request.json();

    if (!igUsername || !igPassword) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const script = `
import instaloader
import json
import sys

L = instaloader.Instaloader(quiet=True)
try:
    L.login(sys.argv[1], sys.argv[2])
    L.save_session_to_file()
    print(json.dumps({"success": True, "message": "Logged in and session saved"}))
except instaloader.exceptions.BadCredentialsException:
    print(json.dumps({"success": False, "error": "Invalid username or password"}))
except instaloader.exceptions.TwoFactorAuthRequiredException:
    print(json.dumps({"success": False, "error": "Two-factor authentication is required. Please disable it temporarily or use manual entry."}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`;

    const tmpPath = path.join(os.tmpdir(), "instaanalyse_login.py");
    fs.writeFileSync(tmpPath, script, "utf-8");

    try {
      const { stdout } = await execFileAsync(
        getPython(),
        [tmpPath, igUsername, igPassword],
        { timeout: 30000 }
      );

      const result = JSON.parse(stdout.trim());
      return NextResponse.json(result);
    } finally {
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
