import { EmbedBuilder, type Client } from "discord.js";
import type Database from "better-sqlite3";
import { getThreadByIssue } from "../../storage/mappings.js";
import { hasMarker } from "../../utils/echoGuard.js";
import { logger } from "../../utils/logger.js";

interface CommentEvent {
  action: string;
  issue: {
    number: number;
    title: string;
    html_url: string;
  };
  comment: {
    body: string;
    html_url: string;
    user: { login: string; avatar_url: string } | null;
    created_at: string;
  };
  sender: { login: string };
}

export async function handleCommentEvent(
  event: CommentEvent,
  client: Client,
  db: Database.Database,
): Promise<void> {
  if (event.action !== "created") return;

  // Echo guard: skip comments created by the bridge itself
  if (hasMarker(event.comment.body)) return;

  const threadId = getThreadByIssue(db, event.issue.number);
  if (!threadId) return;

  const thread = await client.channels.fetch(threadId).catch(() => null);
  if (!thread || !("send" in thread)) return;

  const author = event.comment.user?.login ?? event.sender.login;
  const avatarUrl = event.comment.user?.avatar_url;

  const embed = new EmbedBuilder()
    .setAuthor({
      name: author,
      iconURL: avatarUrl,
      url: `https://github.com/${author}`,
    })
    .setDescription(truncate(event.comment.body, 2000))
    .setURL(event.comment.html_url)
    .setTimestamp(new Date(event.comment.created_at))
    .setColor(0x238636);

  await thread.send({ embeds: [embed] });

  logger.info(
    { issueNumber: event.issue.number },
    "Synced GitHub comment to Discord",
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}
