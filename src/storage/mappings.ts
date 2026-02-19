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
