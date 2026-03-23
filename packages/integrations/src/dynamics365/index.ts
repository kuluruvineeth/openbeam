export { dynamics365App } from "./config";
export type {
  Dynamics365OAuthResult,
  ExchangeDynamics365CodeParams,
  GenerateDynamics365AuthUrlParams,
  RefreshDynamics365TokenParams,
} from "./oauth";
export {
  exchangeDynamics365Code,
  generateDynamics365AuthUrl,
  refreshDynamics365Token,
} from "./oauth";
export type { Dynamics365Config } from "./types";
