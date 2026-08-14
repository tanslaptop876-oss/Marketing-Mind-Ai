import { createClient } from "@/lib/supabase/server";
import { addAudit, runAutomatedAudit } from "./actions";
import { comparisonScore, type Audit } from "@/lib/audits";
import type { SeoScan } from "@/lib/seo-scanner";

type Website = { id: string; name: string; url: string };
type Run = Audit & {
  technical_score: number | null; content_score: number | null; performance_score: number | null;
  issues_count: number; summary: string | null; details: SeoScan | Record<string, never>;
};

export default async function Audits({ searchParams }: { searchParams: Promise<{ message?: string; error?: string; website?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: websiteData = [] }, { data: raw = [] }] = await Promise.all([
    supabase.from("websites").select("id,name,url").order("name"),
    supabase.from("audit_runs").select("id,website_id,score,technical_score,content_score,performance_score,issues_count,summary,details,created_at,websites(name)").order("created_at", { ascending: false }),
  ]);
  const websites = (websiteData ?? []) as Website[];
  const allAudits = (raw ?? []) as unknown as Run[];
  const selectedWebsiteId = websites.some(website => website.id === params.website) ? params.website! : websites[0]?.id;
  const selectedWebsite = websites.find(website => website.id === selectedWebsiteId);
  const audits = selectedWebsiteId ? allAudits.filter(audit => audit.website_id === selectedWebsiteId) : [];
  const latest = audits[0];

  return <>
    <h1>SEO Audit history</h1>
    <p className="muted">Scan a public website and track improvement at 30/90/180/365-day checkpoints.</p>
    {params.message ? <p className="notice">{params.message}</p> : null}{params.error ? <p className="alert">{params.error}</p> : null}
    {websites.length > 1 ? <form className="card section form-row" method="get" action="/seo-audits">
      <label>Reporting website<select name="website" defaultValue={selectedWebsiteId}>{websites.map(website => <option key={website.id} value={website.id}>{website.name}</option>)}</select></label>
      <button className="btn secondary">View report</button>
    </form> : null}
    <div className="grid section">{[30, 90, 180, 365].map(days => {
      const baseline = comparisonScore(audits, days);
      const delta = baseline === null ? null : (latest?.score ?? 0) - baseline;
      return <div className="card" key={days}><span className="muted">vs {days} days</span><div className="metric">{delta === null ? "N/A" : `${delta >= 0 ? "+" : ""}${delta}`}</div><span className={`badge ${delta !== null && delta >= 0 ? "good" : delta !== null ? "bad" : ""}`}>{delta === null ? "No baseline" : delta >= 0 ? "Improved" : "Declined"}</span></div>;
    })}</div>
    <div className="grid two section">
      <div className="card"><h2>Automated scan</h2>{!websites.length ? <p className="alert">Add a website first.</p> : <form action={runAutomatedAudit} className="form">
        <label>Website<select name="website_id" defaultValue={selectedWebsiteId}>{websites.map(website => <option key={website.id} value={website.id}>{website.name} - {website.url}</option>)}</select></label>
        <p className="muted small">Checks on-page SEO, crawl files, HTTPS and response time. The scan can take up to 15 seconds.</p><button className="btn">Run SEO scan</button>
      </form>}</div>
      <div className="card"><h2>Latest result{selectedWebsite ? ` - ${selectedWebsite.name}` : ""}</h2>{!latest ? <div className="empty">No audit runs for this website.</div> : <>
        <div className="grid two"><div><span className="muted">Overall</span><div className="metric">{latest.score}/100</div></div><div><span className="muted">Issues</span><div className="metric">{latest.issues_count}</div></div></div>
        <div className="grid section"><div><span className="muted small">Technical</span><div><strong>{latest.technical_score ?? "N/A"}</strong></div></div><div><span className="muted small">Content</span><div><strong>{latest.content_score ?? "N/A"}</strong></div></div><div><span className="muted small">Performance</span><div><strong>{latest.performance_score ?? "N/A"}</strong></div></div></div>
        <p>{latest.summary}</p>{"checks" in (latest.details ?? {}) ? <div className="checks">{(latest.details as SeoScan).checks.map(check => <div className="check" key={check.key}><span className={`badge ${check.passed ? "good" : "bad"}`}>{check.passed ? "Pass" : "Fix"}</span><span><strong>{check.label}</strong><br /><span className="muted small">{check.detail}</span></span></div>)}</div> : null}
      </>}</div>
    </div>
    <div className="grid two section">
      <div className="card"><h2>Manual record</h2>{!websites.length ? <p className="alert">Add a website first.</p> : <form action={addAudit} className="form">
        <label>Website<select name="website_id" defaultValue={selectedWebsiteId}>{websites.map(website => <option key={website.id} value={website.id}>{website.name}</option>)}</select></label>
        <div className="form-row"><label>Overall score<input name="score" type="number" min="0" max="100" required /></label><label>Issues<input name="issues_count" type="number" min="0" required /></label></div>
        <div className="form-row"><label>Technical<input name="technical_score" type="number" min="0" max="100" required /></label><label>Content<input name="content_score" type="number" min="0" max="100" required /></label></div>
        <label>Performance<input name="performance_score" type="number" min="0" max="100" required /></label><label>Summary<textarea name="summary" rows={3} /></label><button className="btn secondary">Save manual audit</button>
      </form>}</div>
      <div className="card"><h2>Runs for {selectedWebsite?.name ?? "website"}</h2>{!audits.length ? <div className="empty">No audit runs yet.</div> : <table><thead><tr><th>Score</th><th>Technical</th><th>Content</th><th>Performance</th><th>Issues</th><th>Date</th></tr></thead><tbody>{audits.map(audit => <tr key={audit.id}><td><span className="badge good">{audit.score}/100</span></td><td>{audit.technical_score ?? "N/A"}</td><td>{audit.content_score ?? "N/A"}</td><td>{audit.performance_score ?? "N/A"}</td><td>{audit.issues_count}</td><td>{new Date(audit.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>}</div>
    </div>
  </>;
}

