import type { ConnectorCapability, ConnectorKind } from "./types";

export const connectorCatalog: Record<ConnectorKind, { name: string; capabilities: ConnectorCapability[] }> = {
  meta: { name: "Meta (Facebook & Instagram)", capabilities: ["publish", "schedule", "analytics"] },
  google_business_profile: { name: "Google Business Profile", capabilities: ["publish", "schedule", "analytics"] },
  ga4: { name: "Google Analytics 4", capabilities: ["analytics"] },
  gsc: { name: "Google Search Console", capabilities: ["seo", "analytics"] },
  semrush: { name: "Semrush", capabilities: ["seo"] },
  ahrefs: { name: "Ahrefs", capabilities: ["seo"] },
  wordpress: { name: "WordPress", capabilities: ["publish", "schedule"] },
  shopify: { name: "Shopify", capabilities: ["commerce", "analytics"] },
  youtube: { name: "YouTube", capabilities: ["publish", "schedule", "analytics"] },
  linkedin: { name: "LinkedIn", capabilities: ["publish", "schedule", "analytics"] },
  x: { name: "X", capabilities: ["publish", "schedule", "analytics"] },
};
