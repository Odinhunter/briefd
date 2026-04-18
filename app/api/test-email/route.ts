import { NextResponse } from "next/server";
import { sendTestEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler() {
  try {
    await sendTestEmail();
    return NextResponse.json({ ok: true, sentTo: process.env.GMAIL_USER });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// Accept both GET (easy browser test) and POST.
export const GET = handler;
export const POST = handler;
