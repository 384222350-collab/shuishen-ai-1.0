import { OneBotMessageEvent, OneBotMessagePart, NormalizedQqMessage } from "./onebotTypes.js";

export function normalizeOneBotMessage(event: OneBotMessageEvent): NormalizedQqMessage {
  const parts = Array.isArray(event.message) ? event.message : parseCqMessage(event.message);
  const selfId = event.self_id?.toString();
  const textParts: string[] = [];
  const imageUrls: string[] = [];
  let mentionedSelf = false;

  for (const part of parts) {
    if (part.type === "text") {
      textParts.push(part.data.text ?? "");
      continue;
    }

    if (part.type === "at") {
      // Some OneBot implementations may use different keys or numeric ids.
      const qqValue = (part.data as Record<string, unknown>).qq ?? (part.data as Record<string, unknown>).user_id;
      const qqStr = qqValue !== undefined ? String(qqValue) : undefined;
      if (selfId && qqStr === selfId) {
        mentionedSelf = true;
      }
      continue;
    }

    if (part.type === "image" && part.data.url) {
      imageUrls.push(part.data.url);
    }
  }

  return {
    conversationId:
      event.message_type === "group" && event.group_id
        ? `qq-group:${event.group_id}`
        : `qq-private:${event.user_id}`,
    messageType: event.message_type,
    userId: event.user_id,
    groupId: event.group_id,
    text: textParts.join("").trim(),
    imageUrls,
    mentionedSelf
  };
}

function parseCqMessage(message: string): OneBotMessagePart[] {
  const parts: OneBotMessagePart[] = [];
  const pattern = /\[CQ:([a-zA-Z0-9_-]+)((?:,[^\]]+)*)\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(message))) {
    if (match.index > cursor) {
      parts.push({ type: "text", data: { text: decodeCqText(message.slice(cursor, match.index)) } });
    }

    parts.push({
      type: match[1],
      data: parseCqData(match[2] ?? "")
    });
    cursor = pattern.lastIndex;
  }

  if (cursor < message.length) {
    parts.push({ type: "text", data: { text: decodeCqText(message.slice(cursor)) } });
  }

  return parts;
}

function parseCqData(raw: string): Record<string, string> {
  const data: Record<string, string> = {};
  const fields = raw.replace(/^,/, "").split(",");

  for (const field of fields) {
    if (!field) {
      continue;
    }
    const separator = field.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = field.slice(0, separator);
    const value = field.slice(separator + 1);
    data[key] = decodeCqText(value);
  }

  return data;
}

function decodeCqText(text: string): string {
  return text
    .replace(/&#91;/g, "[")
    .replace(/&#93;/g, "]")
    .replace(/&#44;/g, ",")
    .replace(/&amp;/g, "&");
}
