import type { Collection, Attachment } from "discord.js";

export function formatAttachments(
  attachments: Collection<string, Attachment>,
): string {
  if (attachments.size === 0) return "";

  const lines = attachments.map((att) => {
    if (att.contentType?.startsWith("image/")) {
      return `![${att.name}](${att.url})`;
    }
    return `[${att.name}](${att.url})`;
  });

  return "\n\n" + Array.from(lines.values()).join("\n");
}
