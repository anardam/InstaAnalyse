import { AnalysisReport } from "./types";

const STORAGE_KEY = "instaanalyse_reports";

export interface StoredReport {
  username: string;
  analyzedAt: string;
  profileScore: number;
  engagement: number;
  contentQuality: number;
  consistency: number;
  growthPotential: number;
  brandValue: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  monetisationScore: number;
}

function extractKey(report: AnalysisReport): StoredReport {
  return {
    username: report.username,
    analyzedAt: report.analyzedAt,
    profileScore: report.profileScore.overall,
    engagement: report.profileScore.breakdown.engagement,
    contentQuality: report.profileScore.breakdown.contentQuality,
    consistency: report.profileScore.breakdown.consistency,
    growthPotential: report.profileScore.breakdown.growthPotential,
    brandValue: report.profileScore.breakdown.brandValue,
    engagementRate: report.engagementStats.rate,
    avgLikes: report.engagementStats.avgLikes,
    avgComments: report.engagementStats.avgComments,
    monetisationScore: report.monetisation.readinessScore,
  };
}

function getAll(): StoredReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(reports: StoredReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

/** Save the current report and return the previous report for the same username (if any). */
export function saveAndGetPrevious(report: AnalysisReport): StoredReport | null {
  const all = getAll();
  const current = extractKey(report);

  // Find the most recent previous report for this username
  const previous = all
    .filter((r) => r.username.toLowerCase() === current.username.toLowerCase())
    .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())[0] || null;

  // Save the new one (keep last 20 reports max)
  all.push(current);
  const trimmed = all.slice(-20);
  saveAll(trimmed);

  return previous;
}

export function getPreviousReport(username: string): StoredReport | null {
  const all = getAll();
  return all
    .filter((r) => r.username.toLowerCase() === username.toLowerCase())
    .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())[0] || null;
}
