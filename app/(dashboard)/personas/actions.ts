"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function list(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

export async function addPersona(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(form.get("name") ?? "").trim();
  const segment = String(form.get("segment") ?? "").trim();
  if (!name || !segment) return;

  const { error } = await supabase.from("buyer_personas").insert({
    owner_id: user.id,
    name,
    segment,
    demographics: String(form.get("demographics") ?? "").trim(),
    goals: list(form.get("goals")),
    pain_points: list(form.get("pain_points")),
    preferred_channels: list(form.get("preferred_channels")),
    messaging_notes: String(form.get("messaging_notes") ?? "").trim(),
    budget_range: String(form.get("budget_range") ?? "").trim(),
  });
  if (error) throw error;
  revalidatePath("/personas");
}

export async function archivePersona(form: FormData) {
  const supabase = await createClient();
  await supabase.from("buyer_personas")
    .update({ status: "archived" })
    .eq("id", String(form.get("id") ?? ""));
  revalidatePath("/personas");
}

