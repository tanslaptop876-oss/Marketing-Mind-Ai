"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveFinanceScenario(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(form.get("name") ?? "").trim();
  const fixedCosts = Number(form.get("fixed_costs"));
  const pricePerUnit = Number(form.get("price_per_unit"));
  const variableCostPerUnit = Number(form.get("variable_cost_per_unit"));
  const expectedUnits = Number(form.get("expected_units"));
  if (!name || [fixedCosts, pricePerUnit, variableCostPerUnit, expectedUnits].some(value => !Number.isFinite(value) || value < 0)) return;
  if (pricePerUnit <= variableCostPerUnit) return;

  const { error } = await supabase.from("finance_scenarios").insert({
    owner_id: user.id,
    name,
    fixed_costs: fixedCosts,
    price_per_unit: pricePerUnit,
    variable_cost_per_unit: variableCostPerUnit,
    expected_units: Math.floor(expectedUnits),
  });
  if (error) throw error;
  revalidatePath("/finance");
}

export async function deleteFinanceScenario(form: FormData) {
  const supabase = await createClient();
  await supabase.from("finance_scenarios").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/finance");
}

