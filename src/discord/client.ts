import { Client, GatewayIntentBits, Events } from "discord.js";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export function createDiscordClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, (c) => {
    logger.info(`Discord bot ready as ${c.user.tag}`);
  });

  return client;
}

export async function loginDiscord(client: Client): Promise<void> {
  await client.login(config.discord.token);
}
