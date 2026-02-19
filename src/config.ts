import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

export const config = {
  discord: {
    token: required("DISCORD_TOKEN"),
    guildId: required("DISCORD_GUILD_ID"),
    forumChannelId: required("DISCORD_FORUM_CHANNEL_ID"),
  },
  github: {
    appId: required("GITHUB_APP_ID"),
    privateKey: Buffer.from(
      required("GITHUB_APP_PRIVATE_KEY"),
      "base64",
    ).toString("utf-8"),
    installationId: Number(required("GITHUB_APP_INSTALLATION_ID")),
    webhookSecret: required("GITHUB_WEBHOOK_SECRET"),
    owner: required("GITHUB_OWNER"),
    repo: required("GITHUB_REPO"),
  },
  webhookPort: Number(process.env.WEBHOOK_PORT || "3000"),
} as const;
