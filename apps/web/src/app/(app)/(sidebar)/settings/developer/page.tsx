import { Separator } from "@openbeam/ui";
import { Suspense } from "react";
import { ApiKeyTable } from "@/features/settings/developer/components/api-key-table";
import { CreateApiKeyModal } from "@/features/settings/developer/components/create-api-key-modal";
import { DeleteOAuthAppModal } from "@/features/settings/developer/components/delete-oauth-app-modal";
import { EditApiKeyModal } from "@/features/settings/developer/components/edit-api-key-modal";
import { McpSetupSection } from "@/features/settings/developer/components/mcp-setup-section";
import { OAuthAppCreateSheet } from "@/features/settings/developer/components/oauth-app-create-sheet";
import { OAuthAppEditSheet } from "@/features/settings/developer/components/oauth-app-edit-sheet";
import { OAuthAppTable } from "@/features/settings/developer/components/oauth-app-table";
import { OAuthSecretModal } from "@/features/settings/developer/components/oauth-secret-modal";
import { RevokeApiKeyModal } from "@/features/settings/developer/components/revoke-api-key-modal";
import { TableSkeleton } from "@/features/settings/developer/components/table-skeleton";

export default function DeveloperSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 py-8">
      <div>
        <h2 className="font-medium text-lg">Developer Settings</h2>
        <p className="text-muted-foreground text-sm">
          Manage API keys, configure MCP clients, and register OAuth
          applications.
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <ApiKeyTable />
      </Suspense>

      <Separator className="bg-border/50" />

      <McpSetupSection />

      <Separator className="bg-border/50" />

      <Suspense fallback={<TableSkeleton />}>
        <OAuthAppTable />
      </Suspense>

      <CreateApiKeyModal />
      <EditApiKeyModal />
      <RevokeApiKeyModal />
      <OAuthAppCreateSheet />
      <OAuthAppEditSheet />
      <OAuthSecretModal />
      <DeleteOAuthAppModal />
    </div>
  );
}
