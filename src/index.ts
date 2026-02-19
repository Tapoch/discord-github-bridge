import { config } from "./config.js";
import { createDiscordClient, loginDiscord } from "./discord/client.js";
import { registerDiscordEvents } from "./discord/events/index.js";
import { registerCommands } from "./discord/commands/register.js";
import { initDatabase } from "./storage/database.js";
import { createGitHubApp } from "./github/app.js";
import { startWebhookServer } from "./github/webhooks.js";
import { logger } from "./utils/logger.js";

async function main() {
  logger.info("Starting discord-github-bridge...");

  const db = initDatabase();
  const github = createGitHubApp();
  const discord = createDiscordClient();

  registerDiscordEvents(discord, github, db);

  const server = await startWebhookServer(discord, github, db);

  await loginDiscord(discord);
  await registerCommands(discord, github, db);

  const shutdown = async () => {
    logger.info("Shutting down...");
    discord.destroy();
    await server.close();
    db.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.fatal(err, "Failed to start");
  process.exit(1);
});
