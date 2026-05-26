import { chatCompletion, ChatMessage } from "../ai/openaiRelay.js";
import { appendHistory, getHistory, getPersona } from "../storage/botState.js";

export async function replyToMessage(conversationId: string, userText: string): Promise<string> {
  const persona = await getPersona(conversationId);
  const history = await getHistory(conversationId);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${persona.systemPrompt}

当前人格摘要：
${persona.summary}

回复要求：
- 你正在微信里聊天，语言要自然。
- 不要每次都自称机器人。
- 回复长度尽量适合手机阅读。
- 如果用户只是闲聊，直接接话，不要过度分析。`
    },
    ...history.map((item) => ({ role: item.role, content: item.content }) satisfies ChatMessage),
    { role: "user", content: userText }
  ];

  const answer = await chatCompletion(messages, 0.8);

  await appendHistory(conversationId, { role: "user", content: userText });
  await appendHistory(conversationId, { role: "assistant", content: answer });

  return answer;
}
