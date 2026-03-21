export interface N8nWorkflowWebhook {
  method: string;
  path: string;
  url: string;
}

export interface N8nWorkflowCatalogItem {
  id: string;
  slug: string;
  filename: string;
  group: string;
  name: string;
  description: string;
  active: boolean;
  nodeCount: number;
  triggerKinds: string[];
  webhooks: N8nWorkflowWebhook[];
}

export interface N8nStudioRequestPayload {
  companyName: string;
  website: string;
  painPoint: string;
  goal: string;
  channel: string;
  requestedDeliverable: string;
  prompt: string;
}
