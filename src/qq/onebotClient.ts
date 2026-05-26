import { config } from "../config.js";

interface OneBotApiResponse<T = unknown> {
  status?: string;
  retcode?: number;
  data?: T;
  message?: string;
  wording?: string;
}

export async function sendPrivateMessage(userId: number, message: string): Promise<void> {
  await callOneBotApi("send_private_msg", {
    user_id: userId,
    message
  });
}

export async function sendGroupMessage(groupId: number, message: string): Promise<void> {
  await callOneBotApi("send_group_msg", {
    group_id: groupId,
    message
  });
}

async function callOneBotApi(action: string, payload: Record<string, unknown>): Promise<void> {
  if (!config.QQ_ONEBOT_BASE_URL) {
    throw new Error("缺少 QQ_ONEBOT_BASE_URL，无法向 QQ 发送消息。");
  }

  const endpoint = `${config.QQ_ONEBOT_BASE_URL.replace(/\/$/, "")}/${action}`;
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };

  if (config.QQ_ONEBOT_ACCESS_TOKEN) {
    headers.authorization = `Bearer ${config.QQ_ONEBOT_ACCESS_TOKEN}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  const result = (await response.json().catch(() => ({}))) as OneBotApiResponse;
  if (!response.ok || (result.status && result.status !== "ok")) {
    const detail = result.wording ?? result.message ?? `${response.status} ${response.statusText}`;
    throw new Error(`OneBot API 调用失败：${detail}`);
  }
}
