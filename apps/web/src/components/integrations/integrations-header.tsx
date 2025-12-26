import { IntegrationsTabs } from "@/components/integrations/integrations-tabs";
import { SearchField } from "@/components/search-field";

export function IntegrationsHeader() {
  return (
    <div className="flex space-x-4">
      <IntegrationsTabs />
      <SearchField placeholder="Search apps" shallow />
    </div>
  );
}
