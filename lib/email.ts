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

// Ink theme v2 — mobile-first single-column, higher contrast
// bg:#0f0f10  surface:#1a1a1c  border:#2a2a2d  divider:#222225
// text:#f2ede3  textSecondary:#c0bcb3  textTertiary:#8a8680  textMuted:#5a5651
// accent:#e88a2a (warmer amber)

const SERIF = "'DM Serif Display',Georgia,'Times New Roman',serif";
const SANS =
  "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function renderDigestHtml(digest: Digest): string {
  const dateLabel = new Date(digest.generatedAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const clustersHtml = digest.clusters
    .map((cluster, ci) => {
      const clusterNum = String(ci + 1).padStart(2, "0");
      const total = String(digest.clusters.length).padStart(2, "0");

      const storiesHtml = cluster.stories
        .map((story, si) => {
          const url = safeUrl(story.url);
          const isLastStory = si === cluster.stories.length - 1;
          const separator = isLastStory
            ? ""
            : `<div style="height:1px;background:#222225;margin:32px 0;"></div>`;
          return `
<div class="story">
  <div style="font-family:${SANS};font-size:11px;font-weight:600;color:#e88a2a;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:12px;">${escapeHtml(story.source)}</div>
  <a href="${url}" class="headline" style="display:block;font-family:${SERIF};font-size:22px;font-weight:400;color:#f2ede3;line-height:1.3;text-decoration:none;margin-bottom:14px;">${escapeHtml(story.headline)}</a>
  <div class="body" style="font-family:${SANS};font-size:15px;line-height:1.65;color:#c0bcb3;margin-bottom:18px;">${escapeHtml(story.summary)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr>
      <td style="background:#1a1a1c;border-left:3px solid #e88a2a;padding:16px 20px;">
        <div style="font-family:${SANS};font-size:10px;font-weight:700;color:#e88a2a;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:10px;">Why it matters</div>
        <div style="font-family:${SERIF};font-size:16px;line-height:1.55;color:#f2ede3;font-style:italic;">${escapeHtml(story.whyItMatters)}</div>
      </td>
    </tr>
  </table>
  <a href="${url}" style="font-family:${SANS};font-size:11px;font-weight:600;color:#e88a2a;letter-spacing:0.1em;text-decoration:none;text-transform:uppercase;">Read at source &rarr;</a>
</div>
${separator}`;
        })
        .join("");

      return `
<tr>
  <td class="pad-lg" style="padding:44px 48px;border-bottom:1px solid #2a2a2d;">
    <div style="font-family:${SANS};font-size:11px;font-weight:600;color:#8a8680;letter-spacing:0.18em;margin-bottom:10px;">${clusterNum} &nbsp;/&nbsp; ${total}</div>
    <div class="cluster-title" style="font-family:${SERIF};font-size:26px;font-weight:400;color:#f2ede3;line-height:1.25;margin-bottom:12px;">${escapeHtml(cluster.theme)}</div>
    <div style="font-family:${SANS};font-size:14px;color:#c0bcb3;font-style:italic;line-height:1.6;margin-bottom:32px;">${escapeHtml(cluster.summary)}</div>
    ${storiesHtml}
  </td>
</tr>`;
    })
    .join("");

  const signalsHtml = digest.signals.length
    ? `
<tr>
  <td class="pad-lg" style="padding:44px 48px;border-bottom:1px solid #2a2a2d;">
    <div style="font-family:${SANS};font-size:11px;font-weight:600;color:#8a8680;letter-spacing:0.18em;margin-bottom:10px;">ON THE RADAR</div>
    <div style="font-family:${SERIF};font-size:22px;font-weight:400;color:#f2ede3;line-height:1.25;margin-bottom:24px;">Weak signals</div>
    ${digest.signals
      .map(
        (s, i) =>
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${i < digest.signals.length - 1 ? "16px" : "0"};">
            <tr>
              <td width="20" valign="top" style="padding-top:4px;"><span style="font-family:${SANS};font-size:14px;font-weight:700;color:#e88a2a;line-height:1;">&rsaquo;</span></td>
              <td style="font-family:${SANS};font-size:14px;color:#c0bcb3;line-height:1.65;">${escapeHtml(s)}</td>
            </tr>
          </table>`
      )
      .join("")}
  </td>
</tr>`
    : "";

  const sourcesHtml =
    digest.sources && digest.sources.length
      ? `
<div style="font-family:${SANS};font-size:10px;font-weight:600;color:#8a8680;letter-spacing:0.16em;margin-bottom:14px;text-transform:uppercase;">Sources consulted</div>
${digest.sources
  .map(
    (s) =>
      `<div style="font-family:${SANS};font-size:12px;color:#c0bcb3;line-height:1.7;margin-bottom:6px;"><a href="${safeUrl(s.uri)}" style="color:#c0bcb3;text-decoration:none;">&middot;&nbsp; ${escapeHtml(s.title)}</a></div>`
  )
  .join("")}
<div style="height:1px;background:#2a2a2d;margin:24px 0;"></div>`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; background:#0f0f10; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
  a { color:inherit; }
  .headline:hover { color:#e88a2a !important; }
  @media only screen and (max-width: 600px) {
    .container { width:100% !important; }
    .pad-lg { padding:28px 22px !important; }
    .pad-hero { padding:28px 22px !important; }
    .pad-footer { padding:24px 22px !important; }
    .brand { font-size:30px !important; }
    .cluster-title { font-size:23px !important; }
    .headline { font-size:20px !important; }
    .intro { font-size:16px !important; }
    .body { font-size:15px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#0f0f10;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f10;">
<tr>
<td align="center" style="padding:24px 12px;">

<table role="presentation" class="container" width="760" cellpadding="0" cellspacing="0" style="max-width:760px;width:100%;background:#0f0f10;">

  <!-- MASTHEAD -->
  <tr>
    <td class="pad-lg" style="padding:36px 48px 30px 48px;border-bottom:1px solid #2a2a2d;">
      <div class="brand" style="font-family:${SERIF};font-size:38px;font-weight:400;letter-spacing:-0.01em;color:#f2ede3;line-height:1;margin-bottom:14px;">Briefd</div>
      <div style="font-family:${SANS};font-size:11px;font-weight:600;color:#8a8680;letter-spacing:0.18em;text-transform:uppercase;">Daily Brief &nbsp;&middot;&nbsp; ${escapeHtml(dateLabel)}</div>
    </td>
  </tr>

  <!-- INTRO -->
  <tr>
    <td class="pad-hero" style="padding:44px 48px 40px 48px;border-bottom:1px solid #2a2a2d;">
      <div style="font-family:${SANS};font-size:10px;font-weight:700;color:#e88a2a;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:14px;">The Lead</div>
      <div class="intro" style="font-family:${SANS};font-size:17px;line-height:1.7;color:#f2ede3;font-weight:400;">${escapeHtml(digest.intro)}</div>
    </td>
  </tr>

  <!-- CLUSTERS -->
  ${clustersHtml}

  <!-- WEAK SIGNALS -->
  ${signalsHtml}

  <!-- FOOTER -->
  <tr>
    <td class="pad-footer" style="background:#161618;padding:32px 48px;border-top:1px solid #2a2a2d;">
      ${sourcesHtml}
      <div style="font-family:${SANS};font-size:11px;color:#8a8680;letter-spacing:0.08em;line-height:1.7;">
        <span style="color:#c0bcb3;font-weight:600;">Briefd</span> &nbsp;&middot;&nbsp; Daily Intelligence<br>
        <span style="color:#5a5651;">Powered by Gemini 2.5 Pro with Google Search grounding</span>
      </div>
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
