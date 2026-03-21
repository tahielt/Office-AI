import N8nFlowStudio from "@/components/ui/N8nFlowStudio";
import { getN8nWorkflowCatalog, getOfficeWebhookUrl } from "@/lib/n8nStudio";

export const dynamic = "force-dynamic";

export default async function N8nStudioPage() {
  const workflows = await getN8nWorkflowCatalog();
  const webhookUrl = getOfficeWebhookUrl();

  return <N8nFlowStudio workflows={workflows} webhookUrl={webhookUrl} />;
}
