"use server";
import { revalidatePath } from "next/cache"; import { redirect } from "next/navigation"; import { createClient } from "@/lib/supabase/server"; import { scanWebsite } from "@/lib/seo-scanner";
export async function addAudit(data:FormData){const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)return;await s.from("audit_runs").insert({owner_id:user.id,website_id:String(data.get("website_id")),score:Number(data.get("score")),technical_score:Number(data.get("technical_score")),content_score:Number(data.get("content_score")),performance_score:Number(data.get("performance_score")),issues_count:Number(data.get("issues_count")),summary:String(data.get("summary")||"")});revalidatePath("/seo-audits")}

export async function runAutomatedAudit(data: FormData) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");
  const websiteId = String(data.get("website_id") || "");
  const { data: website } = await s.from("websites").select("id,url").eq("id", websiteId).single();
  if (!website) redirect("/seo-audits?error=Website%20not%20found");
  try {
    const result = await scanWebsite(website.url);
    const { error } = await s.from("audit_runs").insert({ owner_id: user.id, website_id: website.id, score: result.score, technical_score: result.technicalScore, content_score: result.contentScore, performance_score: result.performanceScore, issues_count: result.issuesCount, summary: result.summary, details: result });
    if (error) throw error;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed.";
    redirect(`/seo-audits?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/seo-audits");
  redirect("/seo-audits?message=Automated%20SEO%20scan%20completed");
}

