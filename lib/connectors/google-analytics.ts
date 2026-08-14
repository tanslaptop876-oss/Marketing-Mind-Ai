import "server-only";
import {
  createOAuthState,
  decryptTokens,
  encryptTokens,
  type GoogleTokens,
  verifyOAuthState,
} from "./google-search-console";

export { createOAuthState, decryptTokens, encryptTokens, verifyOAuthState };
export type Ga4Property = { property: string; displayName: string; account: string };
export type Ga4Metrics = { activeUsers: number; sessions: number; screenPageViews: number };

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
export const ga4RedirectUri = () => `${appUrl()}/api/connectors/ga4/callback`;
export const ga4Configured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.CONNECTOR_ENCRYPTION_KEY);

export function ga4AuthorizationUrl(state: string) {
  const query = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: ga4RedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
}

export async function exchangeGa4Code(code: string): Promise<GoogleTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: ga4RedirectUri(), grant_type: "authorization_code" }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || "Google Analytics authorization failed.");
  return { ...data, expires_at: Date.now() + data.expires_in * 1000 };
}

export async function validGa4AccessToken(tokens: GoogleTokens) {
  if (tokens.expires_at > Date.now() + 60_000) return tokens;
  if (!tokens.refresh_token) throw new Error("Google Analytics connection expired. Reconnect GA4.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, refresh_token: tokens.refresh_token, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error("Could not refresh Google Analytics access.");
  return { ...tokens, access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 };
}

async function google<T>(url: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", ...init?.headers }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Google Analytics request failed.");
  return data as T;
}

export async function listGa4Properties(accessToken: string) {
  const data = await google<{ accountSummaries?: { account: string; propertySummaries?: { property: string; displayName: string }[] }[] }>("https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200", accessToken);
  return (data.accountSummaries ?? []).flatMap(account => (account.propertySummaries ?? []).map(property => ({ ...property, account: account.account } satisfies Ga4Property)));
}

export async function ga4Overview(accessToken: string, property: string): Promise<Ga4Metrics> {
  const propertyId = property.replace(/^properties\//, "");
  const data = await google<{ rows?: { metricValues?: { value?: string }[] }[] }>(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`, accessToken, {
    method: "POST",
    body: JSON.stringify({ dateRanges: [{ startDate: "28daysAgo", endDate: "today" }], metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }] }),
  });
  const values = data.rows?.[0]?.metricValues ?? [];
  return { activeUsers: Number(values[0]?.value ?? 0), sessions: Number(values[1]?.value ?? 0), screenPageViews: Number(values[2]?.value ?? 0) };
}

