import {
  type Client,
  type Message,
  type PartialMessage,
  ChannelType,
  Events,
} from "discord.js";
import type Database from "better-sqlite3";
import { config } from "../../config.js";
import type { GitHubApp } from "../../github/app.js";
import { editComment, updateIssueBody } from "../../github/issues.js";
import {
  getIssueByThread,
  getCommentByMessage,
} from "../../storage/mappings.js";
import { addMarker } from "../../utils/echoGuard.js";
import { formatAttachments } from "../../utils/attachments.js";
import { logger } from "../../utils/logger.js";

export function registerMessageUpdate(
  client: Client,
  github: GitHubApp,
  db: Database.Database,
): void {
  client.on(
    Events.MessageUpdate,
    async (_old: Message | PartialMessage, newMsg: Message | PartialMessage) => {
      const message = newMsg.partial ? await newMsg.fetch().catch(() => null) : newMsg;
      if (!message) return;
      if (message.author.bot) return;

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
        // Check if this is the starter message (first message = issue body)
        const isStarterMessage = message.id === channel.id;

        if (isStarterMessage) {
          const body =
            (message.content || "*No description*") +
            formatAttachments(message.attachments);

          await updateIssueBody(github, issueNumber, addMarker(body));

          logger.info(
            { threadId: channel.id, issueNumber },
            "Synced starter message edit to issue body",
          );
        } else {
          // Regular message → edit GitHub comment
          const mapping = getCommentByMessage(db, message.id);
          if (!mapping) return;

          const body =
            `**${message.author.displayName}** commented:\n\n` +
            (message.content || "") +
            formatAttachments(message.attachments);

          await editComment(github, mapping.github_comment_id, addMarker(body));

          logger.info(
            { threadId: channel.id, commentId: mapping.github_comment_id },
            "Synced Discord message edit to GitHub comment",
          );
        }
      } catch (err) {
        logger.error(err, "Failed to sync message edit to GitHub");
      }
    },
  );
}
