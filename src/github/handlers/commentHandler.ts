import { EmbedBuilder, type Client } from "discord.js";
import type Database from "better-sqlite3";
import {
  getThreadByIssue,
  getMessageByComment,
  linkMessageToComment,
} from "../../storage/mappings.js";
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
    id: number;
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
  // Echo guard: skip comments created by the bridge itself
  if (hasMarker(event.comment.body)) return;

  const threadId = getThreadByIssue(db, event.issue.number);
  if (!threadId) return;

  const thread = await client.channels.fetch(threadId).catch(() => null);
  if (!thread || !("send" in thread)) return;

  const author = event.comment.user?.login ?? event.sender.login;
  const avatarUrl = event.comment.user?.avatar_url;

  switch (event.action) {
    case "created": {
      const embed = buildCommentEmbed(event, author, avatarUrl, 0x238636);
      const sent = await thread.send({ embeds: [embed] });
      linkMessageToComment(
        db,
        sent.id,
        event.comment.id,
        threadId,
        event.issue.number,
      );
      logger.info(
        { issueNumber: event.issue.number, commentId: event.comment.id },
        "Synced GitHub comment to Discord",
      );
      break;
    }
    case "edited": {
      const mapping = getMessageByComment(db, event.comment.id);
      if (!mapping) return;
      try {
        const channel = await client.channels
          .fetch(mapping.thread_id)
          .catch(() => null);
        if (!channel || !("messages" in channel)) return;
        const msg = await channel.messages
          .fetch(mapping.discord_message_id)
          .catch(() => null);
        if (!msg) return;
        const embed = buildCommentEmbed(event, author, avatarUrl, 0xd29922);
        await msg.edit({ embeds: [embed] });
        logger.info(
          { commentId: event.comment.id },
          "Synced GitHub comment edit to Discord",
        );
      } catch (err) {
        logger.error(err, "Failed to sync comment edit to Discord");
      }
      break;
    }
    case "deleted": {
      const mapping = getMessageByComment(db, event.comment.id);
      if (!mapping) return;
      try {
        const channel = await client.channels
          .fetch(mapping.thread_id)
          .catch(() => null);
        if (!channel || !("messages" in channel)) return;
        const msg = await channel.messages
          .fetch(mapping.discord_message_id)
          .catch(() => null);
        if (!msg) return;
        await msg.delete();
        logger.info(
          { commentId: event.comment.id },
          "Synced GitHub comment delete to Discord",
        );
      } catch (err) {
        logger.error(err, "Failed to sync comment delete to Discord");
      }
      break;
    }
  }
}

function buildCommentEmbed(
  event: CommentEvent,
  author: string,
  avatarUrl: string | undefined,
  color: number,
): EmbedBuilder {
  return new EmbedBuilder()
    .setAuthor({
      name: author,
      iconURL: avatarUrl,
      url: `https://github.com/${author}`,
    })
    .setDescription(truncate(event.comment.body, 2000))
    .setURL(event.comment.html_url)
    .setTimestamp(new Date(event.comment.created_at))
    .setColor(color);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}
