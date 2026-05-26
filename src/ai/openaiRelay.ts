import { config } from "../config.js";

export type ChatRole = "system" | "user" | "assistant";
export type MessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export interface ChatMessage {
  role: ChatRole;
  content: MessageContent;
}

export interface RelaySettings {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

let runtimeRelaySettings: Required<RelaySettings> = {
  baseUrl: config.OPENAI_BASE_URL ?? "",
  apiKey: config.OPENAI_API_KEY ?? "",
  model: config.OPENAI_MODEL
};

export function getRelaySettings(): Required<RelaySettings> {
  return { ...runtimeRelaySettings };
}

export function setRelaySettings(settings: RelaySettings): void {
  if (settings.baseUrl) {
    runtimeRelaySettings.baseUrl = settings.baseUrl;
  }
  if (settings.apiKey) {
    runtimeRelaySettings.apiKey = settings.apiKey;
  }
  if (settings.model) {
    runtimeRelaySettings.model = settings.model;
  }
}

interface RelayChoice {
  message?: {
    content?: string;
  };
}

interface RelayResponse {
  choices?: RelayChoice[];
  error?: {
    message?: string;
  };
}

export async function chatCompletion(
  messages: ChatMessage[],
  temperature = 0.7,
  settings: RelaySettings = {}
): Promise<string> {
  const baseUrl = settings.baseUrl ?? runtimeRelaySettings.baseUrl;
  const apiKey = settings.apiKey ?? runtimeRelaySettings.apiKey;
  const model = settings.model ?? runtimeRelaySettings.model;

  if (!baseUrl || !apiKey) {
    throw new Error("Missing relay API settings. Please provide Base URL and API Key.");
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature
      })
    });
  } catch (error) {
    throw new Error(
      `Could not connect to relay API at ${endpoint}. Check the Base URL, network, and whether the URL should end with /v1.`
    );
  }

  const payload = (await response.json().catch(() => ({}))) as RelayResponse;

  if (!response.ok) {
    const detail = payload.error?.message ?? `${response.status} ${response.statusText}`;
    throw new Error(`Relay API request failed: ${detail}`);
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Relay API returned an empty response.");
  }

  return content;
}
