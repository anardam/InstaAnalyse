export interface InstagramProfile {
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  profilePicUrl: string;
  externalUrl?: string;
  recentPosts?: RecentPost[];
}

export interface RecentPost {
  likes: number;
  comments: number;
  caption?: string;
  timestamp?: string;
  isVideo: boolean;
}

export interface ManualProfileInput {
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  externalUrl?: string;
  avgLikesPerPost?: number;
  avgCommentsPerPost?: number;
  contentNiche?: string;
}

export interface ProfileScore {
  overall: number;
  breakdown: {
    contentQuality: number;
    engagement: number;
    consistency: number;
    growthPotential: number;
    brandValue: number;
  };
}

export interface EngagementStats {
  rate: number;
  avgLikes: number;
  avgComments: number;
  likesToCommentsRatio: number;
  estimatedReach: number;
}

export interface StrengthWeakness {
  strengths: string[];
  weaknesses: string[];
}

export interface ContentPillar {
  name: string;
  description: string;
  contentIdeas: string[];
}

export interface PostingStrategy {
  currentFrequency: string;
  recommendedFrequency: string;
  bestTimes: { day: string; time: string }[];
  bestFormats: string[];
}

export interface HashtagGroup {
  niche: string[];
  midTier: string[];
  broad: string[];
}

export interface RoadmapPhase {
  phase: string;
  timeframe: string;
  goals: string[];
  actions: string[];
  expectedOutcome: string;
}

export interface ActionItem {
  rank: number;
  action: string;
  description: string;
  steps: string[];
  impact: "High" | "Medium" | "Low";
  effort: "High" | "Medium" | "Low";
  category: string;
  timeline: string;
}

export interface QuickWin {
  action: string;
  why: string;
  howTo: string;
}

export interface CompetitorInsight {
  tactic: string;
  description: string;
  howToApply: string;
}

export interface ContentCalendarDay {
  day: string;
  contentType: string;
  topic: string;
  caption: string;
  hashtags: string;
}

export interface MonetisationAssessment {
  readinessScore: number;
  currentTier: string;
  potentialRevenue: string;
  opportunities: string[];
  requirements: string[];
  nextMilestone: string;
}

export interface NlpData {
  themes: string[];
  keywords: string[];
  sentimentScore: number;
  sentimentLabel: string;
}

export interface TrendData {
  keyword: string;
  direction: "rising" | "stable" | "declining";
  timelineData?: { date: string; value: number }[];
}

export interface AnalysisReport {
  profileScore: ProfileScore;
  engagementStats: EngagementStats;
  strengthsWeaknesses: StrengthWeakness;
  bioRewrite: string;
  contentPillars: ContentPillar[];
  postingStrategy: PostingStrategy;
  hashtags: HashtagGroup;
  roadmap: RoadmapPhase[];
  actionItems: ActionItem[];
  quickWins: QuickWin[];
  competitorInsights: CompetitorInsight[];
  contentCalendar: ContentCalendarDay[];
  monetisation: MonetisationAssessment;
  analyzedAt: string;
  username: string;
  nlp?: NlpData;
  trend?: TrendData;
}

export interface HealthCheckResponse {
  status: "ok" | "error";
  cliInstalled: boolean;
  cliAuthenticated: boolean;
  message: string;
}

export interface AnalysisResponse {
  success: boolean;
  report?: AnalysisReport;
  error?: string;
  requiresManualEntry?: boolean;
}
