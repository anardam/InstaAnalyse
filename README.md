# InstaAnalyse

AI-powered Instagram profile analyzer built with Next.js 14 and Claude Code CLI.

## Prerequisites

- **Node.js** 18+ and npm
- **Python 3** with pip (for Instaloader scraping)
- **Claude Code CLI** installed and authenticated:
  ```bash
  npm install -g @anthropic-ai/claude-code
  claude  # follow the login prompts
  ```
- **Instaloader** (Python package for Instagram scraping):
  ```bash
  pip install instaloader
  ```

## Setup

```bash
# Clone the repo
git clone <repo-url>
cd InstaAnalyse

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. Enter a public Instagram username
2. The app scrapes the profile using Instaloader (Python subprocess), with a fallback to Instagram's public API
3. Captions are processed with NLP (natural.js) to extract themes, keywords, and sentiment
4. Google Trends is queried for the identified niche to determine trend direction
5. All data is passed to the Claude Code CLI (`claude --print`) for AI analysis
6. A comprehensive report dashboard is rendered with scores, recommendations, and actionable items
7. Download the full report as a PDF

If scraping fails (private account, rate limit, etc.), a manual entry form lets you input stats directly.

## Features

- Profile scoring with 5-metric breakdown
- Engagement stats and estimated reach
- Strengths and weaknesses analysis
- Bio rewrite suggestion
- Content pillars with ideas
- Posting strategy with best times
- Hashtag recommendations (niche / mid-tier / broad)
- Growth roadmap (Week 1 / Month 1 / Month 3)
- Top 10 prioritised action items with impact/effort ratings
- Monetisation readiness assessment
- NLP-extracted themes and keywords
- Caption sentiment analysis
- Google Trends niche direction
- PDF report download
- Rate limiting (5 analyses/hour per IP)
- Dark mode UI with Instagram-inspired gradient aesthetic

## Troubleshooting

### "Claude Code CLI Not Ready" error
Make sure you have Claude Code installed and logged in:
```bash
npm install -g @anthropic-ai/claude-code
claude  # complete the authentication flow
```

### Instagram scraping fails
- The account may be private — use the manual entry form instead
- Instagram may be rate-limiting requests — wait a few minutes and retry
- Instaloader may need updating: `pip install --upgrade instaloader`

### Analysis times out
The Claude CLI analysis can take up to 2 minutes. If it consistently times out, check your internet connection and Claude Code authentication.

### Rate limit hit
The app allows 5 analyses per hour per IP address. Wait for the cooldown period shown in the error message.

### PDF download issues
If the PDF export fails, try using Chrome or Edge. The html2pdf.js library works best in Chromium-based browsers.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Scraping**: Instaloader (Python) + Instagram public API fallback
- **NLP**: natural.js (TF-IDF, sentiment analysis)
- **Trends**: google-trends-api
- **AI Engine**: Claude Code CLI (subprocess)
- **PDF Export**: html2pdf.js
- **Rate Limiting**: In-memory store
