import { EventEmitter } from "node:events";

export type BotEventType =
  | "status"
  | "message.in"
  | "message.out"
  | "persona.generated"
  | "persona.applied"
  | "error";

export interface BotEvent {
  id: string;
  type: BotEventType;
  platform: "web" | "qq" | "wechat" | "system";
  conversationId?: string;
  title?: string;
  text?: string;
  payload?: unknown;
  createdAt: string;
}

const emitter = new EventEmitter();
const recentEvents: BotEvent[] = [];

export function emitBotEvent(event: Omit<BotEvent, "id" | "createdAt">): BotEvent {
  const fullEvent: BotEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString()
  };

  recentEvents.push(fullEvent);
  if (recentEvents.length > 200) {
    recentEvents.shift();
  }

  emitter.emit("event", fullEvent);
  return fullEvent;
}

export function onBotEvent(listener: (event: BotEvent) => void): () => void {
  emitter.on("event", listener);
  return () => emitter.off("event", listener);
}

export function getRecentEvents(): BotEvent[] {
  return [...recentEvents];
}
