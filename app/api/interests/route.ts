import { NextResponse } from "next/server";
import { getInterests, saveInterests } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const interests = await getInterests();
    return NextResponse.json(interests);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const description =
      typeof body?.description === "string" ? body.description : "";
    const keywords = Array.isArray(body?.keywords)
      ? body.keywords.filter((k: unknown): k is string => typeof k === "string")
      : [];

    const saved = await saveInterests({ description, keywords });
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
