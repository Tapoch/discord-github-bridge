import {
  type AnyThreadChannel,
  type Client,
  ChannelType,
  Events,
} from "discord.js";
import type Database from "better-sqlite3";
import { config } from "../../config.js";
import type { GitHubApp } from "../../github/app.js";
import { createIssue } from "../../github/issues.js";
import { linkThreadToIssue } from "../../storage/mappings.js";
import { addMarker } from "../../utils/echoGuard.js";
import { formatAttachments } from "../../utils/attachments.js";
import { logger } from "../../utils/logger.js";

export function registerThreadCreate(
  client: Client,
  github: GitHubApp,
  db: Database.Database,
): void {
  client.on(Events.ThreadCreate, async (thread: AnyThreadChannel, newly) => {
    if (!newly) return;
    if (thread.parentId !== config.discord.forumChannelId) {
      logger.warn(
        {
          threadId: thread.id,
          parentId: thread.parentId,
          expectedParentId: config.discord.forumChannelId,
        },
        "ThreadCreate ignored: parentId does not match DISCORD_FORUM_CHANNEL_ID",
      );
      return;
    }
    if (thread.type !== ChannelType.PublicThread) {
      logger.warn(
        { threadId: thread.id, threadType: thread.type },
        "ThreadCreate ignored: only PublicThread is supported",
      );
      return;
    }

    try {
      logger.info(
        { threadId: thread.id, parentId: thread.parentId },
        "Creating GitHub issue from Discord thread",
      );

      const starterMessage = await thread.fetchStarterMessage();
      if (!starterMessage) {
        logger.warn({ threadId: thread.id }, "No starter message found");
        return;
      }

      // Map forum tags to GitHub labels
      const forumChannel = thread.parent;
      const labels: string[] = [];
      if (forumChannel && "availableTags" in forumChannel) {
        for (const tagId of thread.appliedTags) {
          const tag = forumChannel.availableTags.find((t) => t.id === tagId);
          if (tag) labels.push(tag.name);
        }
      }

      const body =
        (starterMessage.content || "*No description*") +
        formatAttachments(starterMessage.attachments);

      const issue = await createIssue(
        github,
        thread.name,
        addMarker(body),
        labels.length > 0 ? labels : undefined,
      );

      linkThreadToIssue(db, thread.id, issue.number);

      await thread.send(
        `Issue created: [#${issue.number}](${issue.html_url})`,
      );

      logger.info(
        { threadId: thread.id, issueNumber: issue.number },
        "Thread linked to issue",
      );
    } catch (err) {
      logger.error(
        {
          err,
          threadId: thread.id,
          parentId: thread.parentId,
        },
        "Failed to create issue from thread",
      );
      await thread
        .send("Failed to create GitHub issue. Please try again later.")
        .catch(() => {});
    }
  });
}
