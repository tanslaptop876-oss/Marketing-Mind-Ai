"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { publishDuePosts } from "@/lib/publishing/worker";
import { randomUUID } from "node:crypto";

const publishingPlatforms = new Set(["meta", "google_business_profile", "wordpress", "youtube", "linkedin", "x"]);

export async function createScheduledPost(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const platform = String(form.get("platform") || "");
  const content = String(form.get("content") || "").trim();
  const scheduledFor = String(form.get("scheduled_for") || "");
  const intent = String(form.get("intent") || "draft");
  const publishMode = String(form.get("publish_mode") || "publish") === "draft" ? "draft" : "publish";
  const requestedPersonaId = String(form.get("persona_id") || "");
  if (!publishingPlatforms.has(platform) || !content) return;

  let personaId: string | null = null;
  if (requestedPersonaId) {
    const { data: persona } = await supabase.from("buyer_personas")
      .select("id").eq("id", requestedPersonaId).eq("status", "active").maybeSingle();
    personaId = persona?.id ?? null;
  }

  const media = form.get("media");
  const mediaUrls: string[] = [];
  if (media instanceof File && media.size > 0) {
    if (media.size > 8 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(media.type)) return;
    const extension = media.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const path = `${user.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("campaign-media").upload(path, media, { contentType: media.type, upsert: false });
    if (uploadError) throw uploadError;
    mediaUrls.push(path);
  }

  const { data: account } = await supabase.from("connector_accounts")
    .select("id").eq("provider", platform).eq("status", "active").maybeSingle();

  await supabase.from("scheduled_posts").insert({
    owner_id: user.id,
    connector_account_id: account?.id ?? null,
    persona_id: personaId,
    platform,
    publish_mode: publishMode,
    content,
    media_urls: mediaUrls,
    scheduled_for: intent === "approve" ? (scheduledFor ? new Date(scheduledFor).toISOString() : new Date().toISOString()) : null,
    status: intent === "approve" ? "scheduled" : "draft",
    approval_status: intent === "approve" ? "approved" : "pending",
  });
  revalidatePath("/campaigns");
}

export async function approveScheduledPost(form: FormData) {
  const supabase = await createClient();
  await supabase.from("scheduled_posts").update({ approval_status: "approved", status: "scheduled", scheduled_for: new Date().toISOString(), error_message: null })
    .eq("id", String(form.get("id"))).in("status", ["draft", "failed"]);
  revalidatePath("/campaigns");
}

export async function rejectScheduledPost(form: FormData) {
  const supabase = await createClient();
  await supabase.from("scheduled_posts").update({ approval_status: "rejected", status: "draft" })
    .eq("id", String(form.get("id"))).neq("status", "published");
  revalidatePath("/campaigns");
}

export async function deleteScheduledPost(form: FormData) {
  const supabase = await createClient();
  await supabase.from("scheduled_posts").delete().eq("id", String(form.get("id")));
  revalidatePath("/campaigns");
}

export async function runDuePostsNow() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await publishDuePosts(10, user.id);
  revalidatePath("/campaigns");
}

