# briefd

Personal daily news digest tool. Saves your interests, researches the last 24–72 hours with Perplexity Sonar, emails you a tightly-written personalized brief.

Phase 1: manual trigger only. No auth, no multi-user. Built for one reader — you.

## Stack
- Next.js 14 (App Router, TypeScript)
- Vercel KV for interests storage
- Perplexity Sonar (`sonar-pro`) for research + synthesis
- Nodemailer + Gmail SMTP for delivery
- Tailwind CSS

## Setup

### 1. Install
```bash
npm install
```

### 2. Env vars
Copy the example and fill in:
```bash
cp .env.local.example .env.local
```

You need:
- `PERPLEXITY_API_KEY` — from https://www.perplexity.ai/settings/api
- `GMAIL_USER` — your Gmail address
- `GMAIL_APP_PASSWORD` — a Google **App Password**, not your normal password. Create one at https://myaccount.google.com/apppasswords (you must have 2FA enabled on your Google account first).
- `KV_REST_API_URL` + `KV_REST_API_TOKEN` — create a Vercel KV / Upstash Redis database in the Vercel dashboard under Storage, then copy the REST credentials from the `.env.local` tab.

### 3. Run
```bash
npm run dev
```
Open http://localhost:6969.

## Using it

1. On the dashboard, write a detailed description of what you care about. Be specific — name companies, sub-fields, the debates you follow. The system prompt uses this as a tight lens.
2. Add sharpening keywords (Enter or comma to add each).
3. Click **Save interests**.
4. Click **Generate & send**. Takes 30–60s. Check your inbox.

## Routes

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Dashboard |
| `/api/interests` | GET | Read saved interests |
| `/api/interests` | POST | Save interests (`{ description, keywords }`) |
| `/api/generate` | POST | Build digest via Perplexity + email it |
| `/api/test-email` | GET / POST | Send a bare test email — useful for verifying SMTP before debugging the full pipeline |

## Troubleshooting

**Gmail auth fails.** Make sure you're using an *App Password* (16 characters, grouped 4x4), not your Google account password. 2FA must be enabled on the account. Try `/api/test-email` first to isolate SMTP from the rest of the pipeline.

**Perplexity JSON parse errors.** The system prompt asks for pure JSON but occasionally a model wraps it in fences — the parser handles both. If you're still hitting errors, the raw response is included in the error message; paste it into an issue.

**Empty digest.** Broaden your interests or add more keywords. The prompt is intentionally strict about recency — if nothing genuinely new happened in your area in the last 72 hours, it will return fewer stories rather than pad.

## Architecture

```
app/
  page.tsx                  Dashboard (client component)
  layout.tsx                Root layout
  globals.css               Tailwind entry
  api/
    interests/route.ts      GET/POST interests → KV
    generate/route.ts       POST → Perplexity → email
    test-email/route.ts     SMTP smoke test

lib/
  kv.ts                     Interests persistence
  perplexity.ts             Sonar call + system prompt (core IP)
  email.ts                  HTML + text rendering + nodemailer
```

The system prompt in `lib/perplexity.ts` is the heart of the product. Iterate on it if the briefs aren't sharp enough.
