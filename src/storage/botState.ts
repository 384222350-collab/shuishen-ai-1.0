import { resolve } from "node:path";
import { config } from "../config.js";
import { defaultPersona } from "../persona/personaService.js";
import { Persona, StoredMessage } from "../persona/types.js";
import { JsonStore } from "./jsonStore.js";

type PersonaMap = Record<string, Persona>;
type MemoryMap = Record<string, StoredMessage[]>;

const personaStore = new JsonStore<PersonaMap>(resolve("data/personas.json"));
const memoryStore = new JsonStore<MemoryMap>(resolve("data/memory.json"));

export async function getPersona(conversationId: string): Promise<Persona> {
  const personas = await personaStore.read();
  return personas[conversationId] ?? defaultPersona();
}

export async function savePersona(conversationId: string, persona: Persona): Promise<void> {
  const personas = await personaStore.read();
  personas[conversationId] = persona;
  await personaStore.write(personas);
}

export async function listPersonas(): Promise<PersonaMap> {
  return personaStore.read();
}

export async function resetPersona(conversationId: string): Promise<void> {
  const personas = await personaStore.read();
  delete personas[conversationId];
  await personaStore.write(personas);
}

export async function getHistory(conversationId: string): Promise<StoredMessage[]> {
  const memories = await memoryStore.read();
  return memories[conversationId] ?? [];
}

export async function appendHistory(conversationId: string, message: Omit<StoredMessage, "createdAt">): Promise<void> {
  const memories = await memoryStore.read();
  const current = memories[conversationId] ?? [];
  current.push({ ...message, createdAt: new Date().toISOString() });
  memories[conversationId] = current.slice(-config.BOT_MAX_HISTORY);
  await memoryStore.write(memories);
}
