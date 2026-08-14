import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type WordPressCredentials = { username: string; applicationPassword: string };
export type WordPressComTokens = { access_token: string; blog_id?: string; blog_url?: string; token_type?: string };
export type StoredWordPressCredentials = WordPressComTokens & { mode?: "wordpress.com"; siteUrl?: string; username?: string; applicationPassword?: string };

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
const stateSecret = () => {
  const value = process.env.CONNECTOR_ENCRYPTION_KEY;
  if (!value) throw new Error("CONNECTOR_ENCRYPTION_KEY is not configured.");
  return Buffer.from(value, "base64");
};

export const wordpressComConfigured = () => Boolean(process.env.WORDPRESS_COM_CLIENT_ID && process.env.WORDPRESS_COM_CLIENT_SECRET && process.env.CONNECTOR_ENCRYPTION_KEY);
export const wordpressComRedirectUri = () => `${appUrl()}/api/connectors/wordpress/callback`;

export function createWordPressState(userId: string, siteUrl: string) {
  const payload = Buffer.from(JSON.stringify({ userId, siteUrl, nonce: randomBytes(16).toString("hex"), expires: Date.now() + 10 * 60_000 })).toString("base64url");
  const signature = createHmac("sha256", stateSecret()).update(`wordpress:${payload}`).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyWordPressState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new Error("Invalid WordPress OAuth state.");
  const expected = createHmac("sha256", stateSecret()).update(`wordpress:${payload}`).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw new Error("Invalid WordPress OAuth state.");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { userId: string; siteUrl: string; expires: number };
  if (data.expires < Date.now()) throw new Error("WordPress authorization expired. Please try again.");
  return data;
}

export function wordpressComAuthorizationUrl(state: string, siteUrl: string) {
  const query = new URLSearchParams({ client_id: process.env.WORDPRESS_COM_CLIENT_ID!, redirect_uri: wordpressComRedirectUri(), response_type: "code", state, blog: siteUrl });
  return `https://public-api.wordpress.com/oauth2/authorize?${query}`;
}

export async function exchangeWordPressCode(code: string): Promise<WordPressComTokens> {
  const response = await fetch("https://public-api.wordpress.com/oauth2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.WORDPRESS_COM_CLIENT_ID!, client_secret: process.env.WORDPRESS_COM_CLIENT_SECRET!, redirect_uri: wordpressComRedirectUri(), grant_type: "authorization_code", code }), cache: "no-store" });
  const data = await response.json() as WordPressComTokens & { error?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || "WordPress.com authorization failed.");
  return data;
}

export async function listWordPressComSites(accessToken: string) {
  const response = await fetch("https://public-api.wordpress.com/rest/v1.1/me/sites", { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const data = await response.json() as { sites?: Array<{ ID: number; name: string; URL: string }>; message?: string };
  if (!response.ok) throw new Error(data.message || "Could not load WordPress.com sites.");
  return data.sites ?? [];
}

export function normalizeWordPressUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== "https:") throw new Error("WordPress site must use HTTPS.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || /^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname)) throw new Error("Private network addresses are not allowed.");
  return url.origin;
}

export function normalizeWordPressComUrl(value: string) {
  const origin = normalizeWordPressUrl(value);
  const hostname = new URL(origin).hostname.toLowerCase();
  if (hostname !== "wordpress.com" && !hostname.endsWith(".wordpress.com")) throw new Error("Enter a WordPress.com site URL. Use the self-hosted option for other domains.");
  return origin;
}

export async function validateWordPressConnection(siteUrl: string, credentials: WordPressCredentials) {
  const response = await fetch(`${siteUrl}/wp-json/wp/v2/users/me?context=edit`, {
    headers: { authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.applicationPassword}`).toString("base64")}` },
    cache: "no-store",
    redirect: "error",
  });
  const data = await response.json().catch(() => ({})) as { id?: number; name?: string; message?: string };
  if (!response.ok || !data.id) throw new Error(data.message || "WordPress credentials could not be verified.");
  return { userId: String(data.id), displayName: data.name || credentials.username };
}

function wordpressApi(siteIdOrUrl: string, credentials: StoredWordPressCredentials) {
  const isWordPressCom = credentials.mode === "wordpress.com" || Boolean(credentials.access_token && credentials.blog_id);
  const baseUrl = isWordPressCom
    ? `https://public-api.wordpress.com/wp/v2/sites/${encodeURIComponent(credentials.blog_id || siteIdOrUrl)}`
    : `${normalizeWordPressUrl(siteIdOrUrl)}/wp-json/wp/v2`;
  const authorization = isWordPressCom
    ? `Bearer ${credentials.access_token}`
    : `Basic ${Buffer.from(`${credentials.username}:${credentials.applicationPassword}`).toString("base64")}`;
  return { baseUrl, authorization };
}

export async function uploadWordPressMedia(siteIdOrUrl: string, credentials: StoredWordPressCredentials, bytes: ArrayBuffer, mimeType: string, filename: string) {
  const { baseUrl, authorization } = wordpressApi(siteIdOrUrl, credentials);
  const safeFilename = filename.replace(/[^a-z0-9._-]/gi, "-").slice(-120) || "campaign-image.jpg";
  const response = await fetch(`${baseUrl}/media`, { method: "POST", headers: { authorization, "content-type": mimeType, "content-disposition": `attachment; filename="${safeFilename}"` }, body: bytes, cache: "no-store" });
  const data = await response.json().catch(() => ({})) as { id?: number; message?: string; code?: string };
  if (!response.ok || !data.id) throw new Error(data.message || data.code || "WordPress media upload failed.");
  return data.id;
}

export async function publishWordPressPost(siteIdOrUrl: string, credentials: StoredWordPressCredentials, content: string, status: "draft" | "publish", featuredMedia?: number) {
  const title = content.split(/\r?\n/).find(line => line.trim())?.trim().slice(0, 120) || "MarketingMind AI post";
  const { baseUrl, authorization } = wordpressApi(siteIdOrUrl, credentials);
  const response = await fetch(`${baseUrl}/posts`, { method: "POST", headers: { authorization, "content-type": "application/json" }, body: JSON.stringify({ title, content, status, ...(featuredMedia ? { featured_media: featuredMedia } : {}) }), cache: "no-store" });
  const data = await response.json().catch(() => ({})) as { id?: number; message?: string; code?: string };
  if (!response.ok || !data.id) throw new Error(data.message || data.code || "WordPress publishing failed.");
  return String(data.id);
}

