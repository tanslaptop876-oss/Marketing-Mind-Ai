import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptTokens } from "@/lib/connectors/google-search-console";
import { exchangeWordPressCode, listWordPressComSites, verifyWordPressState } from "@/lib/connectors/wordpress";

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
    const sites = await listWordPressComSites(tokens.access_token);
    const expectedHost = new URL(expected.siteUrl).hostname.toLowerCase();
    const site = sites.find(item => {
      try { return new URL(item.URL).hostname.toLowerCase() === expectedHost; } catch { return false; }
    });
    if (!site) throw new Error("The authorized account does not manage this WordPress.com site.");
    await supabase.from("connector_accounts").delete().eq("provider", "wordpress");
    const { error } = await supabase.from("connector_accounts").insert({ owner_id: user.id, provider: "wordpress", external_account_id: String(site.ID), display_name: site.name || site.URL, status: "active", encrypted_credentials: encryptTokens({ mode: "wordpress.com", siteUrl: site.URL, ...tokens }) });
    if (error) throw error;
    return go(request, "/connectors?message=WordPress.com%20connected");
  } catch (error) {
    return go(request, `/connectors?error=${encodeURIComponent(error instanceof Error ? error.message : "WordPress.com connection failed")}`);
  }
}

