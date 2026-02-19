import { type ChatInputCommandInteraction, ChannelType, MessageFlags } from "discord.js";
import type Database from "better-sqlite3";
import { config } from "../../config.js";
import type { GitHubApp } from "../../github/app.js";
import { getIssue } from "../../github/issues.js";
import { getIssueByThread } from "../../storage/mappings.js";

export async function handleSyncStatus(
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

  const issue = await getIssue(github, issueNumber);

  const labels =
    issue.labels.length > 0
      ? issue.labels.map((l) => `\`${l}\``).join(", ")
      : "none";

  await interaction.editReply(
    [
      `**Issue:** [#${issueNumber} — ${issue.title}](${issue.html_url})`,
      `**Status:** ${issue.state}`,
      `**Labels:** ${labels}`,
    ].join("\n"),
  );
}
