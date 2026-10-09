import { NextRequest, NextResponse } from "next/server";

// Password-protects the dashboard and every API route with HTTP Basic auth,
// so a public deployment can't be used to save interests or trigger (paid)
// digests. Set BRIEFD_PASSWORD to turn it on; any username works.
//
// The one exception is GET /api/generate, which Vercel Cron calls with its own
// `Authorization: Bearer <CRON_SECRET>` header — that route checks it itself.
export function middleware(req: NextRequest) {
  const password = process.env.BRIEFD_PASSWORD;
  if (!password) return NextResponse.next();

  if (req.method === "GET" && req.nextUrl.pathname === "/api/generate") {
    return NextResponse.next();
  }

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const supplied = decoded.slice(decoded.indexOf(":") + 1);
      if (supplied === password) return NextResponse.next();
    } catch {
      // malformed header — fall through to the challenge
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="briefd"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
