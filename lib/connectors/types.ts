export const connectorKinds=["meta","google_business_profile","ga4","gsc","semrush","ahrefs","wordpress","shopify","youtube","linkedin","x"] as const;
export type ConnectorKind=typeof connectorKinds[number];
export type PublishRequest={content:string;mediaUrls?:string[];scheduledFor?:string};
export type ConnectorCapability="publish"|"schedule"|"analytics"|"seo"|"commerce";
export interface MarketingConnector{kind:ConnectorKind;capabilities:ConnectorCapability[];connect(authorizationCode:string):Promise<void>;disconnect():Promise<void>;publish?(request:PublishRequest):Promise<{externalId:string}>;sync?():Promise<{records:number}>;}
