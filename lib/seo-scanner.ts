import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type SeoCheck = { key: string; label: string; passed: boolean; detail: string; weight: number };
export type SeoScan = {
  url: string; score: number; technicalScore: number; contentScore: number;
  performanceScore: number; issuesCount: number; summary: string;
  durationMs: number; scannedAt: string; checks: SeoCheck[];
};

const privateIpv4 = (ip: string) => {
  const p = ip.split(".").map(Number);
  return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
    (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127);
};

function privateAddress(address: string) {
  if (isIP(address) === 4) return privateIpv4(address);
  const value = address.toLowerCase().split("%")[0];
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") ||
    value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") ||
    value.startsWith("::ffff:10.") || value.startsWith("::ffff:127.") || value.startsWith("::ffff:192.168.");
}

async function assertPublicUrl(input: string) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("Only public HTTP/HTTPS URLs can be scanned.");
  if (["localhost", "localhost.localdomain"].includes(url.hostname.toLowerCase()) || url.hostname.endsWith(".local")) throw new Error("Private network URLs cannot be scanned.");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error("Private network URLs cannot be scanned.");
  return url;
}

async function safeFetch(input: string, init: RequestInit = {}, redirects = 0): Promise<Response> {
  const url = await assertPublicUrl(input);
  const response = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(12_000), headers: { "user-agent": "MarketingMindAI-SEO-Audit/1.0", ...init.headers } });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= 3) throw new Error("Too many redirects.");
    const location = response.headers.get("location");
    if (!location) throw new Error("Invalid redirect response.");
    return safeFetch(new URL(location, url).toString(), init, redirects + 1);
  }
  return response;
}

const match = (html: string, pattern: RegExp) => pattern.test(html);
const content = (html: string, pattern: RegExp) => html.match(pattern)?.[1]?.replace(/\s+/g, " ").trim() ?? "";

export async function scanWebsite(input: string): Promise<SeoScan> {
  const started = Date.now();
  const requested = await assertPublicUrl(input);
  const response = await safeFetch(requested.toString(), { headers: { accept: "text/html,application/xhtml+xml" } });
  if (!response.ok) throw new Error(`Website returned HTTP ${response.status}.`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) throw new Error("The URL did not return an HTML page.");
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > 2_000_000) throw new Error("The HTML page is too large to scan.");
  const html = (await response.text()).slice(0, 2_000_000);
  const durationMs = Date.now() - started;
  const title = content(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = content(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) || content(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const canonical = match(html, /<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=/i) || match(html, /<link[^>]+href=[^>]+rel=["'][^"']*canonical/i);
  const viewport = match(html, /<meta[^>]+name=["']viewport["']/i);
  const lang = match(html, /<html[^>]+lang=["'][^"']+["']/i);
  const robotsMetaBlocked = match(html, /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i);
  const origin = requested.origin;
  const [robots, sitemap] = await Promise.allSettled([
    safeFetch(`${origin}/robots.txt`, { method: "HEAD" }),
    safeFetch(`${origin}/sitemap.xml`, { method: "HEAD" }),
  ]);
  const robotsOk = robots.status === "fulfilled" && robots.value.ok;
  const sitemapOk = sitemap.status === "fulfilled" && sitemap.value.ok;
  const checks: SeoCheck[] = [
    { key: "https", label: "HTTPS", passed: requested.protocol === "https:", detail: requested.protocol === "https:" ? "Secure connection" : "Switch the site to HTTPS", weight: 12 },
    { key: "status", label: "Page status", passed: response.status === 200, detail: `HTTP ${response.status}`, weight: 10 },
    { key: "title", label: "Page title", passed: title.length >= 10 && title.length <= 60, detail: title ? `${title.length} characters` : "Missing title", weight: 14 },
    { key: "description", label: "Meta description", passed: description.length >= 50 && description.length <= 160, detail: description ? `${description.length} characters` : "Missing description", weight: 14 },
    { key: "h1", label: "Single H1", passed: h1Count === 1, detail: `${h1Count} H1 heading(s)`, weight: 10 },
    { key: "canonical", label: "Canonical URL", passed: canonical, detail: canonical ? "Canonical tag found" : "Missing canonical tag", weight: 8 },
    { key: "viewport", label: "Mobile viewport", passed: viewport, detail: viewport ? "Viewport configured" : "Missing viewport tag", weight: 8 },
    { key: "lang", label: "Language attribute", passed: lang, detail: lang ? "Page language declared" : "Missing html lang attribute", weight: 6 },
    { key: "indexable", label: "Indexable", passed: !robotsMetaBlocked, detail: robotsMetaBlocked ? "Page contains noindex" : "No noindex directive found", weight: 6 },
    { key: "robots", label: "Robots.txt", passed: robotsOk, detail: robotsOk ? "robots.txt found" : "robots.txt not found", weight: 5 },
    { key: "sitemap", label: "XML sitemap", passed: sitemapOk, detail: sitemapOk ? "sitemap.xml found" : "sitemap.xml not found", weight: 4 },
    { key: "speed", label: "Response time", passed: durationMs < 1500, detail: `${durationMs} ms`, weight: 3 },
  ];
  const score = Math.round(checks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0));
  const technicalKeys = new Set(["https", "status", "canonical", "viewport", "lang", "indexable", "robots", "sitemap"]);
  const contentKeys = new Set(["title", "description", "h1"]);
  const groupScore = (keys: Set<string>) => { const group = checks.filter(c => keys.has(c.key)); return Math.round(group.reduce((s,c)=>s+(c.passed?c.weight:0),0) / group.reduce((s,c)=>s+c.weight,0) * 100); };
  const failed = checks.filter(check => !check.passed);
  return { url: response.url || requested.toString(), score, technicalScore: groupScore(technicalKeys), contentScore: groupScore(contentKeys), performanceScore: durationMs < 750 ? 100 : durationMs < 1500 ? 75 : durationMs < 3000 ? 50 : 25, issuesCount: failed.length, summary: failed.length ? `${failed.length} issue(s): ${failed.slice(0, 4).map(c => c.label).join(", ")}.` : "All automated checks passed.", durationMs, scannedAt: new Date().toISOString(), checks };
}

