import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { config } from "../config.js";
import { emitBotEvent } from "../events/botEvents.js";
import { createPersonaFromImageUrl, formatPersona } from "../persona/personaService.js";
import { savePersona } from "../storage/botState.js";
import { handleTextMessage } from "../wechat/messageRouter.js";
import { sendGroupMessage, sendPrivateMessage } from "./onebotClient.js";
import { normalizeOneBotMessage } from "./onebotMessage.js";
import { OneBotMessageEvent } from "./onebotTypes.js";

export async function startQqBot(): Promise<void> {
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "POST") {
        sendJson(response, 200, { ok: true, message: "QQ OneBot webhook is running." });
        return;
      }

      const event = await readJson<Partial<OneBotMessageEvent>>(request);
      if (event.post_type !== "message" || !event.message_type || !event.message) {
        sendJson(response, 204, {});
        return;
      }

      void handleOneBotMessage(event as OneBotMessageEvent).catch((error) => {
        emitBotEvent({
          type: "error",
          platform: "qq",
          title: "QQ message failed",
          text: (error as Error).message
        });
        console.error("QQ message failed:", error);
      });

      sendJson(response, 200, { ok: true });
    } catch (error) {
      emitBotEvent({
        type: "error",
        platform: "qq",
        title: "QQ webhook failed",
        text: (error as Error).message
      });
      console.error("QQ webhook failed:", error);
      sendJson(response, 500, { ok: false, error: (error as Error).message });
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(config.QQ_LISTEN_PORT, config.QQ_LISTEN_HOST, resolve);
  });

  emitBotEvent({
    type: "status",
    platform: "qq",
    title: "QQ OneBot webhook started",
    text: `http://${config.QQ_LISTEN_HOST}:${config.QQ_LISTEN_PORT}`
  });
  console.log(`QQ OneBot webhook is running at http://${config.QQ_LISTEN_HOST}:${config.QQ_LISTEN_PORT}`);
}

async function handleOneBotMessage(event: OneBotMessageEvent): Promise<void> {
  const message = normalizeOneBotMessage(event);

  if (message.messageType === "group" && !config.BOT_REPLY_GROUPS) {
    emitBotEvent({
      type: "status",
      platform: "qq",
      conversationId: message.conversationId,
      title: "Group message ignored",
      text: "BOT_REPLY_GROUPS is false"
    });
    return;
  }

  if (message.messageType === "group" && config.BOT_GROUP_MENTION_ONLY && !message.mentionedSelf) {
    emitBotEvent({
      type: "status",
      platform: "qq",
      conversationId: message.conversationId,
      title: "Group message ignored",
      text: "BOT_GROUP_MENTION_ONLY is true and bot not mentioned"
    });
    return;
  }

  emitBotEvent({
    type: "message.in",
    platform: "qq",
    conversationId: message.conversationId,
    title: `${message.messageType} from ${message.userId}`,
    text: message.text || `[image] ${message.imageUrls[0] ?? ""}`
  });

  let answer: string | undefined;

  if (message.imageUrls.length > 0 && config.ENABLE_IMAGE_PERSONA) {
    const persona = await createPersonaFromImageUrl(message.imageUrls[0]);
    await savePersona(message.conversationId, persona);
    answer = `已根据图片生成人格。\n\n${formatPersona(persona)}`;
  } else if (message.imageUrls.length > 0 && !message.text) {
    answer = "已收到图片。当前没有开启图片人格提取，请在 .env 设置 ENABLE_IMAGE_PERSONA=true，并确认中转模型支持视觉输入。";
  } else if (message.text) {
    answer = await handleTextMessage(message.conversationId, message.text);
  }

  if (!answer) {
    return;
  }

  if (message.messageType === "group" && message.groupId) {
    await sendGroupMessage(message.groupId, answer);
  } else {
    await sendPrivateMessage(message.userId, answer);
  }

  emitBotEvent({
    type: "message.out",
    platform: "qq",
    conversationId: message.conversationId,
    title: "QQ reply sent",
    text: answer
  });
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
