import { replyToMessage } from "../chat/chatEngine.js";
import { createPersonaFromText, formatPersona } from "../persona/personaService.js";
import { getPersona, resetPersona, savePersona } from "../storage/botState.js";

export async function handleTextMessage(conversationId: string, text: string): Promise<string> {
  const trimmed = text.trim();

  if (trimmed === "/帮助" || trimmed.toLowerCase() === "/help") {
    return [
      "可用指令：",
      "/人格 文字素材 - 根据文字生成聊天人格",
      "/人设 - 查看当前人格",
      "/人格重置 - 恢复默认人格"
    ].join("\n");
  }

  if (trimmed === "/人设") {
    return formatPersona(await getPersona(conversationId));
  }

  if (trimmed === "/人格重置") {
    await resetPersona(conversationId);
    return "已恢复默认人格。";
  }

  if (trimmed.startsWith("/人格 ")) {
    const source = trimmed.slice("/人格 ".length).trim();
    if (source.length < 10) {
      return "文字素材太短了。请在 /人格 后面放一段更完整的描述或聊天样本。";
    }

    const persona = await createPersonaFromText(source);
    await savePersona(conversationId, persona);
    return `人格已生成。\n\n${formatPersona(persona)}`;
  }

  return replyToMessage(conversationId, trimmed);
}
