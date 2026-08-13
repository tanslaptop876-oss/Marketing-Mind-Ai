"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export async function addWebsite(data: FormData) {
  const s = await createClient(); const {data:{user}} = await s.auth.getUser(); if (!user) return;
  await s.from("websites").insert({ owner_id:user.id, name:String(data.get("name")), url:String(data.get("url")), industry:String(data.get("industry")||"") });
  revalidatePath("/websites");
}
