import type { ConnectorCapability, ConnectorKind } from "./types";

export type ConnectorStage = "live" | "oauth-next" | "api-next" | "planned";
export type ConnectorDefinition = {
  name: string;
  category: "Social" | "Google" | "SEO" | "CMS" | "Commerce";
  capabilities: ConnectorCapability[];
  stage: ConnectorStage;
  setup: string;
};

export const connectorCatalog: Record<ConnectorKind, ConnectorDefinition> = {
  meta: { name: "Meta (Facebook & Instagram)", category: "Social", capabilities: ["publish", "schedule", "analytics"], stage: "live", setup: "Meta App OAuth and Facebook Page permissions" },
  google_business_profile: { name: "Google Business Profile", category: "Google", capabilities: ["publish", "schedule", "analytics"], stage: "oauth-next", setup: "Google Business Profile API approval and OAuth" },
  ga4: { name: "Google Analytics 4", category: "Google", capabilities: ["analytics"], stage: "oauth-next", setup: "Google Analytics Data API OAuth" },
  gsc: { name: "Google Search Console", category: "Google", capabilities: ["seo", "analytics"], stage: "live", setup: "Google OAuth and verified Search Console property" },
  semrush: { name: "Semrush", category: "SEO", capabilities: ["seo"], stage: "api-next", setup: "Semrush API subscription and API key" },
  ahrefs: { name: "Ahrefs", category: "SEO", capabilities: ["seo"], stage: "api-next", setup: "Ahrefs API plan and access token" },
  wordpress: { name: "WordPress", category: "CMS", capabilities: ["publish", "schedule"], stage: "api-next", setup: "WordPress.com OAuth or site application password" },
  shopify: { name: "Shopify", category: "Commerce", capabilities: ["commerce", "analytics"], stage: "oauth-next", setup: "Shopify custom app and Admin API scopes" },
  youtube: { name: "YouTube", category: "Social", capabilities: ["publish", "schedule", "analytics"], stage: "oauth-next", setup: "YouTube Data API OAuth and channel access" },
  linkedin: { name: "LinkedIn", category: "Social", capabilities: ["publish", "schedule", "analytics"], stage: "planned", setup: "LinkedIn developer app and Community Management access" },
  x: { name: "X", category: "Social", capabilities: ["publish", "schedule", "analytics"], stage: "planned", setup: "X developer project with write access" },
};

