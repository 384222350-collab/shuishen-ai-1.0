import { randomUUID } from "node:crypto";
import { chatCompletion, RelaySettings } from "../ai/openaiRelay.js";
import { config } from "../config.js";
import { Persona } from "./types.js";

const fallbackPrompt = `You are ${config.BOT_NAME}, a steady Chinese chat companion.
Reply naturally in Chinese, keep boundaries clear, and avoid pretending to be a real person.
Keep replies suitable for mobile chat: warm, specific, and not too long.`;

export function defaultPersona(): Persona {
  return {
    id: "default",
    name: "温和陪伴型",
    summary: "自然、稳定、会照顾对方情绪的聊天伙伴。",
    traits: ["温和", "耐心", "边界感", "表达清楚"],
    tone: "像熟人一样自然，简洁但不冷淡。",
    boundaries: ["不冒充真人", "不编造现实经历", "不输出危险建议"],
    replyRules: ["优先用中文", "少用列表", "每次回复控制在手机聊天适合的长度"],
    systemPrompt: fallbackPrompt,
    source: "default",
    updatedAt: new Date().toISOString()
  };
}

export async function createPersonaFromText(sourceText: string, settings: RelaySettings = {}): Promise<Persona> {
  const prompt = `Create a persona card for a Chinese chat bot based on the following text.

Return strict JSON only. Do not wrap it in Markdown.
The JSON fields must be: name, summary, traits, tone, boundaries, replyRules, systemPrompt.
traits, boundaries, and replyRules must be string arrays.
The systemPrompt must be ready to use as a chat system prompt.
The persona can be vivid, but must not encourage manipulation, deception, dependency, or unsafe behavior.

Source text:
${sourceText}`;

  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You design safe, expressive Chinese chat personas from text samples. Return concise, valid JSON."
      },
      { role: "user", content: prompt }
    ],
    0.4,
    settings
  );

  const parsed = parsePersonaJson(raw);

  return {
    id: randomUUID(),
    name: parsed.name,
    summary: parsed.summary,
    traits: parsed.traits,
    tone: parsed.tone,
    boundaries: parsed.boundaries,
    replyRules: parsed.replyRules,
    systemPrompt: parsed.systemPrompt,
    source: sourceText,
    updatedAt: new Date().toISOString()
  };
}

export async function createPersonaFromImage(
  image: Buffer,
  mimeType: string,
  settings: RelaySettings = {}
): Promise<Persona> {
  const dataUrl = `data:${mimeType};base64,${image.toString("base64")}`;
  return createPersonaFromImageUrl(dataUrl, settings);
}

export async function createPersonaFromImageUrl(imageUrl: string, settings: RelaySettings = {}): Promise<Persona> {
  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You design safe Chinese chat personas from visible image style cues. Avoid sensitive identity guesses."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Create a persona card for a Chinese chat bot based on this image.

Use only visible cues such as expression, style, scene, and mood.
Do not infer sensitive attributes such as race, religion, politics, health, or private identity.
Return strict JSON only. Do not wrap it in Markdown.
The JSON fields must be: name, summary, traits, tone, boundaries, replyRules, systemPrompt.
traits, boundaries, and replyRules must be string arrays.
The systemPrompt must be ready to use as a chat system prompt.`
          },
          {
            type: "image_url",
            image_url: { url: imageUrl }
          }
        ]
      }
    ],
    0.4,
    settings
  );

  const parsed = parsePersonaJson(raw);

  return {
    id: randomUUID(),
    name: parsed.name,
    summary: parsed.summary,
    traits: parsed.traits,
    tone: parsed.tone,
    boundaries: parsed.boundaries,
    replyRules: parsed.replyRules,
    systemPrompt: parsed.systemPrompt,
    source: imageUrl.startsWith("data:") ? "[image]" : imageUrl,
    updatedAt: new Date().toISOString()
  };
}

function parsePersonaJson(raw: string): Omit<Persona, "id" | "source" | "updatedAt"> {
  const jsonText = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const value = JSON.parse(jsonText) as Partial<Persona>;

  return {
    name: requireText(value.name, "name"),
    summary: requireText(value.summary, "summary"),
    traits: requireTextArray(value.traits, "traits"),
    tone: requireText(value.tone, "tone"),
    boundaries: requireTextArray(value.boundaries, "boundaries"),
    replyRules: requireTextArray(value.replyRules, "replyRules"),
    systemPrompt: requireText(value.systemPrompt, "systemPrompt")
  };
}

function requireText(value: unknown, key: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Persona JSON is missing field: ${key}`);
  }
  return value.trim();
}

function requireTextArray(value: unknown, key: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Persona JSON field has invalid format: ${key}`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

export function formatPersona(persona: Persona): string {
  return [
    `人格：${persona.name}`,
    `简介：${persona.summary}`,
    `特质：${persona.traits.join("、")}`,
    `语气：${persona.tone}`,
    `边界：${persona.boundaries.join("、")}`,
    `回复规则：${persona.replyRules.join("、")}`
  ].join("\n");
}
