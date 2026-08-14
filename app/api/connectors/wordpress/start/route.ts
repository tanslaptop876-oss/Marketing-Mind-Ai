import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWordPressState, normalizeWordPressComUrl, wordpressComAuthorizationUrl, wordpressComConfigured } from "@/lib/connectors/wordpress";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (!wordpressComConfigured()) return NextResponse.redirect(new URL("/connectors?error=WordPress.com%20OAuth%20is%20not%20configured", request.url));
  try {
    const siteUrl = normalizeWordPressComUrl(request.nextUrl.searchParams.get("site_url") || "");
    return NextResponse.redirect(wordpressComAuthorizationUrl(createWordPressState(user.id, siteUrl), siteUrl));
  } catch (error) {
    return NextResponse.redirect(new URL(`/connectors?error=${encodeURIComponent(error instanceof Error ? error.message : "Invalid WordPress.com site")}`, request.url));
  }
}

