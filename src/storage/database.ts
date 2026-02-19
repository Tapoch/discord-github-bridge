import Database from "better-sqlite3";
import path from "node:path";
import { logger } from "../utils/logger.js";

const DB_PATH = path.resolve("data", "bridge.db");

export function initDatabase(): Database.Database {
  const db = new Database(DB_PATH);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS thread_issue_map (
      thread_id TEXT PRIMARY KEY,
      issue_number INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS message_comment_map (
      discord_message_id TEXT PRIMARY KEY,
      github_comment_id INTEGER NOT NULL,
      thread_id TEXT NOT NULL,
      issue_number INTEGER NOT NULL
    )
  `);

  logger.info("Database initialized");
  return db;
}
