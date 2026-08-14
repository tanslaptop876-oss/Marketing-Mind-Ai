import { connectorCatalog, type ConnectorStage } from "@/lib/connectors/registry";
import { createClient } from "@/lib/supabase/server";
import { decryptTokens, encryptTokens, gscConfigured, searchAnalytics, validAccessToken, type SearchRow } from "@/lib/connectors/google-search-console";
import { metaConfigured } from "@/lib/connectors/meta";
import { connectWordPress, disconnectGsc, disconnectMeta, disconnectWordPress } from "./actions";

type Account = { id: string; external_account_id: string; display_name: string; encrypted_credentials: unknown };
const total = (rows: SearchRow[]) => rows.reduce((acc, row) => ({ clicks: acc.clicks + row.clicks, impressions: acc.impressions + row.impressions }), { clicks: 0, impressions: 0 });
const stageLabel: Record<ConnectorStage, string> = { live: "Live", "oauth-next": "OAuth next", "api-next": "API setup next", planned: "Planned" };

export default async function Connectors({ searchParams }: { searchParams: Promise<{ message?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: gscData = [] }, { data: metaData = [] }, { data: wordpressData = [] }] = await Promise.all([
    supabase.from("connector_accounts").select("id,external_account_id,display_name,encrypted_credentials").eq("provider", "gsc").order("created_at"),
    supabase.from("connector_accounts").select("id,external_account_id,display_name,encrypted_credentials").eq("provider", "meta").order("created_at"),
    supabase.from("connector_accounts").select("id,external_account_id,display_name,encrypted_credentials").eq("provider", "wordpress").order("created_at"),
  ]);
  const accounts = (gscData ?? []) as Account[];
  const metaAccounts = (metaData ?? []) as Account[];
  const wordpressAccounts = (wordpressData ?? []) as Account[];
  let queries: SearchRow[] = [], pages: SearchRow[] = [], apiError = "";
  if (accounts[0]) try {
    const old = decryptTokens(accounts[0].encrypted_credentials);
    const tokens = await validAccessToken(old);
    if (tokens.access_token !== old.access_token) await supabase.from("connector_accounts").update({ encrypted_credentials: encryptTokens(tokens) }).eq("provider", "gsc");
    [queries, pages] = await Promise.all([
      searchAnalytics(tokens.access_token, accounts[0].external_account_id, ["query"]),
      searchAnalytics(tokens.access_token, accounts[0].external_account_id, ["page"]),
    ]);
  } catch (error) { apiError = error instanceof Error ? error.message : "Could not load Search Console data."; }
  const metrics = total(queries), impressions = metrics.impressions, clicks = metrics.clicks;

  return <>
    <h1>Connectors</h1><p className="muted">Connect marketing platforms, keep credentials encrypted, and track integration readiness.</p>
    {params.message ? <p className="notice">{params.message}</p> : null}{params.error || apiError ? <p className="alert">{params.error || apiError}</p> : null}
    <div className="grid two section">
      <div className="card"><h2>Meta (Facebook & Instagram)</h2>{!metaConfigured() ? <><p>Meta App credentials are required before connecting.</p><span className="badge bad">Setup required</span></> : !metaAccounts.length ? <><p>Import Facebook Pages you manage and enable campaign publishing.</p><a className="btn" href="/api/connectors/meta/start">Connect Meta account</a></> : <><div className="topbar"><div><span className="badge good">Connected</span><p className="muted small">{metaAccounts.length} Facebook Page{metaAccounts.length === 1 ? "" : "s"}</p></div><form action={disconnectMeta}><button className="btn secondary">Disconnect</button></form></div><label>Publishing Page<select disabled>{metaAccounts.map(page => <option key={page.id}>{page.display_name}</option>)}</select></label></>}</div>
      <div className="card"><h2>Google Search Console</h2>{!gscConfigured() ? <><p>OAuth credentials are required before connecting.</p><span className="badge bad">Setup required</span></> : !accounts.length ? <><p>Import verified properties and 28-day organic search performance.</p><a className="btn" href="/api/connectors/gsc/start">Connect Google account</a></> : <><div className="topbar"><div><span className="badge good">Connected</span><p className="muted small">{accounts.length} Search Console propert{accounts.length === 1 ? "y" : "ies"}</p></div><form action={disconnectGsc}><button className="btn secondary">Disconnect</button></form></div><label>Reporting property<select disabled><option>{accounts[0].display_name}</option></select></label></>}</div>
    </div>
    {accounts.length ? <div className="card section"><h2>Search Console performance (28 days)</h2><div className="grid"><div><span className="muted">Clicks</span><div className="metric">{Math.round(clicks)}</div></div><div><span className="muted">Impressions</span><div className="metric">{Math.round(impressions)}</div></div><div><span className="muted">CTR</span><div className="metric">{impressions ? `${(clicks / impressions * 100).toFixed(1)}%` : "N/A"}</div></div><div><span className="muted">Avg position</span><div className="metric">{queries.length ? (queries.reduce((sum, row) => sum + row.position, 0) / queries.length).toFixed(1) : "N/A"}</div></div></div><div className="grid two section"><ResultTable title="Top queries" rows={queries} /><ResultTable title="Top pages" rows={pages} /></div></div> : null}
    <div className="card section"><h2>WordPress</h2>{wordpressAccounts.length ? <div className="topbar"><div><span className="badge good">Connected</span><p className="muted small">{wordpressAccounts[0].display_name}</p></div><form action={disconnectWordPress}><button className="btn secondary">Disconnect</button></form></div> : <><p className="muted">Connect a WordPress site using a revocable Application Password. Credentials are encrypted before storage.</p><form action={connectWordPress} className="form"><label>Site URL<input name="site_url" type="url" required placeholder="https://example.wordpress.com" /></label><div className="form-row"><label>WordPress username<input name="username" required autoComplete="username" /></label><label>Application password<input name="application_password" type="password" required autoComplete="off" /></label></div><button className="btn">Verify and connect WordPress</button></form></>}</div>
    <h2 className="section">Integration roadmap</h2><div className="grid section">{Object.entries(connectorCatalog).filter(([key]) => !["gsc", "meta", "wordpress"].includes(key)).map(([key, connector]) => <div className="card" key={key}>
      <div className="topbar"><span className="badge">{connector.category}</span><span className={`badge ${connector.stage === "live" ? "good" : ""}`}>{stageLabel[connector.stage]}</span></div>
      <h2>{connector.name}</h2><p>{connector.capabilities.map(capability => <span className="badge" key={capability} style={{ marginRight: 5 }}>{capability}</span>)}</p><p className="muted small">Required: {connector.setup}</p>
    </div>)}</div>
  </>;
}

function ResultTable({ title, rows }: { title: string; rows: SearchRow[] }) {
  return <div><h2>{title}</h2>{!rows.length ? <div className="empty">No search data for this period.</div> : <table><thead><tr><th>{title.includes("queries") ? "Query" : "Page"}</th><th>Clicks</th><th>Impressions</th></tr></thead><tbody>{rows.slice(0, 10).map((row, index) => <tr key={`${row.keys[0]}-${index}`}><td className="truncate" title={row.keys[0]}>{row.keys[0]}</td><td>{Math.round(row.clicks)}</td><td>{Math.round(row.impressions)}</td></tr>)}</tbody></table>}</div>;
}

