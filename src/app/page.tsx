"use client";

import { useState, useEffect } from "react";
import { AnalysisReport, HealthCheckResponse, ManualProfileInput } from "@/lib/types";
import LoadingScreen from "@/components/LoadingScreen";
import ManualEntryForm from "@/components/ManualEntryForm";
import ReportDashboard from "@/components/ReportDashboard";
import ApiKeyModal, { getStoredApiKey } from "@/components/ApiKeyModal";

type AppState = "checking" | "healthy" | "unhealthy" | "input" | "manual" | "loading" | "report" | "error";

export default function Home() {
  const [state, setState] = useState<AppState>("checking");
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [username, setUsername] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState("");
  const [scrapeError, setScrapeError] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const apiKey = getStoredApiKey();
    setHasApiKey(!!apiKey);

    // If user has an API key, skip CLI health check entirely
    if (apiKey) {
      setState("input");
      return;
    }

    // No API key — check if CLI is available
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthCheckResponse) => {
        setHealth(data);
        setState(data.status === "ok" ? "input" : "unhealthy");
      })
      .catch(() => {
        setHealth({
          status: "error",
          cliInstalled: false,
          cliAuthenticated: false,
          message: "Could not connect to the server",
        });
        setState("unhealthy");
      });
  }, []);

  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    const apiKey = getStoredApiKey();
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }
    return headers;
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setState("loading");
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();

      if (data.requiresManualEntry) {
        setScrapeError(data.error || "Could not fetch profile");
        setState("manual");
        return;
      }

      if (!data.success) {
        setError(data.error || "Analysis failed");
        setState("error");
        return;
      }

      setReport(data.report);
      setState("report");
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    }
  };

  const handleManualSubmit = async (data: ManualProfileInput) => {
    setState("loading");
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ manualData: data }),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error || "Analysis failed");
        setState("error");
        return;
      }

      setReport(result.report);
      setState("report");
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    }
  };

  const resetToInput = () => {
    setState("input");
    setReport(null);
    setError("");
    setScrapeError("");
    setUsername("");
  };

  const handleApiKeyModalClose = () => {
    setShowApiKeyModal(false);
    const apiKey = getStoredApiKey();
    setHasApiKey(!!apiKey);
    // If we were stuck on unhealthy and now have an API key, go to input
    if (state === "unhealthy" && apiKey) {
      setState("input");
    }
  };

  // Settings gear button (shown on most screens)
  const SettingsButton = () => (
    <button
      onClick={() => setShowApiKeyModal(true)}
      className="fixed top-4 right-4 z-40 p-2.5 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg text-gray-400 hover:text-purple-400 hover:border-purple-500/50 transition-all"
      title="API Key Settings"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  );

  // API key status badge
  const ApiKeyBadge = () => (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? "bg-green-400" : "bg-gray-500"}`} />
      <span className="text-gray-500">
        {hasApiKey ? "API Key set" : "Using CLI"}
      </span>
    </div>
  );

  // Health check loading
  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <SettingsButton />
        <ApiKeyModal isOpen={showApiKeyModal} onClose={handleApiKeyModalClose} />
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Checking Claude Code CLI...</p>
        </div>
      </div>
    );
  }

  // No API key and no CLI — prompt for API key
  if (state === "unhealthy") {
    const isVercel = health?.isVercel;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <SettingsButton />
        <ApiKeyModal isOpen={showApiKeyModal} onClose={handleApiKeyModalClose} />
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold gradient-text mb-2">
            {isVercel ? "API Key Required" : "Set Up Your AI Engine"}
          </h2>
          <p className="text-gray-400 mb-2 text-sm">
            {isVercel
              ? "This app is running on Vercel and needs an Anthropic API key to analyze profiles."
              : "No Claude Code CLI detected. Add your Anthropic API key to get started."}
          </p>
          <p className="text-gray-500 mb-6 text-xs">
            Your key is stored only in your browser — it never touches any server.
          </p>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all text-base"
          >
            Add API Key
          </button>
          <p className="text-gray-600 text-xs mt-4">
            Get your key from{" "}
            <span className="text-purple-400">console.anthropic.com → API Keys</span>
          </p>
          {!isVercel && health && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <p className="text-gray-600 text-xs">
                Or install the{" "}
                <span className="text-gray-400">Claude Code CLI</span>{" "}
                to use locally without an API key.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Loading screen
  if (state === "loading") {
    return (
      <>
        <SettingsButton />
        <ApiKeyModal isOpen={showApiKeyModal} onClose={handleApiKeyModalClose} />
        <LoadingScreen />
      </>
    );
  }

  // Report view
  if (state === "report" && report) {
    return (
      <main className="min-h-screen p-3 sm:p-4 md:p-8">
        <SettingsButton />
        <ApiKeyModal isOpen={showApiKeyModal} onClose={handleApiKeyModalClose} />
        <ReportDashboard report={report} onNewAnalysis={resetToInput} />
      </main>
    );
  }

  // Manual entry form
  if (state === "manual") {
    return (
      <main className="min-h-screen flex items-center justify-center p-3 sm:p-4">
        <SettingsButton />
        <ApiKeyModal isOpen={showApiKeyModal} onClose={handleApiKeyModalClose} />
        <ManualEntryForm
          username={username}
          errorMessage={scrapeError}
          onSubmit={handleManualSubmit}
          onBack={resetToInput}
        />
      </main>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <SettingsButton />
        <ApiKeyModal isOpen={showApiKeyModal} onClose={handleApiKeyModalClose} />
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-300 mb-2">Analysis Failed</h2>
          <p className="text-gray-400 mb-6 px-2">{error}</p>
          <button
            onClick={resetToInput}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main input screen
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <SettingsButton />
      <ApiKeyModal isOpen={showApiKeyModal} onClose={handleApiKeyModalClose} />

      {/* Background gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 sm:w-96 h-64 sm:h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 sm:w-96 h-64 sm:h-96 bg-pink-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Logo */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-2 sm:mb-3">
            InstaAnalyse
          </h1>
          <p className="text-gray-400 text-base sm:text-lg">
            AI-powered Instagram profile analysis
          </p>
          <p className="text-gray-500 text-xs sm:text-sm mt-2">
            Get growth strategies, engagement insights, and actionable
            recommendations
          </p>
          <div className="mt-3 flex justify-center">
            <ApiKeyBadge />
          </div>
        </div>

        {/* Input form */}
        <form onSubmit={handleAnalyze} className="space-y-3 sm:space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Instagram username"
              className="w-full pl-10 pr-4 py-3.5 sm:py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white text-base sm:text-lg placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-xl text-white text-base sm:text-lg font-semibold hover:from-purple-500 hover:via-pink-500 hover:to-orange-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed animate-gradient-x bg-[length:200%_auto]"
          >
            Analyze Profile
          </button>
        </form>

        {/* Manual entry link */}
        <button
          onClick={() => {
            setScrapeError("You chose to enter profile data manually.");
            setState("manual");
          }}
          className="mt-3 sm:mt-4 text-sm text-gray-500 hover:text-purple-400 transition-colors"
        >
          Or enter profile stats manually
        </button>

        {/* Info footer */}
        <div className="mt-8 sm:mt-12 grid grid-cols-3 gap-3 sm:gap-4 text-center">
          {[
            { label: "Engagement Analysis", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
            { label: "Growth Roadmap", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
            { label: "Action Items", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 sm:gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-800/50 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
