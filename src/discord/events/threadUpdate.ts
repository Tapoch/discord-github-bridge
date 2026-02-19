import { type Client, type AnyThreadChannel, Events } from "discord.js";
import type Database from "better-sqlite3";
import { config } from "../../config.js";
import type { GitHubApp } from "../../github/app.js";
import { closeIssue } from "../../github/issues.js";
import { getIssueByThread } from "../../storage/mappings.js";
import { addMarker } from "../../utils/echoGuard.js";
import { logger } from "../../utils/logger.js";

export function registerThreadUpdate(
  client: Client,
  github: GitHubApp,
  db: Database.Database,
): void {
  client.on(
    Events.ThreadUpdate,
    async (_old: AnyThreadChannel, thread: AnyThreadChannel) => {
      if (thread.parentId !== config.discord.forumChannelId) return;
      if (!thread.archived) return;

      const issueNumber = getIssueByThread(db, thread.id);
      if (!issueNumber) return;

      try {
        await closeIssue(
          github,
          issueNumber,
          addMarker("Thread archived in Discord — closing issue."),
        );

        logger.info(
          { threadId: thread.id, issueNumber },
          "Closed issue due to thread archival",
        );
      } catch (err) {
        logger.error(err, "Failed to close issue on thread archive");
      }
    },
  );
}
