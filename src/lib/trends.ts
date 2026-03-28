import * as googleTrends from "google-trends-api";

export interface TrendResult {
  keyword: string;
  direction: "rising" | "stable" | "declining";
  timelineData?: { date: string; value: number }[];
}

export async function getTrendDirection(
  niche: string
): Promise<TrendResult> {
  const defaultResult: TrendResult = {
    keyword: niche,
    direction: "stable",
  };

  try {
    if (!niche || niche.trim().length === 0) {
      return defaultResult;
    }

    // Extract the primary keyword from the niche
    const keyword = niche.split(/[,/|&]/).map(s => s.trim()).filter(Boolean)[0] || niche;

    const results = await googleTrends.interestOverTime({
      keyword,
      startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      endTime: new Date(),
      geo: "",
    });

    const parsed = JSON.parse(results);
    const timelineData = parsed?.default?.timelineData;

    if (!timelineData || timelineData.length < 4) {
      return { ...defaultResult, keyword };
    }

    // Extract values
    const values: number[] = timelineData.map(
      (d: { value: number[] }) => d.value[0]
    );

    // Compare first third average with last third average
    const thirdLen = Math.floor(values.length / 3);
    const firstThird = values.slice(0, thirdLen);
    const lastThird = values.slice(-thirdLen);

    const firstAvg = firstThird.reduce((a: number, b: number) => a + b, 0) / firstThird.length;
    const lastAvg = lastThird.reduce((a: number, b: number) => a + b, 0) / lastThird.length;

    const changePct = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

    let direction: "rising" | "stable" | "declining";
    if (changePct > 15) direction = "rising";
    else if (changePct < -15) direction = "declining";
    else direction = "stable";

    const timeline = timelineData.slice(-12).map(
      (d: { formattedTime: string; value: number[] }) => ({
        date: d.formattedTime,
        value: d.value[0],
      })
    );

    return { keyword, direction, timelineData: timeline };
  } catch (error) {
    console.error("Google Trends failed:", error);
    return defaultResult;
  }
}
