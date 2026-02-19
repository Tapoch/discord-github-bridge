import {
  type Client,
  Events,
  MessageFlags,
  REST,
  Routes,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type Database from "better-sqlite3";
import { config } from "../../config.js";
import type { GitHubApp } from "../../github/app.js";
import { handleLinkIssue } from "./linkIssue.js";
import { handleCloseIssue } from "./closeIssue.js";
import { handleSyncStatus } from "./syncStatus.js";
import { logger } from "../../utils/logger.js";

const commands = [
  new SlashCommandBuilder()
    .setName("link-issue")
    .setDescription("Link this thread to an existing GitHub issue")
    .addIntegerOption((opt) =>
      opt
        .setName("number")
        .setDescription("GitHub issue number")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("close-issue")
    .setDescription("Close the GitHub issue linked to this thread"),
  new SlashCommandBuilder()
    .setName("sync-status")
    .setDescription("Show the link status for this thread"),
];

export async function registerCommands(
  client: Client,
  github: GitHubApp,
  db: Database.Database,
): Promise<void> {
  const rest = new REST().setToken(config.discord.token);

  await rest.put(
    Routes.applicationGuildCommands(client.user!.id, config.discord.guildId),
    { body: commands.map((c) => c.toJSON()) },
  );

  logger.info("Slash commands registered");

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const cmd = interaction as ChatInputCommandInteraction;

    try {
      switch (cmd.commandName) {
        case "link-issue":
          await handleLinkIssue(cmd, github, db);
          break;
        case "close-issue":
          await handleCloseIssue(cmd, github, db);
          break;
        case "sync-status":
          await handleSyncStatus(cmd, github, db);
          break;
      }
    } catch (err) {
      logger.error(err, `Error handling command ${cmd.commandName}`);
      if (cmd.deferred) {
        await cmd.editReply({ content: "An error occurred." }).catch(() => {});
      } else {
        await cmd
          .reply({ content: "An error occurred.", flags: MessageFlags.Ephemeral })
          .catch(() => {});
      }
    }
  });
}
