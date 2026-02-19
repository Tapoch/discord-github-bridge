import type Database from "better-sqlite3";

export interface ThreadIssueMapping {
  thread_id: string;
  issue_number: number;
  created_at: string;
}

export function linkThreadToIssue(
  db: Database.Database,
  threadId: string,
  issueNumber: number,
): void {
  db.prepare(
    "INSERT OR REPLACE INTO thread_issue_map (thread_id, issue_number) VALUES (?, ?)",
  ).run(threadId, issueNumber);
}

export function getIssueByThread(
  db: Database.Database,
  threadId: string,
): number | null {
  const row = db
    .prepare("SELECT issue_number FROM thread_issue_map WHERE thread_id = ?")
    .get(threadId) as { issue_number: number } | undefined;
  return row?.issue_number ?? null;
}

export function getThreadByIssue(
  db: Database.Database,
  issueNumber: number,
): string | null {
  const row = db
    .prepare("SELECT thread_id FROM thread_issue_map WHERE issue_number = ?")
    .get(issueNumber) as { thread_id: string } | undefined;
  return row?.thread_id ?? null;
}

export function unlinkThread(
  db: Database.Database,
  threadId: string,
): void {
  db.prepare("DELETE FROM thread_issue_map WHERE thread_id = ?").run(threadId);
}

// --- Message <-> Comment mappings ---

export function linkMessageToComment(
  db: Database.Database,
  discordMessageId: string,
  githubCommentId: number,
  threadId: string,
  issueNumber: number,
): void {
  db.prepare(
    "INSERT OR REPLACE INTO message_comment_map (discord_message_id, github_comment_id, thread_id, issue_number) VALUES (?, ?, ?, ?)",
  ).run(discordMessageId, githubCommentId, threadId, issueNumber);
}

export function getCommentByMessage(
  db: Database.Database,
  discordMessageId: string,
): { github_comment_id: number; issue_number: number } | null {
  const row = db
    .prepare(
      "SELECT github_comment_id, issue_number FROM message_comment_map WHERE discord_message_id = ?",
    )
    .get(discordMessageId) as
    | { github_comment_id: number; issue_number: number }
    | undefined;
  return row ?? null;
}

export function getMessageByComment(
  db: Database.Database,
  githubCommentId: number,
): { discord_message_id: string; thread_id: string } | null {
  const row = db
    .prepare(
      "SELECT discord_message_id, thread_id FROM message_comment_map WHERE github_comment_id = ?",
    )
    .get(githubCommentId) as
    | { discord_message_id: string; thread_id: string }
    | undefined;
  return row ?? null;
}

export function unlinkMessage(
  db: Database.Database,
  discordMessageId: string,
): void {
  db.prepare(
    "DELETE FROM message_comment_map WHERE discord_message_id = ?",
  ).run(discordMessageId);
}
