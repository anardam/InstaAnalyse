import { NextResponse } from "next/server";
import { checkClaudeCli } from "@/lib/claude-cli";
import { HealthCheckResponse } from "@/lib/types";

export async function GET() {
  const result = await checkClaudeCli();

  const response: HealthCheckResponse = {
    status: result.installed && result.authenticated ? "ok" : "error",
    cliInstalled: result.installed,
    cliAuthenticated: result.authenticated,
    message:
      result.installed && result.authenticated
        ? "Claude Code CLI is ready"
        : result.error || "Claude Code CLI is not ready",
  };

  return NextResponse.json(response, {
    status: response.status === "ok" ? 200 : 503,
  });
}
