import "server-only";

export type WordPressCredentials = { username: string; applicationPassword: string };

export function normalizeWordPressUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== "https:") throw new Error("WordPress site must use HTTPS.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || /^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname)) throw new Error("Private network addresses are not allowed.");
  return url.origin;
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

