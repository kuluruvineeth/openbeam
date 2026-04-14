import { Suspense } from "react";
import { AuditLogViewer } from "@/features/admin/components/audit-log-viewer";
import { ApiKeyTable } from "@/features/settings/developer/components/api-key-table";
import { CreateApiKeyModal } from "@/features/settings/developer/components/create-api-key-modal";
import { EditApiKeyModal } from "@/features/settings/developer/components/edit-api-key-modal";
import { RevokeApiKeyModal } from "@/features/settings/developer/components/revoke-api-key-modal";
import { TableSkeleton } from "@/features/settings/developer/components/table-skeleton";

export default function AdminSecurityPage() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 font-medium text-lg">API Keys</h2>
        <Suspense fallback={<TableSkeleton />}>
          <ApiKeyTable />
        </Suspense>
        <CreateApiKeyModal />
        <EditApiKeyModal />
        <RevokeApiKeyModal />
      </section>

      <section>
        <h2 className="mb-4 font-medium text-lg">Audit Log</h2>
        <AuditLogViewer />
      </section>
    </div>
  );
}
