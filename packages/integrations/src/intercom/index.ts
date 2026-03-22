export { intercomApp } from "./config";
export type {
  ExchangeIntercomCodeParams,
  GenerateIntercomAuthUrlParams,
} from "./oauth";
export {
  exchangeIntercomCode,
  generateIntercomAuthUrl,
  IntercomOAuthError,
} from "./oauth";
export type {
  IntercomMe,
  IntercomOAuthResult,
  IntercomTokenResponse,
} from "./types";
