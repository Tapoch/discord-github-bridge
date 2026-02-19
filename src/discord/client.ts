import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
} from "discord.js";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

const requiredChannelPermissions = [
  { flag: PermissionFlagsBits.ViewChannel, name: "ViewChannel" },
  {
    flag: PermissionFlagsBits.ReadMessageHistory,
    name: "ReadMessageHistory",
  },
  {
    flag: PermissionFlagsBits.SendMessagesInThreads,
    name: "SendMessagesInThreads",
  },
  { flag: PermissionFlagsBits.ManageThreads, name: "ManageThreads" },
  { flag: PermissionFlagsBits.ManageMessages, name: "ManageMessages" },
] as const;

export function createDiscordClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, async (c) => {
    logger.info(`Discord bot ready as ${c.user.tag}`);
    await validateChannelSetup(c);
  });

  return client;
}

export async function loginDiscord(client: Client): Promise<void> {
  await client.login(config.discord.token);
}

async function validateChannelSetup(client: Client): Promise<void> {
  try {
    const channel = await client.channels.fetch(config.discord.forumChannelId);

    if (!channel) {
      logger.warn(
        { forumChannelId: config.discord.forumChannelId },
        "Configured DISCORD_FORUM_CHANNEL_ID was not found",
      );
      return;
    }

    if (
      channel.type !== ChannelType.GuildForum &&
      channel.type !== ChannelType.GuildText
    ) {
      logger.warn(
        {
          forumChannelId: config.discord.forumChannelId,
          channelType: channel.type,
        },
        "Configured DISCORD_FORUM_CHANNEL_ID is not a forum/text channel",
      );
    }

    if (!("guild" in channel) || !("permissionsFor" in channel)) {
      logger.warn(
        { forumChannelId: config.discord.forumChannelId },
        "Configured channel does not support guild permission checks",
      );
      return;
    }

    const me = await channel.guild.members.fetchMe().catch(() => null);
    if (!me) {
      logger.warn(
        { forumChannelId: config.discord.forumChannelId },
        "Unable to fetch bot member for permission check",
      );
      return;
    }

    const perms = channel.permissionsFor(me);
    if (!perms) {
      logger.warn(
        { forumChannelId: config.discord.forumChannelId },
        "Unable to resolve channel permissions for bot",
      );
      return;
    }

    const missing = requiredChannelPermissions
      .filter((p) => !perms.has(p.flag))
      .map((p) => p.name);

    if (missing.length > 0) {
      logger.warn(
        {
          forumChannelId: config.discord.forumChannelId,
          missingPermissions: missing,
        },
        "Bot is missing required channel permissions",
      );
      return;
    }

    logger.info(
      {
        forumChannelId: config.discord.forumChannelId,
        channelType: channel.type,
      },
      "Discord channel setup validated",
    );
  } catch (err) {
    logger.warn({ err }, "Failed to validate Discord channel setup");
  }
}
