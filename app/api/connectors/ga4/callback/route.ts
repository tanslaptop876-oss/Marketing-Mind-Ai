import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptTokens, exchangeGa4Code, listGa4Properties, verifyOAuthState } from "@/lib/connectors/google-analytics";

export const runtime = "nodejs";
const go = (request: NextRequest, path: string) => NextResponse.redirect(new URL(path, request.url));
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code"), state = request.nextUrl.searchParams.get("state"), oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) return go(request, `/connectors?error=${encodeURIComponent(oauthError)}`);
  if (!code || !state) return go(request, "/connectors?error=Invalid%20Google%20Analytics%20callback");
  try {
    const expected = verifyOAuthState(state);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== expected.userId) throw new Error("Your login session changed. Please reconnect.");
    const tokens = await exchangeGa4Code(code);
    const properties = await listGa4Properties(tokens.access_token);
    if (!properties.length) throw new Error("No GA4 properties are available for this Google account.");
    await supabase.from("connector_accounts").delete().eq("owner_id", user.id).eq("provider", "ga4");
    const { error } = await supabase.from("connector_accounts").insert(properties.map(property => ({ owner_id: user.id, provider: "ga4", external_account_id: property.property, display_name: property.displayName, status: "active", encrypted_credentials: encryptTokens(tokens) })));
    if (error) throw error;
    return go(request, "/connectors?message=Google%20Analytics%204%20connected");
  } catch (error) {
    return go(request, `/connectors?error=${encodeURIComponent(error instanceof Error ? error.message : "Google Analytics connection failed")}`);
  }
}

