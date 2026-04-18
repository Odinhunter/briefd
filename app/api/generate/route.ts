import { NextResponse } from "next/server";
import { getInterests } from "@/lib/kv";
import { generateDigest } from "@/lib/research";
import { sendDigestEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Perplexity + email can take a while. Give it room.
export const maxDuration = 120;

export async function POST() {
  try {
    const interests = await getInterests();
    if (!interests.description && interests.keywords.length === 0) {
      return NextResponse.json(
        {
          error:
            "No interests saved yet. Add a description or some keywords first.",
        },
        { status: 400 }
      );
    }

    const digest = await generateDigest(interests);

    if (!digest.clusters.length) {
      return NextResponse.json(
        {
          error:
            "Gemini returned an empty digest. Try broadening your interests and retry.",
        },
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
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
