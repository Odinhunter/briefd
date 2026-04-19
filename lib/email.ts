import nodemailer from "nodemailer";
import type { Digest } from "./research";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "#";
    return u.toString();
  } catch {
    return "#";
  }
}

// Ink theme colors (oklch values from design converted to email-safe hex)
// emailBg:#0c0c0c  surface:#141414  border:#1e1e1e  text:#e8e4dc
// textMuted:#6f6d6a  textDim:#3c3b3a  accent:#d97706 (amber-600 ≈ oklch(0.72 0.18 46))
// tagBg:#1b1b1b  tagColor:#7a7874  divider:#1d1d1d  calloutBg:#161616

function sectionTag(theme: string): string {
  const ARTICLES = new Set(["the", "a", "an", "how", "why", "what", "when", "where"]);
  const words = theme.split(/\s+/);
  const word = words.find((w) => !ARTICLES.has(w.toLowerCase())) ?? words[0];
  return "/" + word.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
}

export function renderDigestHtml(digest: Digest): string {
  const dateLabel = new Date(digest.generatedAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Masthead section tags — up to 4 from cluster themes
  const mastheadTags = digest.clusters
    .slice(0, 4)
    .map(
      (c) =>
        `<span style="font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;color:#6f6d6a;letter-spacing:0.1em;margin-right:16px;">${escapeHtml(sectionTag(c.theme))}</span>`
    )
    .join("");

  const clustersHtml = digest.clusters
    .map((cluster, ci) => {
      const isLastCluster = ci === digest.clusters.length - 1;

      const storiesHtml = cluster.stories
        .map((story, si) => {
          const url = safeUrl(story.url);
          const isLastStory = si === cluster.stories.length - 1;
          return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding-bottom:${isLastStory ? "0" : "22px"};">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
        <tr>
          <td style="vertical-align:middle;padding-right:10px;white-space:nowrap;">
            <span style="display:inline-block;background:#1b1b1b;color:#7a7874;font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;font-weight:500;letter-spacing:0.12em;padding:3px 8px;border-radius:3px;">${escapeHtml(story.source)}</span>
          </td>
          <td style="vertical-align:middle;">
            <a href="${url}" style="font-family:'DM Serif Display',Georgia,serif;font-size:17px;font-weight:400;color:#e8e4dc;line-height:1.25;text-decoration:none;">${escapeHtml(story.headline)}</a>
          </td>
        </tr>
      </table>
      <div style="font-family:'Inter',Arial,sans-serif;font-size:13px;line-height:1.7;color:#6f6d6a;margin-bottom:10px;">${escapeHtml(story.summary)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
        <tr>
          <td style="background:#161616;border-left:3px solid #d97706;padding:12px 16px;">
            <div style="font-family:'DM Serif Display',Georgia,serif;font-size:14px;line-height:1.55;color:#e8e4dc;font-style:italic;">${escapeHtml(story.whyItMatters)}</div>
          </td>
        </tr>
      </table>
      <a href="${url}" style="font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;color:#d97706;letter-spacing:0.08em;text-decoration:none;text-transform:uppercase;">Read &rarr;</a>
    </td>
  </tr>
  ${isLastStory ? "" : `<tr><td style="padding-bottom:22px;"><div style="height:1px;background:#1d1d1d;"></div></td></tr>`}
</table>`;
        })
        .join("");

      return `
<tr>
  <td style="padding:28px 40px;border-bottom:1px solid #1d1d1d;">
    <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;letter-spacing:0.14em;color:#6f6d6a;margin-bottom:6px;text-transform:uppercase;">${escapeHtml(cluster.theme)}</div>
    <div style="font-family:'Inter',Arial,sans-serif;font-size:13px;color:#6f6d6a;font-style:italic;line-height:1.6;margin-bottom:20px;">${escapeHtml(cluster.summary)}</div>
    ${storiesHtml}
  </td>
</tr>`;
    })
    .join("");

  const signalsHtml = digest.signals.length
    ? `
<tr>
  <td style="padding:28px 40px;border-bottom:1px solid #1d1d1d;">
    <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;letter-spacing:0.14em;color:#6f6d6a;margin-bottom:20px;text-transform:uppercase;">Weak Signals</div>
    ${digest.signals
      .map(
        (s, i) =>
          `<div style="font-family:'Inter',Arial,sans-serif;font-size:13px;color:#6f6d6a;line-height:1.7;margin-bottom:${i < digest.signals.length - 1 ? "10px" : "0"};">&#8212; ${escapeHtml(s)}</div>`
      )
      .join("")}
  </td>
</tr>`
    : "";

  const sourcesHtml =
    digest.sources && digest.sources.length
      ? `
<div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:9px;color:#3c3b3a;letter-spacing:0.1em;margin-bottom:10px;text-transform:uppercase;">Sources</div>
${digest.sources
  .map(
    (s) =>
      `<div style="font-family:'Inter',Arial,sans-serif;font-size:11px;color:#6f6d6a;line-height:1.6;margin-bottom:4px;">&middot; <a href="${safeUrl(s.uri)}" style="color:#6f6d6a;text-decoration:none;">${escapeHtml(s.title)}</a></div>`
  )
  .join("")}
<div style="height:1px;background:#1d1d1d;margin:16px 0;"></div>`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#0c0c0c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;">
<tr>
<td align="center" style="padding:32px 16px;">

<table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;background:#0c0c0c;">

  <!-- MASTHEAD -->
  <tr>
    <td style="padding:28px 40px 24px 40px;border-bottom:1px solid #1e1e1e;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:baseline;">
            <div style="font-family:'DM Serif Display',Georgia,serif;font-size:36px;font-weight:400;letter-spacing:-0.01em;color:#e8e4dc;line-height:1;">Briefd</div>
          </td>
          <td align="right" style="vertical-align:baseline;">
            <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;color:#6f6d6a;letter-spacing:0.08em;text-align:right;line-height:1.6;">Daily Brief<br>${escapeHtml(dateLabel)}</div>
          </td>
        </tr>
      </table>
      <div style="margin-top:8px;">${mastheadTags}</div>
    </td>
  </tr>

  <!-- INTRO (Lead deck) -->
  <tr>
    <td style="padding:36px 40px 32px 40px;border-bottom:1px solid #1d1d1d;">
      <div style="font-family:'Inter',Arial,sans-serif;font-size:16px;line-height:1.65;color:#e8e4dc;font-weight:400;letter-spacing:-0.01em;">${escapeHtml(digest.intro)}</div>
    </td>
  </tr>

  <!-- CLUSTERS -->
  ${clustersHtml}

  <!-- WEAK SIGNALS -->
  ${signalsHtml}

  <!-- FOOTER -->
  <tr>
    <td style="background:#141414;padding:24px 40px;border-top:1px solid #1e1e1e;">
      ${sourcesHtml}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <span style="font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;color:#3c3b3a;letter-spacing:0.06em;">Briefd &middot; Daily Intelligence</span>
          </td>
          <td align="right">
            <span style="font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;color:#3c3b3a;">Gemini 2.5 Pro + Google Search</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}

function renderDigestText(digest: Digest): string {
  const lines: string[] = [];
  lines.push("BRIEFD — DAILY INTELLIGENCE");
  lines.push(new Date(digest.generatedAt).toUTCString());
  lines.push("─".repeat(60));
  lines.push("");
  lines.push(digest.intro);
  lines.push("");
  for (const cluster of digest.clusters) {
    lines.push("─".repeat(60));
    lines.push(cluster.theme.toUpperCase());
    lines.push(cluster.summary);
    lines.push("");
    for (const story of cluster.stories) {
      lines.push(story.headline);
      lines.push(story.summary);
      lines.push(`Why it matters: ${story.whyItMatters}`);
      lines.push(`${story.source} — ${story.url}`);
      lines.push("");
    }
  }
  if (digest.signals.length) {
    lines.push("─".repeat(60));
    lines.push("WEAK SIGNALS");
    lines.push("");
    for (const s of digest.signals) lines.push(`— ${s}`);
    lines.push("");
  }
  if (digest.sources && digest.sources.length) {
    lines.push("─".repeat(60));
    lines.push("SOURCES CONSULTED");
    lines.push("");
    for (const s of digest.sources) lines.push(`— ${s.title}: ${s.uri}`);
    lines.push("");
  }
  lines.push("─".repeat(60));
  lines.push("Briefd · Daily Intelligence · Gemini 2.5 Pro + Google Search");
  return lines.join("\n");
}

export async function sendDigestEmail(digest: Digest): Promise<void> {
  const user = process.env.GMAIL_USER!;
  const transporter = getTransporter();
  const subject = `briefd — ${new Date(digest.generatedAt).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" }
  )}`;

  await transporter.sendMail({
    from: `"briefd" <${user}>`,
    to: user,
    subject,
    text: renderDigestText(digest),
    html: renderDigestHtml(digest),
  });
}

export async function sendTestEmail(): Promise<void> {
  const user = process.env.GMAIL_USER!;
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"briefd" <${user}>`,
    to: user,
    subject: "briefd — SMTP test",
    text: "If you can read this, Gmail SMTP is working.",
    html: `<p>If you can read this, Gmail SMTP is working.</p><p style="color:#888;font-size:12px;">Sent ${new Date().toISOString()}</p>`,
  });
}
