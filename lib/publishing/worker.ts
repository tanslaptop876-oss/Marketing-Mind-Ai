import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPageCredentials, publishMetaPagePost } from "@/lib/connectors/meta";
import { decryptTokens, validAccessToken, type GoogleTokens } from "@/lib/connectors/google-search-console";
import { publishWordPressPost, uploadWordPressMedia, type StoredWordPressCredentials } from "@/lib/connectors/wordpress";
import { publishGbpPost } from "@/lib/connectors/google-business-profile";

type QueuePost = {
  id: string;
  owner_id: string;
  platform: string;
  connector_account_id: string | null;
  content: string;
  media_urls: string[];
  publish_mode: "draft" | "publish";
};

type ConnectorAccount = {
  id: string;
  encrypted_credentials: unknown;
  external_account_id: string;
};

export type PublishRunResult = { processed: number; published: number; failed: number };

async function connectorForPost(post: QueuePost): Promise<ConnectorAccount | null> {
  const supabase = createAdminClient();
  let query = supabase.from("connector_accounts")
    .select("id,encrypted_credentials,external_account_id")
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
    .select("id,owner_id,platform,connector_account_id,content,media_urls,publish_mode")
    .eq("status", "scheduled")
    .eq("approval_status", "approved")
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
      const account = await connectorForPost(post);
      if (!account) throw new Error(`No active ${post.platform} account is connected.`);
      let externalPostId: string;
      if (post.platform === "meta") {
        let imageUrl: string | undefined;
        if (post.media_urls[0]) {
          const { data: signed, error: signedError } = await supabase.storage.from("campaign-media").createSignedUrl(post.media_urls[0], 600);
          if (signedError || !signed?.signedUrl) throw signedError || new Error("Could not prepare campaign media.");
          imageUrl = signed.signedUrl;
        }
        externalPostId = await publishMetaPagePost(decryptPageCredentials(account.encrypted_credentials), post.content, imageUrl);
      } else if (post.platform === "wordpress") {
        const credentials = decryptTokens<StoredWordPressCredentials>(account.encrypted_credentials);
        let featuredMedia: number | undefined;
        if (post.media_urls[0]) {
          const { data: signed, error: signedError } = await supabase.storage.from("campaign-media").createSignedUrl(post.media_urls[0], 600);
          if (signedError || !signed?.signedUrl) throw signedError || new Error("Could not prepare campaign media.");
          const mediaResponse = await fetch(signed.signedUrl, { cache: "no-store" });
          if (!mediaResponse.ok) throw new Error("Could not download campaign media for WordPress.");
          const mimeType = mediaResponse.headers.get("content-type") || "image/jpeg";
          featuredMedia = await uploadWordPressMedia(account.external_account_id, credentials, await mediaResponse.arrayBuffer(), mimeType, post.media_urls[0].split("/").pop() || "campaign-image.jpg");
        }
        externalPostId = await publishWordPressPost(account.external_account_id, credentials, post.content, post.publish_mode, featuredMedia);
      } else if (post.platform === "google_business_profile") {
        const tokens = await validAccessToken(decryptTokens<GoogleTokens>(account.encrypted_credentials));
        let imageUrl: string | undefined;
        if (post.media_urls[0]) { const {data:signed,error:signedError}=await supabase.storage.from("campaign-media").createSignedUrl(post.media_urls[0],600);if(signedError||!signed?.signedUrl)throw signedError||new Error("Could not prepare campaign media.");imageUrl=signed.signedUrl; }
        externalPostId = await publishGbpPost(tokens.access_token, account.external_account_id, post.content, imageUrl);
      } else {
        throw new Error(`${post.platform} publishing is not enabled yet.`);
      }
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

