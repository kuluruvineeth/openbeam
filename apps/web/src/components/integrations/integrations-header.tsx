import { SearchField } from "@/components/search-field";
import { IntegrationsTabs } from "./integrations-tabs";

export function IntegrationsHeader() {
  return (
    <div className="flex space-x-4">
      <IntegrationsTabs />
      <SearchField placeholder="Search apps" shallow />
    </div>
  );
}
