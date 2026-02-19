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

  logger.info("Database initialized");
  return db;
}
