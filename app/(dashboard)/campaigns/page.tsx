Exit code: 0
Wall time: 1.1 seconds
Output:
import { createClient } from "@/lib/supabase/server";
import { connectorCatalog } from "@/lib/connectors/registry";
import { createScheduledPost, deleteScheduledPost } from "./actions";

const platforms = ["meta", "google_business_profile", "wordpress", "youtube", "linkedin", "x"] as const;

export default async function Campaigns() {
  const supabase = await createClient();
  const { data: posts = [] } = await supabase.from("scheduled_posts")
    .select("id,platform,content,scheduled_for,status,connector_account_id,created_at")
    .order("created_at", { ascending: false });
  const { data: accounts = [] } = await supabase.from("connector_accounts")
    .select("provider").eq("status", "active");
  const connected = new Set((accounts ?? []).map(account => account.provider));

  return <><h1>Publishing & scheduling</h1><p className="muted">Draft and schedule content now. Connected channels can be picked up by the publishing worker.</p>
    <div className="grid two section"><div className="card"><h2>Create post</h2><form action={createScheduledPost} className="form">
      <label>Platform<select name="platform" required>{platforms.map(platform => <option key={platform} value={platform}>{connectorCatalog[platform].name}{connected.has(platform) ? " Â· connected" : " Â· draft only"}</option>)}</select></label>
      <label>Post content<textarea name="content" rows={7} required placeholder="Write the message your audience will seeâ€¦" /></label>
      <label>Schedule date and time (optional)<input name="scheduled_for" type="datetime-local" /></label>
      <button className="btn">Save to campaign queue</button>
    </form></div><div className="card"><h2>How publishing works</h2><p className="muted">Posts without a connected account remain safely queued. Once OAuth is connected, the worker can publish scheduled items through the existing connector interface.</p><div className="checks"><div className="check"><span className="badge good">Ready</span><span>Drafts and scheduled posts</span></div><div className="check"><span className="badge">Next</span><span>Media upload and approval workflow</span></div><div className="check"><span className="badge">Next</span><span>Background publishing worker</span></div></div></div></div>
    <div className="card section"><h2>Campaign queue</h2>{!posts?.length ? <div className="empty">No posts yet. Create your first campaign draft above.</div> : <table><thead><tr><th>Platform</th><th>Content</th><th>Publish time</th><th>Status</th><th></th></tr></thead><tbody>{posts.map(post => <tr key={post.id}><td>{connectorCatalog[post.platform as keyof typeof connectorCatalog]?.name ?? post.platform}</td><td className="truncate">{post.content}</td><td>{post.scheduled_for ? new Date(post.scheduled_for).toLocaleString() : "Not scheduled"}</td><td><span className={`badge ${post.status === "published" ? "good" : ""}`}>{post.status}</span></td><td><form action={deleteScheduledPost}><input type="hidden" name="id" value={post.id}/><button className="btn secondary">Delete</button></form></td></tr>)}</tbody></table>}</div>
  </>;
}

