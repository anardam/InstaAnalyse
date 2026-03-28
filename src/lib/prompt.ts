import { InstagramProfile, ManualProfileInput } from "./types";
import { NlpResult } from "./nlp";
import { TrendResult } from "./trends";

export function buildAnalysisPrompt(
  profileData: InstagramProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): string {
  const dataStr = JSON.stringify(profileData, null, 2);

  let nlpSection = "";
  if (nlpResult && (nlpResult.themes.length > 0 || nlpResult.keywords.length > 0)) {
    nlpSection = `

NLP ANALYSIS OF CAPTIONS:
- Extracted Themes: ${nlpResult.themes.join(", ")}
- Top Keywords: ${nlpResult.keywords.join(", ")}
- Average Caption Sentiment: ${nlpResult.sentimentLabel} (score: ${nlpResult.sentimentScore}/100)

Use these NLP-extracted themes and keywords to make your content pillar and hashtag recommendations more specific and grounded in what this creator actually talks about.`;
  }

  let trendSection = "";
  if (trendResult) {
    trendSection = `

NICHE TREND DATA:
- Primary Niche Keyword: "${trendResult.keyword}"
- Trend Direction (last 90 days): ${trendResult.direction.toUpperCase()}

Factor this trend direction into your growth potential score and roadmap recommendations. If the niche is rising, lean into it aggressively. If declining, suggest diversification strategies.`;
  }

  return `You are an expert Instagram growth strategist. Analyze this profile and return actionable, specific recommendations. Do NOT give vague advice — every recommendation must include EXACT steps the user can do right now.

PROFILE DATA:
${dataStr}${nlpSection}${trendSection}

CRITICAL INSTRUCTION: Be extremely specific and actionable. Bad example: "Rewrite your bio to be clearer". Good example: "Change your bio to: '🎬 Actor & Model | NYC + LA | Netflix • Hulu • NBC | Book me: link.to/casting' — this format shows markets, credits, and a CTA in one glance."

Return ONLY a valid JSON object (no markdown, no code fences, no explanation):

{
  "profileScore": {
    "overall": <number 0-100>,
    "breakdown": {
      "contentQuality": <number 0-100>,
      "engagement": <number 0-100>,
      "consistency": <number 0-100>,
      "growthPotential": <number 0-100>,
      "brandValue": <number 0-100>
    }
  },
  "engagementStats": {
    "rate": <number as percentage>,
    "avgLikes": <number>,
    "avgComments": <number>,
    "likesToCommentsRatio": <number>,
    "estimatedReach": <number>
  },
  "strengthsWeaknesses": {
    "strengths": [<3-5 specific strings>],
    "weaknesses": [<3-5 specific strings with what to fix>]
  },
  "bioRewrite": "<write the EXACT new bio they should copy-paste, max 150 chars, with emojis and line breaks as \\n>",
  "contentPillars": [
    {
      "name": "<pillar name>",
      "description": "<brief description>",
      "contentIdeas": [<3 SPECIFIC post ideas with exact captions or hooks they can use>]
    }
  ],
  "postingStrategy": {
    "currentFrequency": "<estimated current posting frequency>",
    "recommendedFrequency": "<recommended frequency>",
    "bestTimes": [{"day": "<day>", "time": "<time in format like 9:00 AM EST>"}],
    "bestFormats": [<recommended content formats>]
  },
  "hashtags": {
    "niche": [<10 niche-specific hashtags with #>],
    "midTier": [<10 mid-tier hashtags with #>],
    "broad": [<10 broad hashtags with #>]
  },
  "roadmap": [
    {
      "phase": "Week 1",
      "timeframe": "Days 1-7",
      "goals": [<2-3 measurable goals like 'Post 5 Reels' not vague like 'increase engagement'>],
      "actions": [<5 specific daily actions like 'Day 1: Update bio to... Day 2: Create a Reel about...'>],
      "expectedOutcome": "<specific measurable outcome like 'Gain 50-100 new followers'>"
    },
    {
      "phase": "Month 1",
      "timeframe": "Days 1-30",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    },
    {
      "phase": "Month 3",
      "timeframe": "Days 1-90",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    }
  ],
  "quickWins": [
    {
      "action": "<something they can do in under 5 minutes>",
      "why": "<why this matters>",
      "howTo": "<exact step-by-step: go to Settings > ... > change X to Y>"
    }
  ],
  "actionItems": [
    {
      "rank": <1-10>,
      "action": "<short action title>",
      "description": "<what this achieves and why it matters>",
      "steps": [<3-5 exact steps like 'Open Instagram > Edit Profile > Change bio to: ...' or 'Record a 15s video showing...' — be specific enough that a beginner can follow>],
      "impact": "<High|Medium|Low>",
      "effort": "<High|Medium|Low>",
      "category": "<category>",
      "timeline": "<when to do this, e.g. 'Today' or 'This week' or 'Ongoing'>"
    }
  ],
  "competitorInsights": [
    {
      "tactic": "<what successful accounts in this niche do>",
      "description": "<specific example of the tactic>",
      "howToApply": "<exact steps to replicate this>"
    }
  ],
  "contentCalendar": [
    {
      "day": "Monday",
      "contentType": "<Reel|Carousel|Story|Post>",
      "topic": "<specific topic>",
      "caption": "<a ready-to-use caption or hook they can copy>",
      "hashtags": "<5 relevant hashtags>"
    }
  ],
  "monetisation": {
    "readinessScore": <number 0-100>,
    "currentTier": "<Nano|Micro|Mid-Tier|Macro|Mega>",
    "potentialRevenue": "<estimated monthly revenue range>",
    "opportunities": [<3-5 specific monetisation opportunities with platform names and steps>],
    "requirements": [<what's needed, be specific like 'Reach 10K followers to unlock swipe-up links'>],
    "nextMilestone": "<the next follower/engagement milestone and what it unlocks>"
  }
}

Provide 3-4 content pillars, 5 quick wins, exactly 10 action items, 3 competitor insights, and a 7-day content calendar. Every recommendation must be specific to this profile's niche. Return ONLY the JSON.`;
}
