import { registerCrmSupportFactories } from "./sync/crm-support";
import { registerDevOpsFactories } from "./sync/devops";
import { registerEnterpriseSaasFactories } from "./sync/enterprise-saas";
import { registerGoogleFactories } from "./sync/google";
import { registerHrTalentFactories } from "./sync/hr-talent";
import { registerIotIndustrialFactories } from "./sync/iot-industrial";
import { registerKnowledgeFactories } from "./sync/knowledge";
import { registerMarketingFactories } from "./sync/marketing";
import { registerMicrosoftFactories } from "./sync/microsoft";
import { registerMiscFactories } from "./sync/misc";
import { registerPhysicalFactories } from "./sync/physical";
import { registerProductivityFactories } from "./sync/productivity";
import { registerSecurityFactories } from "./sync/security";
import { registerStorageFactories } from "./sync/storage";

export function registerAllSyncFactories(): void {
  registerCrmSupportFactories();
  registerDevOpsFactories();
  registerEnterpriseSaasFactories();
  registerGoogleFactories();
  registerHrTalentFactories();
  registerIotIndustrialFactories();
  registerKnowledgeFactories();
  registerMarketingFactories();
  registerMicrosoftFactories();
  registerMiscFactories();
  registerPhysicalFactories();
  registerProductivityFactories();
  registerSecurityFactories();
  registerStorageFactories();
}
