import { config } from "./config.js";
import { startManagedBot } from "./bots/botManager.js";
import { startQqBot } from "./qq/qqBot.js";
import { startWebServer } from "./web/webServer.js";
import { startWechatBot } from "./wechat/wechatBot.js";

process.on("unhandledRejection", (error) => {
  console.error("Unhandled async error:", error);
});

if (config.BOT_PLATFORM === "web") {
  await startWebServer();
  if (config.WEB_ENABLE_QQ_BOT) {
    void startManagedBot("qq").catch((error) => console.error("QQ bot failed:", error));
  }
  if (config.WEB_ENABLE_WECHAT_BOT) {
    void startManagedBot("wechat").catch((error) => console.error("Wechat bot failed:", error));
  }
} else if (config.BOT_PLATFORM === "qq") {
  await startQqBot();
} else {
  await startWechatBot();
}
