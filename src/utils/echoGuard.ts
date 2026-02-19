const MARKER = "<!-- discord-bridge -->";

export function addMarker(body: string): string {
  return `${body}\n${MARKER}`;
}

export function hasMarker(body: string): boolean {
  return body.includes(MARKER);
}
