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
    .map((cluster) => {
      const storiesHtml = cluster.stories
        .map((story) => {
          const url = safeUrl(story.url);
          return `
            <div style="margin:0 0 22px 0;padding:0 0 18px 0;border-bottom:1px solid #eeeeee;">
              <div style="font-size:17px;font-weight:600;color:#111111;line-height:1.35;margin:0 0 6px 0;">
                <a href="${url}" style="color:#111111;text-decoration:none;">${escapeHtml(story.headline)}</a>
              </div>
              <div style="font-size:14px;color:#444444;line-height:1.55;margin:0 0 10px 0;">
                ${escapeHtml(story.summary)}
              </div>
              <div style="font-size:13px;color:#1f2937;line-height:1.55;margin:0 0 10px 0;padding:10px 12px;background:#f6f7f9;border-left:3px solid #2563eb;border-radius:4px;">
                <span style="font-weight:600;color:#2563eb;">Why it matters to you — </span>${escapeHtml(story.whyItMatters)}
              </div>
              <div style="font-size:12px;color:#6b7280;">
                ${escapeHtml(story.source)} &middot; <a href="${url}" style="color:#6b7280;">read</a>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <section style="margin:0 0 36px 0;">
          <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#2563eb;margin:0 0 4px 0;">${escapeHtml(cluster.theme)}</h2>
          <p style="font-size:14px;color:#374151;line-height:1.55;margin:0 0 18px 0;font-style:italic;">${escapeHtml(cluster.summary)}</p>
          ${storiesHtml}
        </section>
      `;
    })
    .join("");

  const signalsHtml = digest.signals.length
    ? `
      <section style="margin:28px 0 0 0;padding:18px 20px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#a16207;margin:0 0 10px 0;">Weak signals on your radar</div>
        <ul style="margin:0;padding:0 0 0 18px;color:#374151;font-size:13px;line-height:1.6;">
          ${digest.signals.map((s) => `<li style="margin:0 0 6px 0;">${escapeHtml(s)}</li>`).join("")}
        </ul>
      </section>
    `
    : "";

  const sourcesHtml =
    digest.sources && digest.sources.length
      ? `
      <section style="margin:24px 0 0 0;padding:16px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:0 0 10px 0;">Sources consulted</div>
        <ul style="margin:0;padding:0 0 0 0;list-style:none;color:#64748b;font-size:12px;line-height:1.6;">
          ${digest.sources
            .map(
              (s) =>
                `<li style="margin:0 0 4px 0;">· <a href="${safeUrl(s.uri)}" style="color:#64748b;text-decoration:underline;">${escapeHtml(s.title)}</a></li>`
            )
            .join("")}
        </ul>
      </section>
    `
      : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <tr>
              <td style="padding:32px 36px 8px 36px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">briefd</div>
                <div style="font-size:13px;color:#6b7280;margin-top:4px;">${escapeHtml(dateLabel)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 36px 8px 36px;">
                <p style="font-size:16px;color:#111111;line-height:1.6;margin:0 0 28px 0;">${escapeHtml(digest.intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px 32px 36px;">
                ${clustersHtml}
                ${signalsHtml}
                ${sourcesHtml}
                <p style="font-size:11px;color:#9ca3af;text-align:center;margin:32px 0 0 0;">Generated by briefd using Gemini 2.0 Flash with Google Search grounding.</p>
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
  lines.push("briefd — personal daily brief");
  lines.push(new Date(digest.generatedAt).toUTCString());
  lines.push("");
  lines.push(digest.intro);
  lines.push("");
  for (const cluster of digest.clusters) {
    lines.push(`## ${cluster.theme.toUpperCase()}`);
    lines.push(cluster.summary);
    lines.push("");
    for (const story of cluster.stories) {
      lines.push(`- ${story.headline}`);
      lines.push(`  ${story.summary}`);
      lines.push(`  Why it matters: ${story.whyItMatters}`);
      lines.push(`  ${story.source}: ${story.url}`);
      lines.push("");
    }
  }
  if (digest.signals.length) {
    lines.push("## WEAK SIGNALS");
    for (const s of digest.signals) lines.push(`- ${s}`);
    lines.push("");
  }
  if (digest.sources && digest.sources.length) {
    lines.push("## SOURCES CONSULTED");
    for (const s of digest.sources) lines.push(`- ${s.title}: ${s.uri}`);
  }
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
