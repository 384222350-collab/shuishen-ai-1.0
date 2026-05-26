# 人格聊天机器人

这是一个微信 / QQ 聊天机器人骨架。它会接收聊天消息，调用 OpenAI 兼容的中转 API，根据文字或图片生成当前会话的人格卡，并按人格继续聊天。

> 注意：个人微信、个人 QQ 的非官方接入都有稳定性和账号风险。建议先用小号测试，不要承载重要账号。

## 功能

- 支持个人微信扫码登录
- 支持 QQ OneBot v11 HTTP 接入
- 支持私聊自动回复
- 支持群聊回复，默认关闭
- 使用中转 `Base URL` / `API Key` / `Model`
- 支持通过文字生成人格卡
- 支持图片人格提取，前提是中转模型支持视觉输入
- 支持本地 Web 测试台，直接输入 API Key、URL、文字或图片
- 本地保存每个会话的人格和最近聊天记忆

## 安装

```bash
npm install
copy .env.example .env
```

然后编辑 `.env`：

```env
OPENAI_BASE_URL=https://你的中转地址/v1
OPENAI_API_KEY=你的中转key
OPENAI_MODEL=你的模型名
```

## 启动 Web 测试台

```env
BOT_PLATFORM=web
WEB_LISTEN_PORT=5173
```

```bash
npm run dev
```

打开：

```text
http://127.0.0.1:5173
```

页面里可以直接填写中转 URL、API Key、模型名，然后输入文字或上传图片查看生成的人格卡。

控制台也可以把当前人格应用到 QQ 或微信会话。常用会话 ID 格式：

```text
qq-private:QQ号
qq-group:群号
contact:微信联系人ID
room:微信群ID
```

如果你希望 Web 控制台同时实时监听 QQ 或微信消息，在 `.env` 中开启：

```env
WEB_ENABLE_QQ_BOT=true
WEB_ENABLE_WECHAT_BOT=false
```

QQ 仍然需要 OneBot 客户端把消息上报到 `QQ_LISTEN_PORT`。微信开启后会在终端输出扫码信息。

## 启动微信

```env
BOT_PLATFORM=wechat
```

```bash
npm run dev
```

启动后终端会显示二维码，用个人微信扫码登录。

## 启动 QQ

QQ 使用 OneBot v11 HTTP 上报。你可以用 NapCat、Lagrange、LiteLoader QQNT OneBot 插件等支持 OneBot v11 的客户端。

`.env` 示例：

```env
BOT_PLATFORM=qq
QQ_LISTEN_HOST=127.0.0.1
QQ_LISTEN_PORT=3001
QQ_ONEBOT_BASE_URL=http://127.0.0.1:3000
QQ_ONEBOT_ACCESS_TOKEN=
```

OneBot 客户端里需要配置：

```text
HTTP 上报地址：http://127.0.0.1:3001
OneBot API 地址：http://127.0.0.1:3000
```

然后启动机器人：

```bash
npm run dev
```

如果你的 OneBot 客户端设置了 access token，`.env` 里的 `QQ_ONEBOT_ACCESS_TOKEN` 要填同一个值。

## 聊天指令

在微信或 QQ 里给机器人发：

```text
/人格 一个慢热、理性、说话简洁但很会照顾别人情绪的人
```

机器人会根据这段文字生成你和它聊天时使用的人格。

查看当前人格：

```text
/人设
```

重置人格：

```text
/人格重置
```

查看帮助：

```text
/帮助
```

## 群聊

默认不回复群聊。要开启：

```env
BOT_REPLY_GROUPS=true
BOT_GROUP_MENTION_ONLY=true
```

开启后，默认只有被 @ 时才回复。

## 图片人格

如果你的中转 API 和模型支持 OpenAI 兼容的视觉输入，开启：

```env
ENABLE_IMAGE_PERSONA=true
OPENAI_MODEL=支持图片的模型名
```

然后直接给机器人发图片，它会根据图片生成当前会话的人格卡。

如果中转不支持视觉输入，请保持关闭；文字人格和聊天不受影响。
