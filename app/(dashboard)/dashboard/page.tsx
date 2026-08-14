import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type LeadSummary = { status: string; value: number | string };
type PostSummary = { status: string };

export default async function Dashboard() {
  const supabase = await createClient();
  const [websites, contacts, personas, finance, audit, leads, posts, connectors] = await Promise.all([
    supabase.from("websites").select("id", { count: "exact", head: true }),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("buyer_personas").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("finance_scenarios").select("id", { count: "exact", head: true }),
    supabase.from("audit_runs").select("score,issues_count,created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("leads").select("status,value"),
    supabase.from("scheduled_posts").select("status"),
    supabase.from("connector_accounts").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const leadRows = (leads.data ?? []) as LeadSummary[];
  const postRows = (posts.data ?? []) as PostSummary[];
  const pipelineValue = leadRows.filter(lead => !["won", "lost"].includes(lead.status)).reduce((sum, lead) => sum + Number(lead.value), 0);
  const wonValue = leadRows.filter(lead => lead.status === "won").reduce((sum, lead) => sum + Number(lead.value), 0);
  const publishedPosts = postRows.filter(post => post.status === "published").length;
  const queuedPosts = postRows.filter(post => ["scheduled", "publishing"].includes(post.status)).length;
  const latestAudit = audit.data;

  return <>
    <h1>Marketing command center</h1>
    <p className="muted">A live view of growth, content, customers, and profitability.</p>
    <div className="grid section">
      <div className="card"><span className="muted">Websites</span><div className="metric">{websites.count ?? 0}</div><Link className="small" href="/websites">Manage websites â†’</Link></div>
      <div className="card"><span className="muted">Latest SEO score</span><div className="metric">{latestAudit?.score ?? "â€”"}</div><span className="small muted">{latestAudit ? `${latestAudit.issues_count} issues found` : "No audit yet"}</span></div>
      <div className="card"><span className="muted">CRM contacts</span><div className="metric">{contacts.count ?? 0}</div><Link className="small" href="/crm">Open CRM â†’</Link></div>
      <div className="card"><span className="muted">Open pipeline value</span><div className="metric">{pipelineValue.toLocaleString()}</div><span className="small muted">Won: {wonValue.toLocaleString()}</span></div>
      <div className="card"><span className="muted">Active personas</span><div className="metric">{personas.count ?? 0}</div><Link className="small" href="/personas">Target audiences â†’</Link></div>
      <div className="card"><span className="muted">Published posts</span><div className="metric">{publishedPosts}</div><span className="small muted">{queuedPosts} currently queued</span></div>
      <div className="card"><span className="muted">Saved finance scenarios</span><div className="metric">{finance.count ?? 0}</div><Link className="small" href="/finance">Compare profitability â†’</Link></div>
      <div className="card"><span className="muted">Active connectors</span><div className="metric">{connectors.count ?? 0}</div><Link className="small" href="/connectors">Manage connectors â†’</Link></div>
    </div>
    <div className="grid two section">
      <div className="card"><h2>Next best actions</h2><div className="checks">
        <div className="check"><span className={`badge ${latestAudit ? "good" : ""}`}>SEO</span><span>{latestAudit ? "Review the latest audit issues and rerun after fixes." : "Add a website and run the first automated SEO audit."}</span></div>
        <div className="check"><span className={`badge ${(personas.count ?? 0) > 0 ? "good" : ""}`}>Target</span><span>{(personas.count ?? 0) > 0 ? "Use an active persona when drafting the next campaign." : "Create a buyer persona before launching the next campaign."}</span></div>
        <div className="check"><span className={`badge ${(finance.count ?? 0) > 0 ? "good" : ""}`}>Profit</span><span>{(finance.count ?? 0) > 0 ? "Compare your saved pricing scenarios before increasing spend." : "Save a base finance scenario to establish break-even."}</span></div>
      </div></div>
      <div className="card"><h2>Publishing readiness</h2><div className="checks">
        <div className="check"><span className="badge good">{connectors.count ?? 0}</span><span>Active connector accounts</span></div>
        <div className="check"><span className="badge good">{publishedPosts}</span><span>Successfully published posts</span></div>
        <div className="check"><span className={queuedPosts ? "badge" : "badge good"}>{queuedPosts}</span><span>Posts waiting in the publishing queue</span></div>
      </div><Link className="btn secondary section" href="/campaigns">Open campaign workspace</Link></div>
    </div>
  </>;
}

