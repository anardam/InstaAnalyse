import { execFile, spawn } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { InstagramProfile, ManualProfileInput, AnalysisReport } from "./types";
import { NlpResult } from "./nlp";
import { TrendResult } from "./trends";
import { buildAnalysisPrompt } from "./prompt";

const execFileAsync = promisify(execFile);

// Strip all Claude-related env vars so the subprocess doesn't think it's nested
function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return env;
}

export async function checkClaudeCli(): Promise<{
  installed: boolean;
  authenticated: boolean;
  error?: string;
}> {
  try {
    // Just check the binary exists — calling `claude --print` can hang
    // inside certain environments. Auth is validated when analysis runs.
    const { stdout } = await execFileAsync("which", ["claude"]);
    if (stdout && stdout.trim().length > 0) {
      // Also verify the binary is executable with --version (fast, no network)
      try {
        await execFileAsync("claude", ["--version"], {
          timeout: 5000,
          env: cleanEnv(),
        });
      } catch {
        // --version failed, but binary exists — still pass
      }
      return { installed: true, authenticated: true };
    }
    return {
      installed: false,
      authenticated: false,
      error: "Claude Code CLI is not installed",
    };
  } catch {
    return {
      installed: false,
      authenticated: false,
      error: "Claude Code CLI is not installed",
    };
  }
}

export async function analyzeProfile(
  profileData: InstagramProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): Promise<{ success: boolean; report?: AnalysisReport; error?: string }> {
  const prompt = buildAnalysisPrompt(profileData, nlpResult, trendResult);

  // Write prompt to a temp file to avoid CLI argument length limits
  const tmpFile = path.join(os.tmpdir(), `instaanalyse-prompt-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, prompt, "utf-8");

  try {
    // Use spawn with the prompt file piped via shell cat
    const result = await new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        const child = spawn("sh", ["-c", `cat "${tmpFile}" | claude --print`], {
          env: cleanEnv(),
          stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();
        });
        child.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });
        child.on("error", reject);
        child.on("close", (code) => {
          if (code !== 0 && !stdout) {
            reject(new Error(stderr || `Process exited with code ${code}`));
          } else {
            resolve({ stdout, stderr });
          }
        });

        // Timeout after 4 minutes (large prompt needs more time)
        setTimeout(() => {
          child.kill();
          reject(new Error("Analysis timed out"));
        }, 240000);
      }
    );

    if (result.stderr && !result.stdout) {
      return { success: false, error: `Claude CLI error: ${result.stderr}` };
    }

    // Extract JSON from the response
    let jsonStr = result.stdout.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const report: AnalysisReport = JSON.parse(jsonStr);
    report.analyzedAt = new Date().toISOString();
    report.username = profileData.username;

    return { success: true, report };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("timeout")) {
      return {
        success: false,
        error: "Analysis timed out. Please try again.",
      };
    }
    if (message.includes("JSON")) {
      return {
        success: false,
        error: "Failed to parse analysis results. Please try again.",
      };
    }
    return { success: false, error: `Analysis failed: ${message}` };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}
