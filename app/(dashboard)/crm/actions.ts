"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const leadStatuses = new Set(["new", "qualified", "proposal", "won", "lost"]);

export async function addContact(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(form.get("name") ?? "").trim();
  const status = String(form.get("status") ?? "new");
  const value = Number(form.get("value") ?? 0);
  const requestedPersonaId = String(form.get("persona_id") ?? "");
  if (!name || !leadStatuses.has(status) || !Number.isFinite(value) || value < 0) return;

  let personaId: string | null = null;
  let personaName = "";
  if (requestedPersonaId) {
    const { data: persona } = await supabase.from("buyer_personas")
      .select("id,name").eq("id", requestedPersonaId).eq("status", "active").maybeSingle();
    personaId = persona?.id ?? null;
    personaName = persona?.name ?? "";
  }

  const { data: contact, error } = await supabase.from("contacts").insert({
    owner_id: user.id,
    name,
    email: String(form.get("email") ?? "").trim(),
    company: String(form.get("company") ?? "").trim(),
    persona_id: personaId,
    persona: personaName,
  }).select("id").single();
  if (error) throw error;
  if (contact) await supabase.from("leads").insert({ owner_id: user.id, contact_id: contact.id, status, value });
  revalidatePath("/crm");
}

export async function updateLeadStatus(form: FormData) {
  const supabase = await createClient();
  const status = String(form.get("status") ?? "");
  if (!leadStatuses.has(status)) return;
  await supabase.from("leads").update({ status }).eq("id", String(form.get("lead_id") ?? ""));
  revalidatePath("/crm");
}

