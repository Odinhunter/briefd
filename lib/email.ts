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

export function renderDigestHtml(digest: Digest): string {
  const dateLabel = new Date(digest.generatedAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const clustersHtml = digest.clusters
    .map((cluster, ci) => {
      const storiesHtml = cluster.stories
        .map((story, si) => {
          const url = safeUrl(story.url);
          const isLast = si === cluster.stories.length - 1;
          return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 ${isLast ? "0" : "24px"} 0;">
  <tr>
    <td style="padding:0 0 ${isLast ? "0" : "24px"} 0;border-bottom:${isLast ? "none" : "1px solid #e8eaed"};">
      <div style="font-family:'DM Serif Display',Georgia,serif;font-size:20px;font-weight:400;line-height:1.3;margin:0 0 8px 0;">
        <a href="${url}" style="color:#0f1117;text-decoration:none;">${escapeHtml(story.headline)}</a>
      </div>
      <div style="font-family:Inter,Arial,sans-serif;font-size:14px;color:#808590;line-height:1.6;margin:0 0 12px 0;">${escapeHtml(story.summary)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#f0f4ff;border-left:3px solid #2563eb;padding:10px 14px;">
            <div style="font-family:Inter,Arial,sans-serif;font-size:13px;color:#0f1117;line-height:1.6;"><span style="font-weight:600;color:#2563eb;">Why it matters — </span>${escapeHtml(story.whyItMatters)}</div>
          </td>
        </tr>
      </table>
      <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;color:#808590;letter-spacing:0.04em;text-transform:uppercase;margin:10px 0 0 0;">
        ${escapeHtml(story.source)}&nbsp;&nbsp;<a href="${url}" style="color:#2563eb;text-decoration:none;">READ &rarr;</a>
      </div>
    </td>
  </tr>
</table>`;
        })
        .join("");

      const isLastCluster = ci === digest.clusters.length - 1;
      return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 ${isLastCluster ? "0" : "36px"} 0;">
  <tr>
    <td style="border-left:3px solid #2563eb;padding:0 0 0 12px;margin:0 0 6px 0;">
      <div style="font-family:'DM Serif Display',Georgia,serif;font-size:19px;font-weight:400;color:#0f1117;line-height:1.2;margin:0 0 4px 0;">${escapeHtml(cluster.theme)}</div>
      <div style="font-family:Inter,Arial,sans-serif;font-size:13px;color:#808590;font-style:italic;line-height:1.5;margin:0;">${escapeHtml(cluster.summary)}</div>
    </td>
  </tr>
  <tr><td style="padding:18px 0 0 0;">${storiesHtml}</td></tr>
</table>`;
    })
    .join("");

  const signalsHtml = digest.signals.length
    ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0 0;">
  <tr>
    <td style="background:#fefce8;border:1px solid #fde68a;padding:16px 20px;">
      <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#a16207;margin:0 0 12px 0;">Weak Signals</div>
      ${digest.signals
        .map(
          (s) =>
            `<div style="font-family:Inter,Arial,sans-serif;font-size:13px;color:#374151;line-height:1.6;margin:0 0 6px 0;">— ${escapeHtml(s)}</div>`
        )
        .join("")}
    </td>
  </tr>
</table>`
    : "";

  const sourcesHtml =
    digest.sources && digest.sources.length
      ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0 0;">
  <tr>
    <td style="border-top:1px solid #e8eaed;padding:20px 0 0 0;">
      <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#808590;margin:0 0 10px 0;">Sources Consulted</div>
      ${digest.sources
        .map(
          (s) =>
            `<div style="font-family:Inter,Arial,sans-serif;font-size:12px;color:#808590;line-height:1.6;margin:0 0 4px 0;">— <a href="${safeUrl(s.uri)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(s.title)}</a></div>`
        )
        .join("")}
    </td>
  </tr>
</table>`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f4f6f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <!-- Card -->
      <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;background:#ffffff;">

        <!-- Masthead -->
        <tr>
          <td style="background:#2563eb;padding:20px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1;">BRIEFD</div>
                  <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:9px;font-weight:700;color:rgba(255,255,255,0.6);letter-spacing:0.12em;text-transform:uppercase;margin-top:4px;">Daily Intelligence</div>
                </td>
                <td align="right" style="vertical-align:bottom;">
                  <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;color:rgba(255,255,255,0.75);letter-spacing:0.04em;">${escapeHtml(dateLabel)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:32px 40px 28px 40px;border-bottom:1px solid #e8eaed;">
            <div style="font-family:Inter,Arial,sans-serif;font-size:16px;color:#0f1117;line-height:1.65;">${escapeHtml(digest.intro)}</div>
          </td>
        </tr>

        <!-- Clusters -->
        <tr>
          <td style="padding:32px 40px 0 40px;">
            ${clustersHtml}
          </td>
        </tr>

        <!-- Signals + Sources -->
        <tr>
          <td style="padding:0 40px 32px 40px;">
            ${signalsHtml}
            ${sourcesHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f6f9;padding:16px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:9px;color:#808590;letter-spacing:0.06em;text-transform:uppercase;">Briefd &middot; Daily Intelligence</div>
                </td>
                <td align="right">
                  <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:9px;color:#808590;letter-spacing:0.04em;">Gemini 2.5 Pro + Google Search</div>
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
