"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { AnalysisReport } from "@/lib/types";
import { saveAndGetPrevious, StoredReport } from "@/lib/report-history";

interface Props {
  report: AnalysisReport;
  onNewAnalysis: () => void;
}

function ScoreRing({
  score,
  size = 120,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 75
      ? "#a855f7"
      : score >= 50
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1f2937"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span
        className="absolute text-2xl font-bold"
        style={{ color, marginTop: size / 2 - 14 }}
      >
        {score}
      </span>
      {label && (
        <span className="text-xs text-gray-400 mt-1">{label}</span>
      )}
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`report-card bg-gray-900/50 border border-gray-800 rounded-xl p-4 sm:p-6 card-glow ${className}`}
    >
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 gradient-text">{title}</h3>
      {children}
    </div>
  );
}

function Badge({
  text,
  variant = "default",
}: {
  text: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const colors = {
    default: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    success: "bg-green-500/20 text-green-300 border-green-500/30",
    warning: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    danger: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border ${colors[variant]}`}
    >
      {text}
    </span>
  );
}

function SentimentGauge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 70
      ? "#22c55e"
      : score >= 45
        ? "#f59e0b"
        : "#ef4444";
  const rotation = (score / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={90} viewBox="0 0 160 90">
        {/* Background arc */}
        <path
          d="M 10 80 A 70 70 0 0 1 150 80"
          fill="none"
          stroke="#1f2937"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d="M 10 80 A 70 70 0 0 1 150 80"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 220} 220`}
          className="transition-all duration-1000"
        />
        {/* Needle */}
        <line
          x1="80"
          y1="80"
          x2="80"
          y2="25"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${rotation} 80 80)`}
          className="transition-all duration-1000"
        />
        <circle cx="80" cy="80" r="4" fill={color} />
      </svg>
      <p className="text-2xl font-bold mt-1" style={{ color }}>
        {score}/100
      </p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

function TrendIcon({ direction }: { direction: "rising" | "stable" | "declining" }) {
  if (direction === "rising") {
    return (
      <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    );
  }
  if (direction === "declining") {
    return (
      <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
      </svg>
    );
  }
  return (
    <svg className="w-12 h-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  );
}

function impactVariant(level: string) {
  if (level === "High") return "success" as const;
  if (level === "Medium") return "warning" as const;
  return "danger" as const;
}

function effortVariant(level: string) {
  if (level === "Low") return "success" as const;
  if (level === "Medium") return "warning" as const;
  return "danger" as const;
}

export default function ReportDashboard({ report, onNewAnalysis }: Props) {
  const { profileScore, engagementStats, strengthsWeaknesses } = report;
  const reportRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previousReport, setPreviousReport] = useState<StoredReport | null>(null);

  useEffect(() => {
    const prev = saveAndGetPrevious(report);
    setPreviousReport(prev);
  }, [report]);

  const handleDownloadPdf = useCallback(async () => {
    if (!reportRef.current) return;
    setPdfLoading(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = reportRef.current;

      // Add print-mode class for white background
      element.classList.add("pdf-export");

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `instaanalyse-report-${report.username}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(element)
        .save();

      element.classList.remove("pdf-export");
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("PDF export failed. Please try again or use your browser's print function (Ctrl+P).");
    } finally {
      setPdfLoading(false);
    }
  }, [report.username]);

  return (
    <div ref={reportRef} className="max-w-6xl mx-auto space-y-6">
      {/* PDF export styles (injected inline so they apply during export) */}
      <style>{`
        .pdf-export {
          background: #ffffff !important;
          color: #111827 !important;
        }
        .pdf-export .report-card {
          background: #f9fafb !important;
          border-color: #e5e7eb !important;
        }
        .pdf-export .report-card::before {
          display: none !important;
        }
        .pdf-export .gradient-text {
          -webkit-text-fill-color: #7c3aed !important;
        }
        .pdf-export .text-gray-300,
        .pdf-export .text-gray-400,
        .pdf-export .text-gray-500,
        .pdf-export .text-white {
          color: #374151 !important;
        }
        .pdf-export .text-purple-300,
        .pdf-export .text-purple-400 {
          color: #7c3aed !important;
        }
        .pdf-export .text-pink-300,
        .pdf-export .text-pink-400 {
          color: #db2777 !important;
        }
        .pdf-export .text-green-300,
        .pdf-export .text-green-400 {
          color: #059669 !important;
        }
        .pdf-export .text-red-300,
        .pdf-export .text-red-400 {
          color: #dc2626 !important;
        }
        .pdf-export .text-yellow-300,
        .pdf-export .text-yellow-400 {
          color: #d97706 !important;
        }
        .pdf-export .text-orange-300,
        .pdf-export .text-orange-400 {
          color: #ea580c !important;
        }
        .pdf-export .text-blue-400 {
          color: #2563eb !important;
        }
        .pdf-export .bg-gray-800\\/30,
        .pdf-export .bg-gray-800\\/50 {
          background: #f3f4f6 !important;
        }
        .pdf-export [class*="bg-purple-500\\/10"],
        .pdf-export [class*="bg-pink-500\\/10"],
        .pdf-export [class*="bg-green-500\\/10"],
        .pdf-export [class*="from-purple-500\\/10"],
        .pdf-export [class*="from-purple-500\\/20"] {
          background: #f5f3ff !important;
        }
        .pdf-export .pdf-hide {
          display: none !important;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">
            @{report.username}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Analyzed {new Date(report.analyzedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2 pdf-hide">
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50"
          >
            {pdfLoading ? "Generating..." : "Download PDF"}
          </button>
          <button
            onClick={onNewAnalysis}
            className="px-3 sm:px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors text-sm"
          >
            New Analysis
          </button>
        </div>
      </div>

      {/* Progress from Last Scan */}
      {previousReport && (
        <Card title={`Progress Since Last Scan (${new Date(previousReport.analyzedAt).toLocaleDateString()})`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {([
              ["Overall Score", report.profileScore.overall, previousReport.profileScore, ""],
              ["Engagement", report.profileScore.breakdown.engagement, previousReport.engagement, ""],
              ["Content Quality", report.profileScore.breakdown.contentQuality, previousReport.contentQuality, ""],
              ["Growth Potential", report.profileScore.breakdown.growthPotential, previousReport.growthPotential, ""],
              ["Monetisation", report.monetisation.readinessScore, previousReport.monetisationScore, ""],
            ] as [string, number, number, string][]).map(([label, current, prev]) => {
              const diff = current - prev;
              const isPositive = diff > 0;
              const isNeutral = diff === 0;
              return (
                <div
                  key={label}
                  className={`rounded-lg p-3 text-center border ${
                    isNeutral
                      ? "bg-gray-800/30 border-gray-700/50"
                      : isPositive
                        ? "bg-green-500/10 border-green-500/20"
                        : "bg-red-500/10 border-red-500/20"
                  }`}
                >
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-lg font-bold text-white">{current}</span>
                    {!isNeutral && (
                      <span className={`text-sm font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                        {isPositive ? "\u25B2" : "\u25BC"}{Math.abs(Math.round(diff))}
                      </span>
                    )}
                    {isNeutral && <span className="text-sm text-gray-500">=</span>}
                  </div>
                  <p className="text-[10px] text-gray-500">was {prev}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              ["Eng. Rate", report.engagementStats.rate, previousReport.engagementRate, "%", true],
              ["Avg Likes", report.engagementStats.avgLikes, previousReport.avgLikes, "", false],
              ["Avg Comments", report.engagementStats.avgComments, previousReport.avgComments, "", false],
            ] as [string, number, number, string, boolean][]).map(([label, current, prev, suffix, isPct]) => {
              const diff = current - prev;
              const isPositive = diff > 0;
              const isNeutral = diff === 0;
              return (
                <div key={label} className="bg-gray-800/30 rounded-lg p-3 flex items-center justify-between border border-gray-700/50">
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-semibold text-white">
                      {isPct ? `${current}%` : current.toLocaleString()}
                    </p>
                  </div>
                  {!isNeutral && (
                    <span className={`text-sm font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                      {isPositive ? "+" : ""}{isPct ? diff.toFixed(1) : Math.round(diff)}{suffix}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Overall Score */}
      <Card title="Profile Score">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative flex items-center justify-center">
            <ScoreRing score={profileScore.overall} size={140} />
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Object.entries(profileScore.breakdown).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <ScoreRing score={value as number} size={80} />
                </div>
                <p className="text-xs text-gray-400 mt-2 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Engagement Stats + Strengths/Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Engagement Stats">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-2xl font-bold text-purple-400">
                {engagementStats.rate}%
              </p>
              <p className="text-xs text-gray-400">Engagement Rate</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-2xl font-bold text-pink-400">
                {engagementStats.avgLikes.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Avg Likes</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-2xl font-bold text-orange-400">
                {engagementStats.avgComments.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Avg Comments</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-2xl font-bold text-blue-400">
                {engagementStats.estimatedReach.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Est. Reach</p>
            </div>
          </div>
        </Card>

        <Card title="Strengths & Weaknesses">
          <div className="space-y-3">
            {strengthsWeaknesses.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5 shrink-0">+</span>
                <span className="text-sm text-gray-300">{s}</span>
              </div>
            ))}
            <div className="border-t border-gray-800 my-2" />
            {strengthsWeaknesses.weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5 shrink-0">-</span>
                <span className="text-sm text-gray-300">{w}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* NLP Themes + Sentiment + Trend (new sections) */}
      {(report.nlp || report.trend) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Themes & Keywords */}
          {report.nlp && (report.nlp.themes.length > 0 || report.nlp.keywords.length > 0) && (
            <Card title="Themes & Keywords" className="md:col-span-1">
              {report.nlp.themes.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">Top Themes</p>
                  <div className="flex flex-wrap gap-2">
                    {report.nlp.themes.map((theme, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-sm font-medium"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {report.nlp.keywords.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.nlp.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-pink-500/10 text-pink-300 border border-pink-500/20 rounded text-xs"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Caption Sentiment */}
          {report.nlp && (
            <Card title="Caption Sentiment" className="md:col-span-1">
              <div className="flex justify-center">
                <SentimentGauge
                  score={report.nlp.sentimentScore}
                  label={report.nlp.sentimentLabel}
                />
              </div>
            </Card>
          )}

          {/* Niche Trend */}
          {report.trend && (
            <Card title="Niche Trend" className="md:col-span-1">
              <div className="flex flex-col items-center text-center">
                <TrendIcon direction={report.trend.direction} />
                <p className={`text-xl font-bold mt-3 capitalize ${
                  report.trend.direction === "rising"
                    ? "text-green-400"
                    : report.trend.direction === "declining"
                      ? "text-red-400"
                      : "text-yellow-400"
                }`}>
                  {report.trend.direction}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  &quot;{report.trend.keyword}&quot; — last 90 days
                </p>
                {report.trend.timelineData && report.trend.timelineData.length > 0 && (
                  <div className="w-full mt-4 flex items-end gap-1 h-16">
                    {report.trend.timelineData.map((d, i) => {
                      const max = Math.max(...report.trend!.timelineData!.map((t) => t.value));
                      const height = max > 0 ? (d.value / max) * 100 : 0;
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-t transition-all ${
                            report.trend!.direction === "rising"
                              ? "bg-green-500/40"
                              : report.trend!.direction === "declining"
                                ? "bg-red-500/40"
                                : "bg-yellow-500/40"
                          }`}
                          style={{ height: `${Math.max(height, 4)}%` }}
                          title={`${d.date}: ${d.value}`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Bio Rewrite */}
      <Card title="Bio Rewrite Suggestion">
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
          <p className="text-white font-medium">{report.bioRewrite}</p>
          <button
            onClick={() => navigator.clipboard.writeText(report.bioRewrite)}
            className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors pdf-hide"
          >
            Copy to clipboard
          </button>
        </div>
      </Card>

      {/* Content Pillars */}
      <Card title="Content Pillars">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {report.contentPillars.map((pillar, i) => (
            <div
              key={i}
              className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50"
            >
              <h4 className="font-semibold text-purple-300 mb-1">
                {pillar.name}
              </h4>
              <p className="text-xs text-gray-400 mb-3">
                {pillar.description}
              </p>
              <ul className="space-y-1">
                {pillar.contentIdeas.map((idea, j) => (
                  <li
                    key={j}
                    className="text-xs text-gray-300 flex items-start gap-1.5"
                  >
                    <span className="text-pink-400 shrink-0">*</span>
                    {idea}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* Posting Strategy */}
      <Card title="Posting Strategy">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-xs text-gray-400">Current</p>
                <p className="text-sm text-gray-300">
                  {report.postingStrategy.currentFrequency}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
              <div className="text-right">
                <p className="text-xs text-gray-400">Recommended</p>
                <p className="text-sm text-purple-300 font-medium">
                  {report.postingStrategy.recommendedFrequency}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">Best Formats</p>
              <div className="flex flex-wrap gap-2">
                {report.postingStrategy.bestFormats.map((f, i) => (
                  <Badge key={i} text={f} />
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">Best Times to Post</p>
            <div className="space-y-1.5">
              {report.postingStrategy.bestTimes.map((t, i) => (
                <div
                  key={i}
                  className="flex justify-between text-sm bg-gray-800/30 px-3 py-1.5 rounded"
                >
                  <span className="text-gray-300">{t.day}</span>
                  <span className="text-purple-300 font-medium">{t.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Hashtags */}
      <Card title="Hashtag Recommendations">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(
            [
              ["Niche", report.hashtags.niche, "purple"],
              ["Mid-Tier", report.hashtags.midTier, "pink"],
              ["Broad", report.hashtags.broad, "orange"],
            ] as const
          ).map(([label, tags, color]) => (
            <div key={label}>
              <h4
                className={`text-sm font-semibold mb-2 text-${color}-400`}
              >
                {label}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-1 rounded bg-${color}-500/10 text-${color}-300 border border-${color}-500/20 cursor-pointer hover:bg-${color}-500/20 transition-colors`}
                    onClick={() => navigator.clipboard.writeText(tag)}
                    title="Click to copy"
                  >
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const all = [
              ...report.hashtags.niche,
              ...report.hashtags.midTier,
              ...report.hashtags.broad,
            ]
              .map((t) => (t.startsWith("#") ? t : `#${t}`))
              .join(" ");
            navigator.clipboard.writeText(all);
          }}
          className="mt-4 text-xs text-purple-400 hover:text-purple-300 transition-colors pdf-hide"
        >
          Copy all hashtags
        </button>
      </Card>

      {/* Growth Roadmap */}
      <Card title="Growth Roadmap">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {report.roadmap.map((phase, i) => (
            <div
              key={i}
              className="relative bg-gray-800/30 rounded-lg p-4 border border-gray-700/50"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <div>
                  <h4 className="font-semibold text-white">{phase.phase}</h4>
                  <p className="text-xs text-gray-400">{phase.timeframe}</p>
                </div>
              </div>
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">Goals</p>
                <ul className="space-y-1">
                  {phase.goals.map((g, j) => (
                    <li key={j} className="text-xs text-gray-300">
                      - {g}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">Actions</p>
                <ul className="space-y-1">
                  {phase.actions.map((a, j) => (
                    <li key={j} className="text-xs text-gray-300">
                      - {a}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-purple-500/10 rounded p-2 mt-auto">
                <p className="text-xs text-purple-300">
                  {phase.expectedOutcome}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Wins — do these right now */}
      {report.quickWins && report.quickWins.length > 0 && (
        <Card title="Quick Wins — Do These Right Now">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.quickWins.map((win, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <h4 className="font-semibold text-green-300 text-sm">{win.action}</h4>
                </div>
                <p className="text-xs text-gray-400 mb-2">{win.why}</p>
                <div className="bg-black/20 rounded p-2.5">
                  <p className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{win.howTo}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action Items — with step-by-step */}
      <Card title="Top 10 Action Items">
        <div className="space-y-4">
          {report.actionItems.map((item) => (
            <div
              key={item.rank}
              className="bg-gray-800/30 rounded-lg p-5 border border-gray-700/50"
            >
              <div className="flex items-start gap-4">
                <span className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shrink-0">
                  {item.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2 mb-1">
                    <h4 className="font-semibold text-white">{item.action}</h4>
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge
                        text={`Impact: ${item.impact}`}
                        variant={impactVariant(item.impact)}
                      />
                      <Badge
                        text={`Effort: ${item.effort}`}
                        variant={effortVariant(item.effort)}
                      />
                      {item.timeline && (
                        <Badge text={item.timeline} variant="default" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    {item.description}
                  </p>
                  {/* Step-by-step instructions */}
                  {item.steps && item.steps.length > 0 && (
                    <div className="bg-black/20 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-purple-400 font-semibold uppercase tracking-wide">How to do it:</p>
                      {item.steps.map((step, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <span className="text-purple-400 text-xs font-bold mt-0.5 shrink-0">
                            {j + 1}.
                          </span>
                          <p className="text-xs text-gray-300">{step}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-purple-400/60 mt-2 inline-block">
                    {item.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Content Calendar */}
      {report.contentCalendar && report.contentCalendar.length > 0 && (
        <Card title="7-Day Content Calendar — Ready to Post">
          <div className="space-y-3">
            {report.contentCalendar.map((day, i) => (
              <div
                key={i}
                className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50"
              >
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-semibold min-w-[70px] sm:min-w-[80px] text-center">
                    {day.day}
                  </span>
                  <Badge text={day.contentType} variant="default" />
                  <span className="text-sm text-white font-medium">{day.topic}</span>
                </div>
                <div className="sm:ml-[92px] space-y-2">
                  <div className="bg-black/20 rounded p-2.5">
                    <p className="text-xs text-gray-400 mb-1">Caption:</p>
                    <p className="text-sm text-gray-200">{day.caption}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {day.hashtags.split(/\s+/).map((tag, j) => (
                      <span
                        key={j}
                        className="text-xs text-pink-300 cursor-pointer hover:text-pink-200"
                        onClick={() => navigator.clipboard.writeText(tag)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const text = report.contentCalendar
                .map((d) => `${d.day} (${d.contentType}): ${d.topic}\nCaption: ${d.caption}\n${d.hashtags}`)
                .join("\n\n");
              navigator.clipboard.writeText(text);
            }}
            className="mt-4 text-xs text-purple-400 hover:text-purple-300 transition-colors pdf-hide"
          >
            Copy entire calendar
          </button>
        </Card>
      )}

      {/* Competitor Insights */}
      {report.competitorInsights && report.competitorInsights.length > 0 && (
        <Card title="What Top Accounts in Your Niche Do">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report.competitorInsights.map((insight, i) => (
              <div
                key={i}
                className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50"
              >
                <h4 className="font-semibold text-purple-300 text-sm mb-1">{insight.tactic}</h4>
                <p className="text-xs text-gray-400 mb-3">{insight.description}</p>
                <div className="bg-purple-500/10 rounded p-2.5">
                  <p className="text-xs text-purple-400 font-semibold mb-1">How to apply:</p>
                  <p className="text-xs text-gray-300">{insight.howToApply}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Monetisation */}
      <Card title="Monetisation Readiness">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative inline-flex items-center justify-center">
                <ScoreRing
                  score={report.monetisation.readinessScore}
                  size={100}
                />
              </div>
              <div>
                <p className="text-lg font-bold text-white">
                  {report.monetisation.currentTier}
                </p>
                <p className="text-sm text-gray-400">Current Tier</p>
                <p className="text-sm text-green-400 font-medium mt-1">
                  {report.monetisation.potentialRevenue}
                </p>
                <p className="text-xs text-gray-400">Est. Monthly Revenue</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Requirements</p>
              <ul className="space-y-1">
                {report.monetisation.requirements.map((r, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-300 flex items-start gap-2"
                  >
                    <span className="text-yellow-400 shrink-0">!</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            {report.monetisation.nextMilestone && (
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-400 font-semibold mb-1">Next Milestone</p>
                <p className="text-sm text-gray-200">{report.monetisation.nextMilestone}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mb-2">Opportunities</p>
            <div className="space-y-2">
              {report.monetisation.opportunities.map((o, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-3"
                >
                  <p className="text-sm text-gray-200">{o}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center py-8 pdf-hide">
        <p className="text-gray-500 text-sm">
          Generated by InstaAnalyse &middot; Powered by Claude AI
        </p>
        <div className="flex justify-center gap-3 mt-4">
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50"
          >
            {pdfLoading ? "Generating..." : "Download PDF"}
          </button>
          <button
            onClick={onNewAnalysis}
            className="px-6 py-2.5 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Analyze Another Profile
          </button>
        </div>
      </div>
    </div>
  );
}
