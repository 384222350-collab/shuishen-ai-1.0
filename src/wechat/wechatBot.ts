import qrcodeTerminal from "qrcode-terminal";
import QRCode from "qrcode";
import { types, WechatyBuilder } from "wechaty";
import { config } from "../config.js";
import { emitBotEvent } from "../events/botEvents.js";
import { setManagedBotState } from "../bots/botManager.js";
import { createPersonaFromImage, formatPersona } from "../persona/personaService.js";
import { savePersona } from "../storage/botState.js";
import { handleTextMessage } from "./messageRouter.js";

interface WechatImageMessage {
  say(text: string): Promise<unknown>;
  toFileBox(): Promise<{
    name: string;
    toBuffer(): Promise<Buffer>;
  }>;
}

export async function startWechatBot(): Promise<void> {
  const bot = WechatyBuilder.build({
    name: "shuishen-persona-bot"
  });

  bot.on("scan", async (qrcode, status) => {
    const qrDataUrl = await QRCode.toDataURL(qrcode, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320
    });

    emitBotEvent({
      type: "status",
      platform: "wechat",
      title: "Wechat scan required",
      text: `Scan status: ${status}`,
      payload: {
        status,
        qrcode,
        qrDataUrl
      }
    });
    // Mark as starting so UI knows it's waiting for scan
    try {
      setManagedBotState("wechat", "starting");
    } catch {}
    console.log(`Wechat scan status: ${status}`);
    qrcodeTerminal.generate(qrcode, { small: true });
  });

  bot.on("login", (user) => {
    emitBotEvent({
      type: "status",
      platform: "wechat",
      title: "Wechat logged in",
      text: user.name(),
      payload: {
        loggedIn: true
      }
    });
    console.log(`Wechat logged in: ${user.name()}`);
    try {
      setManagedBotState("wechat", "running");
    } catch {}
  });

  bot.on("logout", (user) => {
    emitBotEvent({
      type: "status",
      platform: "wechat",
      title: "Wechat logged out",
      text: user.name(),
      payload: {
        loggedIn: false
      }
    });
    console.log(`Wechat logged out: ${user.name()}`);
    try {
      setManagedBotState("wechat", "stopped");
    } catch {}
  });

  bot.on("message", async (message) => {
    try {
      if (message.self()) {
        return;
      }

      const room = message.room();
      if (room && !config.BOT_REPLY_GROUPS) {
        emitBotEvent({
          type: "status",
          platform: "wechat",
          conversationId: room ? `room:${room.id}` : undefined,
          title: "Group message ignored",
          text: "BOT_REPLY_GROUPS is false"
        });
        return;
      }

      if (room && config.BOT_GROUP_MENTION_ONLY) {
        const mentioned = await message.mentionSelf();
        if (!mentioned) {
          emitBotEvent({
            type: "status",
            platform: "wechat",
            conversationId: room ? `room:${room.id}` : undefined,
            title: "Group message ignored",
            text: "BOT_GROUP_MENTION_ONLY is true and bot not mentioned"
          });
          return;
        }
      }

      const conversationId = room ? `room:${room.id}` : `contact:${message.talker().id}`;

      if (message.type() === types.Message.Image) {
        await handleImageMessage(message, conversationId);
        return;
      }

      if (message.type() !== types.Message.Text) {
        return;
      }

      const rawText = message.text();
      const text = room ? (await message.mentionText()) || rawText : rawText;
      if (!text.trim()) {
        return;
      }

      emitBotEvent({
        type: "message.in",
        platform: "wechat",
        conversationId,
        title: room ? `Wechat room ${room.id}` : `Wechat contact ${message.talker().id}`,
        text
      });

      const answer = await handleTextMessage(conversationId, text);
      await message.say(answer);

      emitBotEvent({
        type: "message.out",
        platform: "wechat",
        conversationId,
        title: "Wechat reply sent",
        text: answer
      });
    } catch (error) {
      emitBotEvent({
        type: "error",
        platform: "wechat",
        title: "Wechat message failed",
        text: (error as Error).message
      });
      console.error(error);
      await message.say(`我这边出错了：${(error as Error).message}`);
    }
  });

  await bot.start();
}

async function handleImageMessage(message: WechatImageMessage, conversationId: string): Promise<void> {
  emitBotEvent({
    type: "message.in",
    platform: "wechat",
    conversationId,
    title: "Wechat image received",
    text: "[image]"
  });

  if (!config.ENABLE_IMAGE_PERSONA) {
    await message.say("已收到图片。当前没有开启图片人格提取，请在 .env 设置 ENABLE_IMAGE_PERSONA=true，并确认中转模型支持视觉输入。");
    return;
  }

  const fileBox = await message.toFileBox();
  const image = await fileBox.toBuffer();
  const persona = await createPersonaFromImage(image, inferMimeType(fileBox.name));
  await savePersona(conversationId, persona);
  const answer = `已根据图片生成人格。\n\n${formatPersona(persona)}`;
  await message.say(answer);

  emitBotEvent({
    type: "persona.applied",
    platform: "wechat",
    conversationId,
    title: "Image persona applied",
    text: persona.name,
    payload: persona
  });
}

function inferMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  return "image/jpeg";
}
