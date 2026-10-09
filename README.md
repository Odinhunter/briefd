# briefd

**A personal daily news brief: tell it what you follow, get a tightly written email every morning.**

You describe your interests once, in plain language, plus a few sharpening keywords.
Every day briefd searches the last 24 hours with Gemini and Google Search, groups what
it finds into themes, explains why each story matters to you, and emails the result.
Stories it has already sent you are skipped, so the brief only carries what's new.

Built for one reader. Next.js on Vercel, built solo by Ishan Kabra, April 2026.

## How it works

```
dashboard ──► interests (Upstash Redis)
                    │
Vercel Cron (03:00 UTC) or "Generate & send"
                    ▼
lib/research.ts   Gemini 2.5 Pro + Google Search grounding
                  → recent stories only, clustered by theme, with "why it matters"
                  → excludes URLs already sent (seen-set in Redis)
                    ▼
lib/email.ts      mobile-first HTML + plain-text email via Gmail SMTP
```

- **Grounded, not remembered.** Search grounding gives the model live results, and the
  prompt holds it to a strict recency window. If little happened, the brief is short
  rather than padded.
- **No repeats.** Every sent URL goes into a Redis set, and later runs tell the model to
  exclude those stories.
- **Defensive parsing.** The model is asked for pure JSON. Code fences and null fields
  are handled rather than trusted away.

## Routes

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Dashboard: edit interests, trigger a brief |
| `/api/interests` | GET / POST | Read / save interests (`{ description, keywords }`) |
| `/api/generate` | POST | Build the brief and email it (dashboard button) |
| `/api/generate` | GET | Same, for Vercel Cron; requires `Authorization: Bearer $CRON_SECRET` |
| `/api/test-email` | GET / POST | Send a bare test email to check SMTP |

## Setup

```bash
npm install
npm run dev        # http://localhost:6969
```

Environment variables (`.env.local` locally, project settings on Vercel):

| Variable | What it is |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key |
| `GMAIL_USER` | the Gmail address that sends and receives the brief |
| `GMAIL_APP_PASSWORD` | a Google App Password (needs 2FA), not your account password |
| `getbriefd_KV_REST_API_URL`, `getbriefd_KV_REST_API_TOKEN` | Upstash Redis credentials, injected by the Vercel integration |
| `CRON_SECRET` | any long random string; Vercel Cron sends it automatically |
| `BRIEFD_PASSWORD` | **set this on any public deployment.** It puts the dashboard and API behind a browser password prompt (any username) |

Without `BRIEFD_PASSWORD`, anyone who finds the URL can change your interests or trigger
paid Gemini runs.

## Troubleshooting

- **Gmail auth fails:** use an App Password (16 characters, 2FA on). Hit
  `/api/test-email` first to isolate SMTP from the rest of the pipeline.
- **JSON parse errors:** the raw model response is included in the error message.
- **Empty brief:** broaden the description or add keywords. The recency rule is strict
  on purpose.
