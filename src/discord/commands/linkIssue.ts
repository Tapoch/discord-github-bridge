import { type ChatInputCommandInteraction, ChannelType, MessageFlags } from "discord.js";
import type Database from "better-sqlite3";
import { config } from "../../config.js";
import type { GitHubApp } from "../../github/app.js";
import { getIssue } from "../../github/issues.js";
import {
  linkThreadToIssue,
  getIssueByThread,
} from "../../storage/mappings.js";

export async function handleLinkIssue(
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

  const existing = getIssueByThread(db, channel.id);
  if (existing) {
    await interaction.reply({
      content: `This thread is already linked to issue #${existing}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const issueNumber = interaction.options.getInteger("number", true);

  await interaction.deferReply();

  const issue = await getIssue(github, issueNumber);
  linkThreadToIssue(db, channel.id, issueNumber);

  await interaction.editReply(
    `Linked to [#${issueNumber} — ${issue.title}](${issue.html_url}) (${issue.state})`,
  );
}
