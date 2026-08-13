"use server";import {revalidatePath} from "next/cache";import {createClient} from "@/lib/supabase/server";
export async function disconnectGsc(){const s=await createClient();await s.from("connector_accounts").delete().eq("provider","gsc");revalidatePath("/connectors")}
export async function disconnectMeta(){const s=await createClient();await s.from("connector_accounts").delete().eq("provider","meta");revalidatePath("/connectors")}

