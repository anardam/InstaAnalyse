"use client";

import { useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: Props) {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("anthropic_api_key") || "";
    setKey(stored);
  }, [isOpen]);

  const handleSave = () => {
    if (key.trim()) {
      localStorage.setItem("anthropic_api_key", key.trim());
    } else {
      localStorage.removeItem("anthropic_api_key");
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  const handleClear = () => {
    localStorage.removeItem("anthropic_api_key");
    setKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold gradient-text">API Key Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Enter your Anthropic API key for faster analysis. Your key is stored
          only in your browser and sent directly to the Anthropic API — it never
          touches any other server.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Anthropic API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors font-mono"
            />
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3 text-xs text-gray-500">
            <p className="mb-1">Get your key from:</p>
            <p className="text-purple-400">console.anthropic.com → API Keys → Create Key</p>
            <p className="mt-2">Without a key, the app uses Claude Code CLI locally (requires CLI installed).</p>
          </div>

          <div className="flex gap-2 pt-2">
            {key && (
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/10 transition-colors"
              >
                Remove Key
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-sm font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
            >
              {saved ? "Saved!" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("anthropic_api_key") || "";
}
