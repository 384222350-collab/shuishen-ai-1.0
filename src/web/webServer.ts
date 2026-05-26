import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { config } from "../config.js";
import { getBotStatuses, ManagedBotPlatform, startManagedBot } from "../bots/botManager.js";
import { emitBotEvent, getRecentEvents, onBotEvent } from "../events/botEvents.js";
import { createPersonaFromImageUrl, createPersonaFromText } from "../persona/personaService.js";
import { Persona } from "../persona/types.js";
import { listPersonas, savePersona } from "../storage/botState.js";
import { getRelaySettings, setRelaySettings } from "../ai/openaiRelay.js";

const publicDir = resolve("public");

interface PersonaRequest {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  text?: string;
  imageDataUrl?: string;
  conversationId?: string;
  persona?: Persona;
  platform?: ManagedBotPlatform;
}

export async function startWebServer(): Promise<void> {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

      if (request.method === "POST" && url.pathname === "/api/persona/text") {
        await handleTextPersona(request, response);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/persona/image") {
        await handleImagePersona(request, response);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/persona/apply") {
        await handleApplyPersona(request, response);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/bots/start") {
        await handleStartBot(request, response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/bots/status") {
        sendJson(response, 200, { ok: true, bots: getBotStatuses() });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/config") {
        const relaySettings = getRelaySettings();
        sendJson(response, 200, {
          ok: true,
          baseUrl: relaySettings.baseUrl || null,
          model: relaySettings.model,
          hasApiKey: Boolean(relaySettings.apiKey)
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/personas") {
        sendJson(response, 200, { ok: true, personas: await listPersonas() });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/events/recent") {
        sendJson(response, 200, { ok: true, events: getRecentEvents() });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/events") {
        handleEventStream(request, response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/health") {
        sendJson(response, 200, { ok: true });
        return;
      }

      await serveStatic(url.pathname, response);
    } catch (error) {
      console.error("Web request failed:", error);
      sendJson(response, 500, { ok: false, error: (error as Error).message });
    }
  });

  await new Promise<void>((resolveServer) => {
    server.listen(config.WEB_LISTEN_PORT, config.WEB_LISTEN_HOST, resolveServer);
  });

  emitBotEvent({
    type: "status",
    platform: "web",
    title: "Web console started",
    text: `http://${config.WEB_LISTEN_HOST}:${config.WEB_LISTEN_PORT}`
  });
  console.log(`Persona test console is running at http://${config.WEB_LISTEN_HOST}:${config.WEB_LISTEN_PORT}`);
}

async function handleStartBot(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJson<PersonaRequest>(request);

  if (body.platform !== "qq" && body.platform !== "wechat") {
    sendJson(response, 400, { ok: false, error: "Please choose qq or wechat." });
    return;
  }

  const status = await startManagedBot(body.platform);
  sendJson(response, status.state === "failed" ? 500 : 200, {
    ok: status.state !== "failed",
    platform: body.platform,
    status
  });
}

async function handleTextPersona(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJson<PersonaRequest>(request);
  const settings = readRelaySettings(body);
  setRelaySettings(settings);

  if (!body.text?.trim()) {
    sendJson(response, 400, { ok: false, error: "Please enter text for persona extraction." });
    return;
  }

  const persona = await createPersonaFromText(body.text, settings);
  emitBotEvent({
    type: "persona.generated",
    platform: "web",
    title: "Text persona generated",
    text: persona.name,
    payload: persona
  });
  sendJson(response, 200, { ok: true, persona });
}

async function handleImagePersona(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJson<PersonaRequest>(request);
  const settings = readRelaySettings(body);
  setRelaySettings(settings);

  if (!body.imageDataUrl?.startsWith("data:image/")) {
    sendJson(response, 400, { ok: false, error: "Please upload a valid image file." });
    return;
  }

  const persona = await createPersonaFromImageUrl(body.imageDataUrl, settings);
  emitBotEvent({
    type: "persona.generated",
    platform: "web",
    title: "Image persona generated",
    text: persona.name,
    payload: persona
  });
  sendJson(response, 200, { ok: true, persona });
}

async function handleApplyPersona(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJson<PersonaRequest>(request);

  if (!body.conversationId?.trim()) {
    sendJson(response, 400, { ok: false, error: "Please enter a conversation ID." });
    return;
  }

  if (!body.persona) {
    sendJson(response, 400, { ok: false, error: "Please generate or provide a persona first." });
    return;
  }

  const conversationId = body.conversationId.trim();
  await savePersona(conversationId, body.persona);
  emitBotEvent({
    type: "persona.applied",
    platform: conversationId.startsWith("qq-") ? "qq" : conversationId.startsWith("contact:") || conversationId.startsWith("room:") ? "wechat" : "web",
    conversationId,
    title: "Persona applied",
    text: body.persona.name,
    payload: body.persona
  });

  sendJson(response, 200, { ok: true, conversationId, persona: body.persona });
}

function handleEventStream(request: IncomingMessage, response: ServerResponse): void {
  response.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive"
  });

  for (const event of getRecentEvents()) {
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  const unsubscribe = onBotEvent((event) => {
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  request.on("close", unsubscribe);
}

function readRelaySettings(body: PersonaRequest): Required<Pick<PersonaRequest, "baseUrl" | "apiKey" | "model">> {
  const baseUrl = body.baseUrl?.trim() || config.OPENAI_BASE_URL;
  const apiKey = body.apiKey?.trim() || config.OPENAI_API_KEY;
  const model = body.model?.trim() || config.OPENAI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new Error("Please provide Base URL, API Key, and model.");
  }

  return { baseUrl, apiKey, model };
}

async function serveStatic(pathname: string, response: ServerResponse): Promise<void> {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(publicDir, requested));

  if (!filePath.startsWith(publicDir)) {
    sendJson(response, 403, { ok: false, error: "Forbidden" });
    return;
  }

  try {
    await readFile(filePath);
  } catch {
    sendJson(response, 404, { ok: false, error: "Not found" });
    return;
  }

  response.writeHead(200, { "content-type": contentTypeFor(filePath) });
  createReadStream(filePath).pipe(response);
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

function contentTypeFor(filePath: string): string {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "text/html; charset=utf-8";
  }
}
