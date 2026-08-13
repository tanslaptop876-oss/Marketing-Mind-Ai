"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const publishingPlatforms = new Set(["meta", "google_business_profile", "wordpress", "youtube", "linkedin", "x"]);

export async function createScheduledPost(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const platform = String(form.get("platform") || "");
  const content = String(form.get("content") || "").trim();
  const scheduledFor = String(form.get("scheduled_for") || "");
  if (!publishingPlatforms.has(platform) || !content) return;

  const { data: account } = await supabase.from("connector_accounts")
    .select("id").eq("provider", platform).eq("status", "active").maybeSingle();

  await supabase.from("scheduled_posts").insert({
    owner_id: user.id,
    connector_account_id: account?.id ?? null,
    platform,
    content,
    scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
    status: scheduledFor ? "scheduled" : "draft",
  });
  revalidatePath("/campaigns");
}

export async function deleteScheduledPost(form: FormData) {
  const supabase = await createClient();
  await supabase.from("scheduled_posts").delete().eq("id", String(form.get("id")));
  revalidatePath("/campaigns");
}

