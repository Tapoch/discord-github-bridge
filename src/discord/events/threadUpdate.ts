import { type Client, type AnyThreadChannel, Events } from "discord.js";
import type Database from "better-sqlite3";
import { config } from "../../config.js";
import type { GitHubApp } from "../../github/app.js";
import { closeIssue, updateIssueTitle } from "../../github/issues.js";
import { getIssueByThread } from "../../storage/mappings.js";
import { addMarker, isBotAction } from "../../utils/echoGuard.js";
import { logger } from "../../utils/logger.js";

export function registerThreadUpdate(
  client: Client,
  github: GitHubApp,
  db: Database.Database,
): void {
  client.on(
    Events.ThreadUpdate,
    async (oldThread: AnyThreadChannel, thread: AnyThreadChannel) => {
      if (thread.parentId !== config.discord.forumChannelId) return;
      if (isBotAction(thread.id)) return;

      const issueNumber = getIssueByThread(db, thread.id);
      if (!issueNumber) return;

      try {
        const wasArchived = oldThread.archived;
        const isArchived = thread.archived;
        if (!wasArchived && isArchived) {
          await closeIssue(
            github,
            issueNumber,
            addMarker("Thread archived in Discord — closing issue."),
          );

          logger.info(
            { threadId: thread.id, issueNumber },
            "Closed issue due to thread archival",
          );
        }

        if (oldThread.name !== thread.name) {
          await updateIssueTitle(github, issueNumber, thread.name);
          logger.info(
            { threadId: thread.id, issueNumber, title: thread.name },
            "Synced thread rename to GitHub issue title",
          );
        }
      } catch (err) {
        logger.error(err, "Failed to sync thread update to GitHub");
      }
    },
  );
}
