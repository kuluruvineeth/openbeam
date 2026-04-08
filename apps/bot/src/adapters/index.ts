import { DiscordAdapter } from "./discord";
import { registerAdapter } from "./registry";
import { SlackAdapter } from "./slack";
import { TeamsAdapter } from "./teams";
import { TelegramAdapter } from "./telegram";
import { WhatsAppAdapter } from "./whatsapp";

export { DISCORD_PING_RESPONSE } from "./discord";
export { getAdapter, getAllAdapters, registerAdapter } from "./registry";
export { handleWhatsAppVerification } from "./whatsapp";

const slackAdapter = new SlackAdapter();
const teamsAdapter = new TeamsAdapter();
const discordAdapter = new DiscordAdapter();
const telegramAdapter = new TelegramAdapter();
const whatsappAdapter = new WhatsAppAdapter();

registerAdapter(slackAdapter);
registerAdapter(teamsAdapter);
registerAdapter(discordAdapter);
registerAdapter(telegramAdapter);
registerAdapter(whatsappAdapter);

export {
  discordAdapter,
  slackAdapter,
  teamsAdapter,
  telegramAdapter,
  whatsappAdapter,
};
