import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptTokens } from "@/lib/connectors/google-search-console";
import { exchangeWordPressCode, verifyWordPressState } from "@/lib/connectors/wordpress";

export const runtime = "nodejs";
const go = (request: NextRequest, path: string) => NextResponse.redirect(new URL(path, request.url));

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) return go(request, `/connectors?error=${encodeURIComponent(oauthError)}`);
  if (!code || !state) return go(request, "/connectors?error=Invalid%20WordPress.com%20callback");
  try {
    const expected = verifyWordPressState(state);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== expected.userId) throw new Error("Your login session changed. Please reconnect.");
    const tokens = await exchangeWordPressCode(code);
    const expectedHost = new URL(expected.siteUrl).hostname.toLowerCase();
    if (!tokens.blog_id || !tokens.blog_url) throw new Error("WordPress.com did not return an authorized site.");
    let authorizedHost = "";
    try { authorizedHost = new URL(tokens.blog_url).hostname.toLowerCase(); } catch { throw new Error("WordPress.com returned an invalid site URL."); }
    if (authorizedHost !== expectedHost) throw new Error("WordPress.com authorized a different site. Please reconnect the requested site.");
    await supabase.from("connector_accounts").delete().eq("provider", "wordpress");
    const { error } = await supabase.from("connector_accounts").insert({ owner_id: user.id, provider: "wordpress", external_account_id: String(tokens.blog_id), display_name: authorizedHost, status: "active", encrypted_credentials: encryptTokens({ mode: "wordpress.com", siteUrl: tokens.blog_url, ...tokens }) });
    if (error) throw error;
    return go(request, "/connectors?message=WordPress.com%20connected");
  } catch (error) {
    return go(request, `/connectors?error=${encodeURIComponent(error instanceof Error ? error.message : "WordPress.com connection failed")}`);
  }
}

