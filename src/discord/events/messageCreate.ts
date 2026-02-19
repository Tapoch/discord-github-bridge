import { type Client, type Message, ChannelType, Events } from "discord.js";
import type Database from "better-sqlite3";
import { config } from "../../config.js";
import type { GitHubApp } from "../../github/app.js";
import { addComment } from "../../github/issues.js";
import { getIssueByThread } from "../../storage/mappings.js";
import { addMarker } from "../../utils/echoGuard.js";
import { formatAttachments } from "../../utils/attachments.js";
import { logger } from "../../utils/logger.js";

export function registerMessageCreate(
  client: Client,
  github: GitHubApp,
  db: Database.Database,
): void {
  client.on(Events.MessageCreate, async (message: Message) => {
    // Ignore bot messages (echo guard)
    if (message.author.bot) return;

    // Only handle messages in threads
    const channel = message.channel;
    if (
      channel.type !== ChannelType.PublicThread ||
      channel.parentId !== config.discord.forumChannelId
    ) {
      return;
    }

    const issueNumber = getIssueByThread(db, channel.id);
    if (!issueNumber) return;

    try {
      const body =
        `**${message.author.displayName}** commented:\n\n` +
        (message.content || "") +
        formatAttachments(message.attachments);

      await addComment(github, issueNumber, addMarker(body));

      logger.info(
        { threadId: channel.id, issueNumber },
        "Synced Discord message to GitHub comment",
      );
    } catch (err) {
      logger.error(err, "Failed to sync message to GitHub");
    }
  });
}
