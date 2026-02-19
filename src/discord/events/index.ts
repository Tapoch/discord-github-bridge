import type { Client } from "discord.js";
import type Database from "better-sqlite3";
import type { GitHubApp } from "../../github/app.js";
import { registerThreadCreate } from "./threadCreate.js";
import { registerMessageCreate } from "./messageCreate.js";
import { registerMessageUpdate } from "./messageUpdate.js";
import { registerMessageDelete } from "./messageDelete.js";
import { registerThreadUpdate } from "./threadUpdate.js";

export function registerDiscordEvents(
  client: Client,
  github: GitHubApp,
  db: Database.Database,
): void {
  registerThreadCreate(client, github, db);
  registerMessageCreate(client, github, db);
  registerMessageUpdate(client, github, db);
  registerMessageDelete(client, github, db);
  registerThreadUpdate(client, github, db);
}
