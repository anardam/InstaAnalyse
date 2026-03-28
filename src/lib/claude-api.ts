import Anthropic from "@anthropic-ai/sdk";
import { InstagramProfile, ManualProfileInput, AnalysisReport } from "./types";
import { NlpResult } from "./nlp";
import { TrendResult } from "./trends";
import { buildAnalysisPrompt } from "./prompt";

export async function analyzeWithApi(
  apiKey: string,
  profileData: InstagramProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): Promise<{ success: boolean; report?: AnalysisReport; error?: string }> {
  const prompt = buildAnalysisPrompt(profileData, nlpResult, trendResult);

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { success: false, error: "No text response from Claude API" };
    }

    let jsonStr = textBlock.text.trim();

    // Strip markdown code fences if present
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
    if (message.includes("401") || message.includes("authentication")) {
      return {
        success: false,
        error: "Invalid API key. Please check your Anthropic API key and try again.",
      };
    }
    if (message.includes("429")) {
      return {
        success: false,
        error: "API rate limit exceeded. Please wait a moment and try again.",
      };
    }
    if (message.includes("JSON")) {
      return {
        success: false,
        error: "Failed to parse analysis results. Please try again.",
      };
    }
    return { success: false, error: `API analysis failed: ${message}` };
  }
}
