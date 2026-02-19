import type { Client } from "discord.js";
import type Database from "better-sqlite3";
import { getThreadByIssue } from "../../storage/mappings.js";
import { logger } from "../../utils/logger.js";

interface IssueEvent {
  action: string;
  issue: {
    number: number;
    title: string;
    html_url: string;
    state: string;
    user: { login: string } | null;
  };
  sender: { login: string };
  label?: { name: string };
  assignee?: { login: string };
}

export async function handleIssueEvent(
  event: IssueEvent,
  client: Client,
  db: Database.Database,
): Promise<void> {
  const threadId = getThreadByIssue(db, event.issue.number);
  if (!threadId) return;

  const thread = await client.channels.fetch(threadId).catch(() => null);
  if (!thread || !("send" in thread)) return;

  const sender = event.sender.login;
  let message: string | null = null;

  switch (event.action) {
    case "closed":
      message = `Issue [#${event.issue.number}](${event.issue.html_url}) closed by **${sender}**`;
      break;
    case "reopened":
      message = `Issue [#${event.issue.number}](${event.issue.html_url}) reopened by **${sender}**`;
      break;
    case "labeled":
      if (event.label) {
        message = `Label \`${event.label.name}\` added by **${sender}**`;
      }
      break;
    case "unlabeled":
      if (event.label) {
        message = `Label \`${event.label.name}\` removed by **${sender}**`;
      }
      break;
    case "assigned":
      if (event.assignee) {
        message = `Issue assigned to **${event.assignee.login}** by **${sender}**`;
      }
      break;
    case "unassigned":
      if (event.assignee) {
        message = `**${event.assignee.login}** unassigned by **${sender}**`;
      }
      break;
  }

  if (message) {
    await thread.send(message);
    logger.info(
      { issueNumber: event.issue.number, action: event.action },
      "Synced issue event to Discord",
    );
  }
}
