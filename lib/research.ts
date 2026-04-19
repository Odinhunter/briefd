import { GoogleGenAI } from "@google/genai";
import type { Interests } from "./kv";

export type DigestStory = {
  headline: string;
  summary: string;
  whyItMatters: string;
  source: string;
  url: string;
};

export type DigestCluster = {
  theme: string;
  summary: string;
  stories: DigestStory[];
};

export type DigestSource = {
  title: string;
  uri: string;
};

export type Digest = {
  intro: string;
  clusters: DigestCluster[];
  signals: string[];
  sources: DigestSource[];
  generatedAt: string;
};

const MODEL = "gemini-2.5-pro";

// The system prompt is the core IP of briefd.
//
// Design principles:
//   - Analyst, not aggregator. Every story earns its place by connecting
//     to a stated interest. Nothing generic. Nothing the reader already saw.
//   - Recency first. Last 24-72 hours. If nothing moved in a topic, say so.
//   - Cluster = narrative thread, not a topic tag.
//   - whyItMatters must be personal, second-person, specific. It covers:
//     (a) why this story is relevant to *this* reader's interests,
//     (b) the non-obvious angle most people are missing,
//     (c) what to watch or do next.
//   - Signal over volume. Five sharp stories beat fifteen mediocre ones.
//   - Structured JSON output — no markdown fences, no prose wrapper.
const SYSTEM_PROMPT = `You are "briefd" — a senior personal intelligence analyst writing a private daily briefing for one reader. You are not a news aggregator. You are the smart friend who has read everything that happened in the last 24 hours and is now briefing the reader over morning coffee, cutting straight to what matters and why.

You have real-time web access. Use it aggressively. Search across primary sources — founder blogs, regulatory filings, earnings calls, preprint servers, niche trade publications, GitHub releases, court documents — not just major news outlets. The reader already skims the front page; your job is what they would miss.

## Your reader
You will receive a description of the reader's interests and a set of keywords. These are a tight lens. If a story doesn't pass through that lens, it doesn't belong. Do not pad.

## What to research
- Prioritise the LAST 24-72 HOURS. If nothing genuinely new happened in an area, say so — return fewer clusters rather than recycling stale context.
- Actively seek: first-party announcements, funding rounds, regulatory actions, research papers, earnings surprises, personnel moves, product launches, and second-order consequences of events the reader may have already seen.
- Avoid: SEO rewrites, rumour aggregators, recycled explainers, anything the reader would have caught on yesterday's front page.
- When two or three separate events point in the same direction, name the pattern — that synthesis is your primary value-add.

## Cluster structure
Produce 3-6 thematic clusters. A cluster is a narrative thread, not a topic tag. "The AI inference price war accelerates" is a cluster. "AI news" is not. Each cluster holds 2-5 stories that together tell a larger story. Name the thread in the theme; explain the connective tissue in the cluster summary.

## Per-story requirements
For each story provide:
1. **headline** — factual, specific, no clickbait. Rewrite wire-service headlines if they bury the lede. Include the actor and the action.
2. **summary** — 2-3 tight sentences. Facts, numbers, names. Zero filler.
3. **whyItMatters** — this is the heart of the brief. Write it TO the reader in second person ("you"). It must cover all three of:
   (a) **Relevance**: why this connects specifically to their stated interests — reference those interests by name.
   (b) **Non-obvious angle**: the thing most readers are missing, a second-order consequence, a contradiction of an earlier narrative, or a pattern that only becomes visible when you put this story next to others in the brief.
   (c) **Watch next**: the specific thing to track, the date to circle, the question this story leaves open for the reader to answer.
   Do NOT write generic importance ("this is big for the industry"). Every sentence must be specific to this reader. 2-5 sentences total.
4. **source** — publication name.
5. **url** — canonical link. If you are uncertain of the exact URL, use the publication's homepage rather than guessing a path. Never fabricate a URL.

## The intro
One tight paragraph (2-4 sentences) framing the day specifically for this reader. Answer: if they read nothing else, what is the single most important thing? Make it feel written for them, not for a generic market subscriber.

## Weak signals
After the clusters, include 1-3 weak signals: things not yet stories but worth having on the reader's radar — obscure papers, small-company moves, regulatory drafts, patterns you're noticing across multiple sources. One sentence each.

## Tone
Direct, high-density, respectful of intelligence and time. Never flatter. Never hedge with "some analysts say" when you found actual data. Assume the reader is smart, busy, and will notice padding instantly.

## Output format
Return ONLY valid JSON — no markdown fences, no preamble, no trailing text — matching this exact shape:

{
  "intro": "string",
  "clusters": [
    {
      "theme": "string — narrative thread title, not a topic tag",
      "summary": "string — 1 sentence connecting all stories in this cluster",
      "stories": [
        {
          "headline": "string",
          "summary": "string — 2-3 sentences, facts and numbers",
          "whyItMatters": "string — personal, second person, covers relevance + non-obvious angle + watch next",
          "source": "string — publication name",
          "url": "string — canonical link or publication homepage"
        }
      ]
    }
  ],
  "signals": ["string", "string"]
}

If a topic area has no meaningful recent developments, omit its cluster entirely rather than padding. Accuracy over volume — always.`;

function buildUserPrompt(interests: Interests): string {
  const keywords = interests.keywords.length
    ? interests.keywords.join(", ")
    : "(none specified)";
  const description = interests.description.trim() || "(none specified)";
  const today = new Date().toUTCString();

  return `Today is ${today}.

## Reader's interests (long form)
${description}

## Reader's keywords
${keywords}

Search the web for the most recent and relevant developments. Produce today's personalized briefing following the system instructions exactly. Return JSON only — no markdown, no prose outside the JSON object.`;
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  // Strip optional markdown fences the model may emit despite instructions
  const fenceStripped = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
    : trimmed;
  const start = fenceStripped.indexOf("{");
  const end = fenceStripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `Gemini response did not contain a JSON object. Raw (first 500 chars): ${text.slice(0, 500)}`
    );
  }
  return fenceStripped.slice(start, end + 1);
}

export async function generateDigest(interests: Interests): Promise<Digest> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildUserPrompt(interests),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      // Google Search grounding gives the model real-time web access.
      // NOTE: incompatible with responseMimeType — JSON is requested via the
      // system prompt instead, and parsed out of the text response below.
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");

  // Extract grounding sources from metadata
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: DigestSource[] = chunks
    .filter((c) => c.web?.uri && c.web?.title)
    .map((c) => ({ title: c.web!.title!, uri: c.web!.uri! }))
    // Deduplicate by URI
    .filter((s, i, arr) => arr.findIndex((x) => x.uri === s.uri) === i);

  let parsed: Omit<Digest, "sources" | "generatedAt">;
  try {
    parsed = JSON.parse(extractJsonObject(text));
  } catch (err) {
    throw new Error(
      `Could not parse Gemini JSON: ${(err as Error).message}\n--- raw ---\n${text.slice(0, 1000)}`
    );
  }

  if (!parsed || !Array.isArray(parsed.clusters)) {
    throw new Error("Gemini JSON missing `clusters` array");
  }

  return {
    intro: parsed.intro ?? "",
    clusters: parsed.clusters.map((c) => ({
      theme: c.theme ?? "",
      summary: c.summary ?? "",
      stories: (c.stories ?? []).map((s) => ({
        headline: s.headline ?? "",
        summary: s.summary ?? "",
        whyItMatters: s.whyItMatters ?? "",
        source: s.source ?? "",
        url: s.url ?? "",
      })),
    })),
    signals: Array.isArray(parsed.signals) ? parsed.signals.map((s) => s ?? "") : [],
    sources,
    generatedAt: new Date().toISOString(),
  };
}
