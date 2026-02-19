const MARKER = "<!-- discord-bridge -->";

export function addMarker(body: string): string {
  return `${body}\n${MARKER}`;
}

export function hasMarker(body: string): boolean {
  return body.includes(MARKER);
}

// In-memory guard to prevent echo loops when the bot itself
// archives/unarchives/renames threads via webhook handlers.
// Thread IDs are tracked temporarily and auto-cleaned after a timeout.
const botInitiatedActions = new Set<string>();

export function markBotAction(threadId: string): void {
  botInitiatedActions.add(threadId);
  setTimeout(() => botInitiatedActions.delete(threadId), 10_000);
}

export function isBotAction(threadId: string): boolean {
  if (botInitiatedActions.has(threadId)) {
    botInitiatedActions.delete(threadId);
    return true;
  }
  return false;
}
