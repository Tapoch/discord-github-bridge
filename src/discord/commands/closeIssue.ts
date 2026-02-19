import { type ChatInputCommandInteraction, ChannelType, MessageFlags } from "discord.js";
import type Database from "better-sqlite3";
import { config } from "../../config.js";
import type { GitHubApp } from "../../github/app.js";
import { closeIssue } from "../../github/issues.js";
import { getIssueByThread } from "../../storage/mappings.js";
import { addMarker } from "../../utils/echoGuard.js";

export async function handleCloseIssue(
  interaction: ChatInputCommandInteraction,
  github: GitHubApp,
  db: Database.Database,
): Promise<void> {
  const channel = interaction.channel;
  if (
    !channel ||
    channel.type !== ChannelType.PublicThread ||
    channel.parentId !== config.discord.forumChannelId
  ) {
    await interaction.reply({
      content: "This command can only be used in forum threads.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const issueNumber = getIssueByThread(db, channel.id);
  if (!issueNumber) {
    await interaction.reply({
      content: "This thread is not linked to any GitHub issue.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  await closeIssue(
    github,
    issueNumber,
    addMarker(
      `Closed from Discord by **${interaction.user.displayName}**.`,
    ),
  );

  await interaction.editReply(`Issue #${issueNumber} closed.`);
}
