import { NextResponse } from "next/server";import { createClient } from "@/lib/supabase/server";import { authorizationUrl,createOAuthState,gscConfigured } from "@/lib/connectors/google-search-console";
export const runtime="nodejs";
export async function GET(){const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.redirect(new URL("/login",process.env.NEXT_PUBLIC_APP_URL));if(!gscConfigured())return NextResponse.redirect(new URL("/connectors?error=Google%20OAuth%20is%20not%20configured",process.env.NEXT_PUBLIC_APP_URL));return NextResponse.redirect(authorizationUrl(createOAuthState(user.id)))}

