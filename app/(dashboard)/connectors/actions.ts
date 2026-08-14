"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encryptTokens } from "@/lib/connectors/google-search-console";
import { normalizeWordPressUrl, validateWordPressConnection } from "@/lib/connectors/wordpress";

export async function disconnectGsc(){const supabase=await createClient();await supabase.from("connector_accounts").delete().eq("provider","gsc");revalidatePath("/connectors")}
export async function disconnectMeta(){const supabase=await createClient();await supabase.from("connector_accounts").delete().eq("provider","meta");revalidatePath("/connectors")}
export async function disconnectGbp(){const supabase=await createClient();await supabase.from("connector_accounts").delete().eq("provider","google_business_profile");revalidatePath("/connectors")}

export async function connectWordPress(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  try {
    const siteUrl = normalizeWordPressUrl(String(form.get("site_url") ?? ""));
    const username = String(form.get("username") ?? "").trim();
    const applicationPassword = String(form.get("application_password") ?? "").replace(/\s+/g, "");
    if (!username || !applicationPassword) throw new Error("Username and application password are required.");
    const profile = await validateWordPressConnection(siteUrl, { username, applicationPassword });
    const { error } = await supabase.from("connector_accounts").upsert({
      owner_id: user.id,
      provider: "wordpress",
      external_account_id: siteUrl,
      display_name: `${profile.displayName} - ${siteUrl}`,
      status: "active",
      encrypted_credentials: encryptTokens({ username, applicationPassword }),
    }, { onConflict: "owner_id,provider,external_account_id" });
    if (error) throw error;
  } catch (error) {
    redirect(`/connectors?error=${encodeURIComponent(error instanceof Error ? error.message : "WordPress connection failed.")}`);
  }
  revalidatePath("/connectors");
  redirect("/connectors?message=WordPress connected");
}

export async function disconnectWordPress() {
  const supabase = await createClient();
  await supabase.from("connector_accounts").delete().eq("provider", "wordpress");
  revalidatePath("/connectors");
}

