import { emitBotEvent } from "../events/botEvents.js";
import { startQqBot } from "../qq/qqBot.js";
import { startWechatBot } from "../wechat/wechatBot.js";

export type ManagedBotPlatform = "qq" | "wechat";
export type ManagedBotState = "stopped" | "starting" | "running" | "failed";

interface ManagedBotStatus {
  state: ManagedBotState;
  error?: string;
  startedAt?: string;
}

const statuses: Record<ManagedBotPlatform, ManagedBotStatus> = {
  qq: { state: "stopped" },
  wechat: { state: "stopped" }
};

export function getBotStatuses(): Record<ManagedBotPlatform, ManagedBotStatus> {
  return {
    qq: { ...statuses.qq },
    wechat: { ...statuses.wechat }
  };
}

export async function startManagedBot(platform: ManagedBotPlatform): Promise<ManagedBotStatus> {
  const status = statuses[platform];
  if (status.state === "running" || status.state === "starting") {
    return { ...status };
  }

  statuses[platform] = { state: "starting" };
  emitBotEvent({
    type: "status",
    platform,
    title: `${platform.toUpperCase()} bot starting`,
    text: "Starting from web console"
  });

  try {
    if (platform === "qq") {
      await startQqBot();
    } else {
      await startWechatBot();
    }

    statuses[platform] = {
      state: "running",
      startedAt: new Date().toISOString()
    };
    emitBotEvent({
      type: "status",
      platform,
      title: `${platform.toUpperCase()} bot running`,
      text: "Started successfully"
    });
  } catch (error) {
    statuses[platform] = {
      state: "failed",
      error: (error as Error).message
    };
    emitBotEvent({
      type: "error",
      platform,
      title: `${platform.toUpperCase()} bot failed`,
      text: (error as Error).message
    });
  }

  return { ...statuses[platform] };
}

export function setManagedBotState(platform: ManagedBotPlatform, state: ManagedBotState, error?: string): ManagedBotStatus {
  statuses[platform] = state === "failed" ? { state, error } : { state };
  if (state === "running") {
    emitBotEvent({ type: "status", platform, title: `${platform.toUpperCase()} bot running`, text: "Started" });
  } else if (state === "starting") {
    emitBotEvent({ type: "status", platform, title: `${platform.toUpperCase()} bot starting`, text: "Starting" });
  } else if (state === "stopped") {
    emitBotEvent({ type: "status", platform, title: `${platform.toUpperCase()} bot stopped`, text: "Stopped" });
  } else if (state === "failed") {
    emitBotEvent({ type: "error", platform, title: `${platform.toUpperCase()} bot failed`, text: error ?? "Failed" });
  }

  return { ...statuses[platform] };
}
