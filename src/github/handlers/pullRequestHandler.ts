import type { Client } from "discord.js";
import type Database from "better-sqlite3";
import { getThreadByIssue } from "../../storage/mappings.js";
import { logger } from "../../utils/logger.js";

interface PullRequestEvent {
  action: string;
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    body: string | null;
    user: { login: string } | null;
    merged: boolean;
  };
  sender: { login: string };
}

// Matches "Fixes #123", "Closes #456", "Resolves #789" etc.
const ISSUE_REF_PATTERN =
  /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;

export async function handlePullRequestEvent(
  event: PullRequestEvent,
  client: Client,
  db: Database.Database,
): Promise<void> {
  if (event.action !== "opened" && event.action !== "closed") return;

  const pr = event.pull_request;
  const body = pr.body ?? "";
  const title = pr.title;
  const textToScan = `${title} ${body}`;

  // Find all referenced issue numbers
  const referencedIssues = new Set<number>();
  let match: RegExpExecArray | null;
  while ((match = ISSUE_REF_PATTERN.exec(textToScan)) !== null) {
    referencedIssues.add(Number(match[1]));
  }

  if (referencedIssues.size === 0) return;

  const sender = event.sender.login;

  for (const issueNumber of referencedIssues) {
    const threadId = getThreadByIssue(db, issueNumber);
    if (!threadId) continue;

    const thread = await client.channels.fetch(threadId).catch(() => null);
    if (!thread || !("send" in thread)) continue;

    let message: string;
    if (event.action === "opened") {
      message = `PR [#${pr.number} ${pr.title}](${pr.html_url}) opened by **${sender}** references this issue`;
    } else if (event.action === "closed" && pr.merged) {
      message = `PR [#${pr.number} ${pr.title}](${pr.html_url}) merged by **${sender}**`;
    } else {
      message = `PR [#${pr.number} ${pr.title}](${pr.html_url}) closed by **${sender}**`;
    }

    await thread.send(message);
    logger.info(
      { issueNumber, prNumber: pr.number, action: event.action },
      "Synced PR event to Discord",
    );
  }
}
