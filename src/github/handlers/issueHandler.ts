import {
  type Client,
  type AnyThreadChannel,
  ChannelType,
  type ForumChannel,
} from "discord.js";
import type Database from "better-sqlite3";
import { config } from "../../config.js";
import { getThreadByIssue } from "../../storage/mappings.js";
import { markBotAction } from "../../utils/echoGuard.js";
import { logger } from "../../utils/logger.js";

interface IssueEvent {
  action: string;
  issue: {
    number: number;
    title: string;
    html_url: string;
    state: string;
    labels: Array<{ name: string }>;
    user: { login: string } | null;
  };
  sender: { login: string };
  label?: { name: string };
  assignee?: { login: string };
  milestone?: { title: string; html_url: string } | null;
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
  let archiveAfterMessage = false;

  switch (event.action) {
    case "closed":
      message = `Issue [#${event.issue.number}](${event.issue.html_url}) closed by **${sender}**`;
      archiveAfterMessage = true;
      break;
    case "reopened":
      message = `Issue [#${event.issue.number}](${event.issue.html_url}) reopened by **${sender}**`;
      await unarchiveThread(thread, threadId);
      break;
    case "edited":
      await renameThread(thread, event.issue.title);
      break;
    case "labeled":
    case "unlabeled":
      if (event.label) {
        message =
          event.action === "labeled"
            ? `Label \`${event.label.name}\` added by **${sender}**`
            : `Label \`${event.label.name}\` removed by **${sender}**`;
      }
      await syncLabelsToTags(thread, event.issue.labels, client);
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
    case "milestoned":
      if (event.milestone) {
        message = `Added to milestone [${event.milestone.title}](${event.milestone.html_url}) by **${sender}**`;
      }
      break;
    case "demilestoned":
      message = `Removed from milestone by **${sender}**`;
      break;
  }

  if (message) {
    await thread.send(message);
    logger.info(
      { issueNumber: event.issue.number, action: event.action },
      "Synced issue event to Discord",
    );
  }

  // Sending a message to an archived thread can auto-unarchive it, so archive after notification.
  if (archiveAfterMessage) {
    await archiveThread(thread, threadId);
  }
}

async function archiveThread(
  thread: unknown,
  threadId: string,
): Promise<void> {
  if (!isThread(thread)) return;
  if (thread.archived) return;
  try {
    markBotAction(threadId);
    await thread.setArchived(true);
    logger.info({ threadId }, "Thread archived (issue closed)");
  } catch (err) {
    logger.error(err, "Failed to archive thread");
  }
}

async function unarchiveThread(
  thread: unknown,
  threadId: string,
): Promise<void> {
  if (!isThread(thread)) return;
  if (!thread.archived) return;
  try {
    markBotAction(threadId);
    await thread.setArchived(false);
    logger.info({ threadId }, "Thread unarchived (issue reopened)");
  } catch (err) {
    logger.error(err, "Failed to unarchive thread");
  }
}

async function renameThread(
  thread: unknown,
  newTitle: string,
): Promise<void> {
  if (!isThread(thread)) return;
  if (thread.name === newTitle) return;
  try {
    await thread.setName(newTitle);
    logger.info(
      { threadId: thread.id, newTitle },
      "Thread renamed (issue edited)",
    );
  } catch (err) {
    logger.error(err, "Failed to rename thread");
  }
}

async function syncLabelsToTags(
  thread: unknown,
  issueLabels: Array<{ name: string }>,
  client: Client,
): Promise<void> {
  if (!isThread(thread)) return;
  if (thread.parentId !== config.discord.forumChannelId) return;

  try {
    const forumChannel = (await client.channels.fetch(
      config.discord.forumChannelId,
    )) as ForumChannel | null;
    if (!forumChannel || !("availableTags" in forumChannel)) return;

    const labelNames = new Set(issueLabels.map((l) => l.name.toLowerCase()));

    const newTags = forumChannel.availableTags
      .filter((tag) => labelNames.has(tag.name.toLowerCase()))
      .map((tag) => tag.id);

    // Discord allows max 5 tags per thread
    const tagsToApply = newTags.slice(0, 5);

    const currentTags = [...thread.appliedTags].sort().join(",");
    const nextTags = [...tagsToApply].sort().join(",");
    if (currentTags === nextTags) return;

    await thread.setAppliedTags(tagsToApply);
    logger.info(
      { threadId: thread.id, tags: tagsToApply },
      "Thread tags synced from GitHub labels",
    );
  } catch (err) {
    logger.error(err, "Failed to sync labels to thread tags");
  }
}

function isThread(channel: unknown): channel is AnyThreadChannel {
  return (
    typeof channel === "object" &&
    channel !== null &&
    "type" in channel &&
    ((channel as any).type === ChannelType.PublicThread ||
      (channel as any).type === ChannelType.PrivateThread)
  );
}
