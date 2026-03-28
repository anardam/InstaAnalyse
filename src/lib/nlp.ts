import natural from "natural";

export interface NlpResult {
  themes: string[];
  keywords: string[];
  sentimentScore: number;
  sentimentLabel: string;
}

export function analyzeCaption(captions: string[]): NlpResult {
  const defaultResult: NlpResult = {
    themes: [],
    keywords: [],
    sentimentScore: 0,
    sentimentLabel: "Neutral",
  };

  try {
    if (!captions || captions.length === 0) {
      return defaultResult;
    }

    // Filter out empty captions
    const validCaptions = captions.filter((c) => c && c.trim().length > 0);
    if (validCaptions.length === 0) {
      return defaultResult;
    }

    // TF-IDF for theme/keyword extraction
    const tfidf = new natural.TfIdf();
    for (const caption of validCaptions) {
      // Remove hashtags and mentions for cleaner NLP, but keep the words
      const cleaned = caption
        .replace(/#(\w+)/g, "$1")
        .replace(/@(\w+)/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned) {
        tfidf.addDocument(cleaned);
      }
    }

    // Extract top terms across all documents
    const termScores = new Map<string, number>();
    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been",
      "being", "have", "has", "had", "do", "does", "did", "will",
      "would", "could", "should", "may", "might", "shall", "can",
      "to", "of", "in", "for", "on", "with", "at", "by", "from",
      "it", "this", "that", "these", "those", "i", "you", "he",
      "she", "we", "they", "my", "your", "his", "her", "its",
      "our", "their", "and", "but", "or", "so", "if", "not",
      "no", "just", "like", "get", "got", "go", "going", "make",
      "know", "think", "take", "come", "see", "want", "look",
      "use", "find", "give", "tell", "say", "said", "one", "two",
      "new", "also", "more", "very", "much", "all", "each",
      "every", "some", "any", "other", "about", "out", "up",
      "than", "then", "now", "here", "there", "when", "where",
      "how", "what", "which", "who", "whom", "why", "because",
    ]);

    for (let docIdx = 0; docIdx < validCaptions.length; docIdx++) {
      tfidf.listTerms(docIdx).forEach((item) => {
        const term = item.term.toLowerCase();
        if (term.length > 2 && !stopWords.has(term) && !/^\d+$/.test(term)) {
          termScores.set(
            term,
            (termScores.get(term) || 0) + item.tfidf
          );
        }
      });
    }

    // Sort by score, take top results
    const sortedTerms = Array.from(termScores.entries())
      .sort((a, b) => b[1] - a[1]);

    const keywords = sortedTerms.slice(0, 15).map(([term]) => term);
    // Group top keywords into broader "themes" (top 5)
    const themes = sortedTerms.slice(0, 5).map(([term]) =>
      term.charAt(0).toUpperCase() + term.slice(1)
    );

    // Sentiment analysis
    const analyzer = new natural.SentimentAnalyzer(
      "English",
      natural.PorterStemmer,
      "afinn"
    );
    const tokenizer = new natural.WordTokenizer();

    let totalSentiment = 0;
    let analyzedCount = 0;

    for (const caption of validCaptions) {
      const tokens = tokenizer.tokenize(caption);
      if (tokens && tokens.length > 0) {
        const score = analyzer.getSentiment(tokens);
        totalSentiment += score;
        analyzedCount++;
      }
    }

    const avgSentiment = analyzedCount > 0 ? totalSentiment / analyzedCount : 0;
    // Normalize to -1 to 1 range and then to 0-100
    const normalizedScore = Math.round(Math.max(0, Math.min(100, (avgSentiment + 1) * 50)));

    let sentimentLabel: string;
    if (normalizedScore >= 70) sentimentLabel = "Positive";
    else if (normalizedScore >= 45) sentimentLabel = "Neutral";
    else sentimentLabel = "Negative";

    return {
      themes,
      keywords,
      sentimentScore: normalizedScore,
      sentimentLabel,
    };
  } catch (error) {
    console.error("NLP analysis failed:", error);
    return defaultResult;
  }
}
