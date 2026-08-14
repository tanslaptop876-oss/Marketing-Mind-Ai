import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPageCredentials, publishMetaPagePost } from "@/lib/connectors/meta";

type QueuePost = {
  id: string;
  owner_id: string;
  platform: string;
  connector_account_id: string | null;
  content: string;
};

type ConnectorAccount = {
  id: string;
  encrypted_credentials: unknown;
};

export type PublishRunResult = { processed: number; published: number; failed: number };

async function connectorForPost(post: QueuePost): Promise<ConnectorAccount | null> {
  const supabase = createAdminClient();
  let query = supabase.from("connector_accounts")
    .select("id,encrypted_credentials")
    .eq("owner_id", post.owner_id)
    .eq("provider", post.platform)
    .eq("status", "active");
  query = post.connector_account_id ? query.eq("id", post.connector_account_id) : query.order("created_at").limit(1);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as ConnectorAccount | null;
}

export async function publishDuePosts(limit = 10, ownerId?: string): Promise<PublishRunResult> {
  const supabase = createAdminClient();
  let dueQuery = supabase.from("scheduled_posts")
    .select("id,owner_id,platform,connector_account_id,content")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for")
    .limit(limit);
  if (ownerId) dueQuery = dueQuery.eq("owner_id", ownerId);
  const { data, error } = await dueQuery;
  if (error) throw error;

  const result: PublishRunResult = { processed: 0, published: 0, failed: 0 };
  for (const post of (data ?? []) as QueuePost[]) {
    const { data: claimed, error: claimError } = await supabase.from("scheduled_posts")
      .update({ status: "publishing", error_message: null })
      .eq("id", post.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) continue;
    result.processed += 1;

    try {
      if (post.platform !== "meta") throw new Error(`${post.platform} publishing is not enabled yet.`);
      const account = await connectorForPost(post);
      if (!account) throw new Error("No active Meta Page is connected.");
      const externalPostId = await publishMetaPagePost(decryptPageCredentials(account.encrypted_credentials), post.content);
      const { error: updateError } = await supabase.from("scheduled_posts").update({
        connector_account_id: account.id,
        status: "published",
        external_post_id: externalPostId,
        error_message: null,
      }).eq("id", post.id);
      if (updateError) throw updateError;
      result.published += 1;
    } catch (error) {
      await supabase.from("scheduled_posts").update({
        status: "failed",
        error_message: error instanceof Error ? error.message.slice(0, 500) : "Publishing failed.",
      }).eq("id", post.id);
      result.failed += 1;
    }
  }
  return result;
}

