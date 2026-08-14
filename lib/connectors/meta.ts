import "server-only";
import { createOAuthState, decryptTokens, encryptTokens, verifyOAuthState } from "./google-search-console";
const version="v26.0",base=()=>process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,"")||"http://localhost:3000";
export const metaRedirectUri=()=>`${base()}/api/connectors/meta/callback`;
export const metaConfigured=()=>Boolean(process.env.META_APP_ID&&process.env.META_APP_SECRET&&process.env.CONNECTOR_ENCRYPTION_KEY);
export {createOAuthState,verifyOAuthState};
export function metaAuthorizationUrl(state:string){const q=new URLSearchParams({client_id:process.env.META_APP_ID!,redirect_uri:metaRedirectUri(),state,response_type:"code",scope:"pages_show_list,pages_manage_posts,pages_read_engagement"});return `https://www.facebook.com/${version}/dialog/oauth?${q}`}
async function graph<T>(path:string){const response=await fetch(`https://graph.facebook.com/${version}/${path}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Meta authorization failed.");return data as T}
export async function exchangeMetaCode(code:string){const short=await graph<{access_token:string}>(`oauth/access_token?${new URLSearchParams({client_id:process.env.META_APP_ID!,client_secret:process.env.META_APP_SECRET!,redirect_uri:metaRedirectUri(),code})}`);return graph<{access_token:string;expires_in?:number}>(`oauth/access_token?${new URLSearchParams({grant_type:"fb_exchange_token",client_id:process.env.META_APP_ID!,client_secret:process.env.META_APP_SECRET!,fb_exchange_token:short.access_token})}`)}
export async function listManagedPages(token:string){return (await graph<{data?:{id:string;name:string;access_token:string}[]}>(`me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(token)}`)).data??[]}
export function encryptedPageCredentials(page:{id:string;access_token:string},expires=5184000){return encryptTokens({access_token:page.access_token,expires_at:Date.now()+expires*1000,page_id:page.id} as {access_token:string;expires_at:number;page_id:string})}

type MetaPageCredentials = { access_token: string; expires_at?: number; page_id: string };

export function decryptPageCredentials(value: unknown) {
  return decryptTokens(value) as MetaPageCredentials;
}

export async function publishMetaPagePost(credentials: MetaPageCredentials, content: string) {
  if (credentials.expires_at && credentials.expires_at <= Date.now()) {
    throw new Error("Meta Page connection expired. Reconnect Meta before publishing.");
  }

  const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(credentials.page_id)}/feed`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message: content, access_token: credentials.access_token }),
    cache: "no-store",
  });
  const data = await response.json() as { id?: string; error?: { message?: string } };
  if (!response.ok || !data.id) throw new Error(data.error?.message || "Meta did not publish the post.");
  return data.id;
}

