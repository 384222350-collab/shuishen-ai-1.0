const state = {
  mode: "text",
  imageDataUrl: "",
  persona: null,
  events: []
};

const $ = (selector) => document.querySelector(selector);

const fields = {
  baseUrl: $("#baseUrl"),
  apiKey: $("#apiKey"),
  model: $("#model"),
  sourceText: $("#sourceText"),
  imageInput: $("#imageInput"),
  imageName: $("#imageName"),
  preview: $("#preview"),
  status: $("#status"),
  personaName: $("#personaName"),
  personaSummary: $("#personaSummary"),
  editName: $("#editName"),
  editSummary: $("#editSummary"),
  editTraits: $("#editTraits"),
  editTone: $("#editTone"),
  editBoundaries: $("#editBoundaries"),
  editReplyRules: $("#editReplyRules"),
  systemPrompt: $("#systemPrompt"),
  copyJson: $("#copyJson"),
  generateText: $("#generateText"),
  generateImage: $("#generateImage"),
  savePersonaEdits: $("#savePersonaEdits"),
  targetPlatform: $("#targetPlatform"),
  targetId: $("#targetId"),
  conversationId: $("#conversationId"),
  applyPersona: $("#applyPersona"),
  eventList: $("#eventList"),
  clearEvents: $("#clearEvents"),
  startQq: $("#startQq"),
  startWechat: $("#startWechat"),
  refreshBots: $("#refreshBots"),
  qqStatus: $("#qqStatus"),
  wechatStatus: $("#wechatStatus"),
  wechatLogin: $("#wechatLogin"),
  wechatLoginText: $("#wechatLoginText"),
  wechatQr: $("#wechatQr")
};

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    state.mode = tab.dataset.mode;
    document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab));
    $("#textMode").classList.toggle("active", state.mode === "text");
    $("#imageMode").classList.toggle("active", state.mode === "image");
  });
});

fields.targetPlatform.addEventListener("change", updateConversationId);
fields.targetId.addEventListener("input", updateConversationId);

fields.imageInput.addEventListener("change", async () => {
  const file = fields.imageInput.files?.[0];
  if (!file) {
    return;
  }

  if (file.size > 6 * 1024 * 1024) {
    showError("图片太大了。请先用 6MB 以内的图片测试。");
    fields.imageInput.value = "";
    return;
  }

  state.imageDataUrl = await readFileAsDataUrl(file);
  fields.imageName.textContent = file.name;
  fields.preview.src = state.imageDataUrl;
  fields.preview.classList.add("visible");
});

fields.generateText.addEventListener("click", async () => {
  const text = fields.sourceText.value.trim();
  if (!text) {
    showError("请先输入文字素材。");
    return;
  }

  await generatePersona("/api/persona/text", {
    ...readSettings(),
    text
  });
});

fields.generateImage.addEventListener("click", async () => {
  if (!state.imageDataUrl) {
    showError("请先选择图片。");
    return;
  }

  await generatePersona("/api/persona/image", {
    ...readSettings(),
    imageDataUrl: state.imageDataUrl
  });
});

fields.savePersonaEdits.addEventListener("click", () => {
  if (!state.persona) {
    showError("请先生成一个人格。");
    return;
  }

  state.persona = readPersonaEditor();
  renderPersona(state.persona);
  setStatus("已保存修改");
  showError("人格修改已保存到当前页面。点击“应用当前人格”后会写入 QQ/微信会话。");
});

fields.applyPersona.addEventListener("click", async () => {
  if (!state.persona) {
    showError("请先生成一个人格。");
    return;
  }

  const conversationId = fields.conversationId.value.trim();
  if (!conversationId || conversationId.endsWith(":")) {
    showError("请填写完整的会话 ID。");
    return;
  }

  setBusy(true);
  try {
    state.persona = readPersonaEditor();
    const payload = await postJson("/api/persona/apply", {
      conversationId,
      persona: state.persona
    });
    setStatus("已应用");
    showError(`已应用到 ${payload.conversationId}`);
  } catch (error) {
    setStatus("出错了");
    showError(formatError(error));
  } finally {
    setBusy(false);
  }
});

fields.copyJson.addEventListener("click", async () => {
  if (!state.persona) {
    return;
  }

  await navigator.clipboard.writeText(JSON.stringify(state.persona, null, 2));
  setStatus("已复制");
});

fields.clearEvents.addEventListener("click", () => {
  state.events = [];
  renderEvents();
});

fields.startQq.addEventListener("click", () => startBot("qq"));
fields.startWechat.addEventListener("click", () => startBot("wechat"));
fields.refreshBots.addEventListener("click", refreshBotStatus);

updateConversationId();
loadServerConfig();
connectEvents();
refreshBotStatus();

function readSettings() {
  const baseUrl = fields.baseUrl.value.trim();
  const apiKey = fields.apiKey.value.trim();
  const model = fields.model.value.trim();
  const hasAny = Boolean(baseUrl || apiKey || model);

  if (!hasAny) {
    return {};
  }

  if (!baseUrl || !apiKey || !model) {
    throw new Error("请填写中转 URL、API Key 和模型名。");
  }

  return { baseUrl, apiKey, model };
}

async function loadServerConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    if (!payload.ok) {
      return;
    }

    if (payload.baseUrl && !fields.baseUrl.value.trim()) {
      fields.baseUrl.value = payload.baseUrl;
    }
    if (payload.model && !fields.model.value.trim()) {
      fields.model.value = payload.model;
    }
    if (payload.hasApiKey && !fields.apiKey.value.trim()) {
      fields.apiKey.placeholder = "使用服务器环境中配置的 API Key";
    }
  } catch {
    // ignore
  }
}

async function generatePersona(endpoint, body) {
  setStatus("生成中");
  setBusy(true);

  try {
    const payload = await postJson(endpoint, body);
    state.persona = payload.persona;
    renderPersona(payload.persona);
    setStatus("已生成");
  } catch (error) {
    setStatus("出错了");
    showError(formatError(error));
  } finally {
    setBusy(false);
  }
}

async function postJson(endpoint, body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await readJsonResponse(response);
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `请求失败：${response.status}`);
  }
  return payload;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: text.slice(0, 500) };
  }
}

function updateConversationId() {
  const id = fields.targetId.value.trim();
  const platform = fields.targetPlatform.value;
  const prefixMap = {
    "qq-private": "qq-private:",
    "qq-group": "qq-group:",
    "wechat-contact": "contact:",
    "wechat-room": "room:",
    custom: ""
  };

  fields.conversationId.value = `${prefixMap[platform]}${id}`;
}

function connectEvents() {
  fetch("/api/events/recent")
    .then((response) => response.json())
    .then((payload) => {
      if (payload.ok) {
        state.events = payload.events.slice(-80);
        renderEvents();
      }
    })
    .catch(() => undefined);

  const stream = new EventSource("/api/events");
  stream.onopen = () => setStatus("监测中");
  stream.onerror = () => setStatus("监测断开");
  stream.onmessage = (message) => {
    const event = JSON.parse(message.data);
    if (state.events.some((item) => item.id === event.id)) {
      return;
    }
    handleRealtimeEvent(event);
    state.events.push(event);
    state.events = state.events.slice(-80);
    renderEvents();
  };
}

function handleRealtimeEvent(event) {
  if (event.platform !== "wechat" || event.type !== "status") {
    return;
  }

  if (event.payload?.qrDataUrl) {
    fields.wechatQr.src = event.payload.qrDataUrl;
    fields.wechatQr.classList.add("visible");
    fields.wechatLogin.classList.add("active");
    fields.wechatLoginText.textContent = "请用微信扫码登录。二维码过期后重新点击启动即可。";
    return;
  }

  if (event.payload?.loggedIn === true) {
    fields.wechatLogin.classList.add("active");
    fields.wechatLoginText.textContent = `微信已登录：${event.text || ""}`;
    fields.wechatQr.classList.remove("visible");
    return;
  }

  if (event.payload?.loggedIn === false) {
    fields.wechatLogin.classList.add("active");
    fields.wechatLoginText.textContent = "微信已退出，请重新启动监听并扫码。";
    fields.wechatQr.classList.remove("visible");
  }
}

function renderPersona(persona) {
  fields.personaName.textContent = persona.name || "未命名人格";
  fields.personaSummary.textContent = persona.summary || "-";
  fields.editName.value = persona.name || "";
  fields.editSummary.value = persona.summary || "";
  fields.editTraits.value = (persona.traits || []).join("、");
  fields.editTone.value = persona.tone || "";
  fields.editBoundaries.value = (persona.boundaries || []).join("、");
  fields.editReplyRules.value = (persona.replyRules || []).join("、");
  fields.systemPrompt.value = persona.systemPrompt || "";
}

function readPersonaEditor() {
  const now = new Date().toISOString();
  return {
    ...(state.persona || {}),
    id: state.persona?.id || `manual-${Date.now()}`,
    name: fields.editName.value.trim() || "未命名人格",
    summary: fields.editSummary.value.trim(),
    traits: splitList(fields.editTraits.value),
    tone: fields.editTone.value.trim(),
    boundaries: splitList(fields.editBoundaries.value),
    replyRules: splitList(fields.editReplyRules.value),
    systemPrompt: fields.systemPrompt.value.trim(),
    source: state.persona?.source || "manual",
    updatedAt: now
  };
}

function splitList(value) {
  return value
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function startBot(platform) {
  setStatus(platform === "qq" ? "启动 QQ" : "启动微信");
  fields.startQq.disabled = true;
  fields.startWechat.disabled = true;

  try {
    await postJson("/api/bots/start", { platform });
    await refreshBotStatus();
    setStatus("已启动");
  } catch (error) {
    setStatus("启动失败");
    showError(formatError(error));
  } finally {
    fields.startQq.disabled = false;
    fields.startWechat.disabled = false;
  }
}

async function refreshBotStatus() {
  try {
    const response = await fetch("/api/bots/status");
    const payload = await readJsonResponse(response);
    if (!payload.ok) {
      throw new Error(payload.error || "状态获取失败");
    }
    fields.qqStatus.textContent = formatBotStatus(payload.bots.qq);
    fields.wechatStatus.textContent = formatBotStatus(payload.bots.wechat);
  } catch (error) {
    fields.qqStatus.textContent = "unknown";
    fields.wechatStatus.textContent = "unknown";
  }
}

function formatBotStatus(status) {
  if (!status) {
    return "unknown";
  }
  return status.error ? `${status.state}: ${status.error}` : status.state;
}

function renderEvents() {
  if (state.events.length === 0) {
    fields.eventList.innerHTML = '<div class="empty">暂无事件。生成、应用人格或收到 QQ/微信消息后会显示在这里。</div>';
    return;
  }

  fields.eventList.replaceChildren(
    ...state.events
      .slice()
      .reverse()
      .map((event) => {
        const item = document.createElement("article");
        item.className = `event event-${event.type.replace(".", "-")}`;
        item.innerHTML = `
          <div class="event-meta">
            <span>${escapeHtml(event.platform)}</span>
            <span>${escapeHtml(event.type)}</span>
            <time>${new Date(event.createdAt).toLocaleTimeString()}</time>
          </div>
          <strong>${escapeHtml(event.title || event.conversationId || "事件")}</strong>
          <p>${escapeHtml(event.text || "")}</p>
          ${event.conversationId ? `<code>${escapeHtml(event.conversationId)}</code>` : ""}
        `;
        return item;
      })
  );
}

function formatError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("failed to fetch")) {
    return "浏览器没有连上本地后端。请刷新页面，或确认 http://127.0.0.1:5173/api/health 能打开。";
  }
  return message;
}

function showError(message) {
  fields.personaSummary.textContent = message;
}

function setBusy(isBusy) {
  fields.generateText.disabled = isBusy;
  fields.generateImage.disabled = isBusy;
  fields.copyJson.disabled = isBusy;
  fields.applyPersona.disabled = isBusy;
  fields.savePersonaEdits.disabled = isBusy;
}

function setStatus(text) {
  fields.status.textContent = text;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
