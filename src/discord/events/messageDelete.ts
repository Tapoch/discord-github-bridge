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
import { deleteComment } from "../../github/issues.js";
import {
  getCommentByMessage,
  unlinkMessage,
} from "../../storage/mappings.js";
import { logger } from "../../utils/logger.js";

export function registerMessageDelete(
  client: Client,
  github: GitHubApp,
  db: Database.Database,
): void {
  client.on(
    Events.MessageDelete,
    async (message: Message | PartialMessage) => {
      const channel = message.channel;
      if (
        channel.type !== ChannelType.PublicThread ||
        channel.parentId !== config.discord.forumChannelId
      ) {
        return;
      }

      const mapping = getCommentByMessage(db, message.id);
      if (!mapping) return;

      try {
        await deleteComment(github, mapping.github_comment_id);
        unlinkMessage(db, message.id);

        logger.info(
          { messageId: message.id, commentId: mapping.github_comment_id },
          "Synced Discord message delete to GitHub comment",
        );
      } catch (err) {
        logger.error(err, "Failed to sync message delete to GitHub");
      }
    },
  );
}
