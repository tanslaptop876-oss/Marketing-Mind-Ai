import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOAuthState, ga4AuthorizationUrl, ga4Configured } from "@/lib/connectors/google-analytics";

export const runtime = "nodejs";
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  if (!ga4Configured()) return NextResponse.redirect(new URL("/connectors?error=Google%20OAuth%20is%20not%20configured", process.env.NEXT_PUBLIC_APP_URL));
  return NextResponse.redirect(ga4AuthorizationUrl(createOAuthState(user.id)));
}

