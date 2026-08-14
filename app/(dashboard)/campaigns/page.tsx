import { createClient } from "@/lib/supabase/server";
import { connectorCatalog } from "@/lib/connectors/registry";
import { approveScheduledPost, createScheduledPost, deleteScheduledPost, rejectScheduledPost, runDuePostsNow } from "./actions";

const platforms = ["meta", "google_business_profile", "wordpress", "youtube", "linkedin", "x"] as const;
type AccountRow = { provider: string };
type PostRow = { id: string; platform: string; content: string; scheduled_for: string | null; status: string; approval_status: string; media_urls: string[]; connector_account_id: string | null; error_message: string | null; created_at: string };

export default async function Campaigns() {
  const supabase = await createClient();
  const { data: posts = [] } = await supabase.from("scheduled_posts")
    .select("id,platform,content,scheduled_for,status,approval_status,media_urls,connector_account_id,error_message,created_at")
    .order("created_at", { ascending: false });
  const { data: accounts = [] } = await supabase.from("connector_accounts").select("provider").eq("status", "active");
  const connected = new Set(((accounts ?? []) as AccountRow[]).map(account => account.provider));
  const queue = (posts ?? []) as PostRow[];

  return <>
    <h1>Publishing & scheduling</h1>
    <p className="muted">Draft, approve, and schedule content for connected channels.</p>
    <div className="grid two section">
      <div className="card"><h2>Create post</h2><form action={createScheduledPost} className="form">
        <label>Platform<select name="platform" required>{platforms.map(platform => <option key={platform} value={platform}>{connectorCatalog[platform].name}{connected.has(platform) ? " Â· connected" : " Â· draft only"}</option>)}</select></label>
        <label>Post content<textarea name="content" rows={7} required placeholder="Write the message your audience will seeâ€¦" /></label>
        <label>Image (optional, max 8 MB)<input name="media" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
        <label>Schedule date and time (optional)<input name="scheduled_for" type="datetime-local" /></label>
        <div className="topbar"><button className="btn secondary" name="intent" value="draft">Save draft</button><button className="btn" name="intent" value="approve">Approve & queue</button></div>
      </form></div>
      <div className="card"><h2>How publishing works</h2><p className="muted">Only approved Meta posts publish. Images stay private in Supabase Storage and are shared with Meta through a short-lived signed URL.</p><div className="checks">
        <div className="check"><span className="badge good">Ready</span><span>Draft and approval workflow</span></div>
        <div className="check"><span className="badge good">Ready</span><span>Meta text and image publishing</span></div>
        <div className="check"><span className="badge good">Ready</span><span>Background publishing worker</span></div>
      </div></div>
    </div>
    <div className="card section">
      <div className="topbar"><h2>Campaign queue</h2><form action={runDuePostsNow}><button className="btn secondary">Run due posts now</button></form></div>
      {!queue.length ? <div className="empty">No posts yet. Create your first campaign draft above.</div> : <table><thead><tr><th>Platform</th><th>Content</th><th>Media</th><th>Publish time</th><th>Approval</th><th>Status</th><th></th></tr></thead><tbody>{queue.map(post => <tr key={post.id}>
        <td>{connectorCatalog[post.platform as keyof typeof connectorCatalog]?.name ?? post.platform}</td>
        <td className="truncate">{post.content}</td>
        <td>{post.media_urls.length ? `${post.media_urls.length} image` : "Text only"}</td>
        <td>{post.scheduled_for ? new Date(post.scheduled_for).toLocaleString() : "Not scheduled"}</td>
        <td><span className={`badge ${post.approval_status === "approved" ? "good" : post.approval_status === "rejected" ? "bad" : ""}`}>{post.approval_status}</span></td>
        <td><span className={`badge ${post.status === "published" ? "good" : post.status === "failed" ? "bad" : ""}`} title={post.error_message ?? undefined}>{post.status}</span>{post.error_message ? <p className="muted small">{post.error_message}</p> : null}</td>
        <td><div className="topbar">
          {post.status !== "published" && post.approval_status !== "approved" ? <form action={approveScheduledPost}><input type="hidden" name="id" value={post.id}/><button className="btn secondary">Approve now</button></form> : null}
          {post.status !== "published" && post.approval_status !== "rejected" ? <form action={rejectScheduledPost}><input type="hidden" name="id" value={post.id}/><button className="btn secondary">Reject</button></form> : null}
          <form action={deleteScheduledPost}><input type="hidden" name="id" value={post.id}/><button className="btn secondary">Delete</button></form>
        </div></td>
      </tr>)}</tbody></table>}
    </div>
  </>;
}

