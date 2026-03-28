"use client";

import { useState } from "react";
import { ManualProfileInput } from "@/lib/types";

interface Props {
  username: string;
  errorMessage: string;
  onSubmit: (data: ManualProfileInput) => void;
  onBack: () => void;
}

export default function ManualEntryForm({
  username,
  errorMessage,
  onSubmit,
  onBack,
}: Props) {
  const [form, setForm] = useState<ManualProfileInput>({
    username: username,
    fullName: "",
    biography: "",
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    isVerified: false,
    externalUrl: "",
    avgLikesPerPost: 0,
    avgCommentsPerPost: 0,
    contentNiche: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? Number(value)
          : type === "checkbox"
            ? (e.target as HTMLInputElement).checked
            : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Info banner */}
      <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-purple-400 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-purple-300 font-medium">
              Enter your profile details below
            </p>
            <p className="text-purple-400/70 text-sm mt-1">
              {errorMessage.includes("manually")
                ? "Fill in the fields below — the full AI analysis will run just the same."
                : "Instagram doesn\u2019t allow automated profile lookups, so we need a few numbers from you. You\u2019ll get the exact same AI-powered report."}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Tip: open your Instagram profile in a browser to copy the numbers.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-1 gradient-text">
          Manual Profile Entry
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Enter your profile stats manually and we&apos;ll still run the full AI
          analysis.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                className={inputClass}
                placeholder="Display name"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Bio</label>
            <textarea
              name="biography"
              value={form.biography}
              onChange={handleChange}
              className={inputClass + " resize-none h-20"}
              placeholder="Your Instagram bio"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Followers</label>
              <input
                type="number"
                name="followersCount"
                value={form.followersCount || ""}
                onChange={handleChange}
                className={inputClass}
                min={0}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Following</label>
              <input
                type="number"
                name="followingCount"
                value={form.followingCount || ""}
                onChange={handleChange}
                className={inputClass}
                min={0}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Posts</label>
              <input
                type="number"
                name="postsCount"
                value={form.postsCount || ""}
                onChange={handleChange}
                className={inputClass}
                min={0}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Avg Likes per Post</label>
              <input
                type="number"
                name="avgLikesPerPost"
                value={form.avgLikesPerPost || ""}
                onChange={handleChange}
                className={inputClass}
                min={0}
              />
            </div>
            <div>
              <label className={labelClass}>Avg Comments per Post</label>
              <input
                type="number"
                name="avgCommentsPerPost"
                value={form.avgCommentsPerPost || ""}
                onChange={handleChange}
                className={inputClass}
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Content Niche</label>
              <input
                type="text"
                name="contentNiche"
                value={form.contentNiche}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g., Fitness, Travel, Tech"
              />
            </div>
            <div>
              <label className={labelClass}>Website URL</label>
              <input
                type="text"
                name="externalUrl"
                value={form.externalUrl}
                onChange={handleChange}
                className={inputClass}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isVerified"
              checked={form.isVerified}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-purple-500 focus:ring-purple-500"
            />
            <label className="text-sm text-gray-300">Verified account</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
            >
              Run Analysis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
