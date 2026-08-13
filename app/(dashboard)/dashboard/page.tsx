import { createClient } from "@/lib/supabase/server";
export default async function Dashboard() {
  const s = await createClient();
  const [websites, audits, contacts, leads] = await Promise.all([
    s.from("websites").select("id",{count:"exact",head:true}), s.from("audit_runs").select("id",{count:"exact",head:true}),
    s.from("contacts").select("id",{count:"exact",head:true}), s.from("leads").select("id",{count:"exact",head:true}).eq("status","won"),
  ]);
  return <><h1>Good to see you</h1><p className="muted">A live view of your marketing operations.</p>
    <div className="grid section">
      <div className="card"><span className="muted">Websites</span><div className="metric">{websites.count ?? 0}</div></div>
      <div className="card"><span className="muted">SEO audits</span><div className="metric">{audits.count ?? 0}</div></div>
      <div className="card"><span className="muted">CRM contacts</span><div className="metric">{contacts.count ?? 0}</div></div>
      <div className="card"><span className="muted">Won leads</span><div className="metric">{leads.count ?? 0}</div></div>
    </div>
    <div className="grid two section"><div className="card"><h2>Start here</h2><p className="muted">Add a website, record its first SEO audit, then compare progress over time.</p></div><div className="card"><h2>Coming next</h2><p className="muted">Scheduling workers and OAuth connectors plug into the prepared connector layer.</p></div></div>
  </>;
}
