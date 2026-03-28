"use client";

import { HealthCheckResponse } from "@/lib/types";

interface Props {
  health: HealthCheckResponse;
}

export default function HealthError({ health }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-gray-900/50 border border-red-500/30 rounded-xl p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-red-300 mb-2">
          Claude Code CLI Not Ready
        </h2>
        <p className="text-gray-400 text-center mb-6">{health.message}</p>

        <div className="space-y-4">
          {!health.cliInstalled && (
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-300 mb-2">
                Step 1: Install Claude Code CLI
              </h3>
              <code className="block bg-black/50 px-3 py-2 rounded text-sm text-green-400 font-mono">
                npm install -g @anthropic-ai/claude-code
              </code>
            </div>
          )}

          {!health.cliAuthenticated && (
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-300 mb-2">
                {health.cliInstalled ? "Step 1" : "Step 2"}: Log in to Claude
              </h3>
              <code className="block bg-black/50 px-3 py-2 rounded text-sm text-green-400 font-mono">
                claude
              </code>
              <p className="text-xs text-gray-500 mt-2">
                Run this command in your terminal and follow the authentication
                prompts.
              </p>
            </div>
          )}

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-300 mb-2">
              Then restart InstaAnalyse
            </h3>
            <code className="block bg-black/50 px-3 py-2 rounded text-sm text-green-400 font-mono">
              npm run dev
            </code>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full mt-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );
}
