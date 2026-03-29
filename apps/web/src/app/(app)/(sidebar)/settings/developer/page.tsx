import { Suspense } from "react";
import { ApiKeyTable } from "@/features/settings/developer/components/api-key-table";
import { CreateApiKeyModal } from "@/features/settings/developer/components/create-api-key-modal";
import { EditApiKeyModal } from "@/features/settings/developer/components/edit-api-key-modal";
import { McpSetupSection } from "@/features/settings/developer/components/mcp-setup-section";
import { RevokeApiKeyModal } from "@/features/settings/developer/components/revoke-api-key-modal";

export default function DeveloperSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 py-8">
      <Suspense>
        <ApiKeyTable />
      </Suspense>

      <McpSetupSection />

      <CreateApiKeyModal />
      <EditApiKeyModal />
      <RevokeApiKeyModal />
    </div>
  );
}
