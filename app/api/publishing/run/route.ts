import { NextRequest, NextResponse } from "next/server";
import { publishDuePosts } from "@/lib/publishing/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await publishDuePosts());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Publishing worker failed." }, { status: 500 });
  }
}

