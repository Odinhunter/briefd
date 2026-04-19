import { NextRequest, NextResponse } from "next/server";
import { getInterests } from "@/lib/kv";
import { generateDigest } from "@/lib/research";
import { sendDigestEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function runDigest() {
  const interests = await getInterests();
  if (!interests.description && interests.keywords.length === 0) {
    return NextResponse.json(
      { error: "No interests saved yet." },
      { status: 400 }
    );
  }

  const digest = await generateDigest(interests);

  if (!digest.clusters.length) {
    return NextResponse.json(
      { error: "Gemini returned an empty digest." },
      { status: 502 }
    );
  }

  await sendDigestEmail(digest);

  return NextResponse.json({
    ok: true,
    sentTo: process.env.GMAIL_USER,
    clusters: digest.clusters.length,
    stories: digest.clusters.reduce((n, c) => n + c.stories.length, 0),
    generatedAt: digest.generatedAt,
  });
}

// Called by Vercel Cron — authenticated via CRON_SECRET
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return await runDigest();
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    return await runDigest();
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
