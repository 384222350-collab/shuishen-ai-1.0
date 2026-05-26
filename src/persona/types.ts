export interface Persona {
  id: string;
  name: string;
  summary: string;
  traits: string[];
  tone: string;
  boundaries: string[];
  replyRules: string[];
  systemPrompt: string;
  source: string;
  updatedAt: string;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
