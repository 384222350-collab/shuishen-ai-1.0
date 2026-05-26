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

## 环境变量与部署（新增）

- 推荐把敏感的 API Key 放在运行环境的环境变量中，或在项目根目录创建一个本地的 `.env` 文件（不要提交到仓库）。仓库已将 `.env` 列入 `.gitignore`。
- 仓库提供了一个默认示例文件 `env.defaults`（示例），请复制为 `.env` 并编辑具体值：

```bash
cp env.defaults .env
```

- 常用环境变量（示例，详见 `env.defaults`）：

	- `OPENAI_BASE_URL`：中转 API 地址
	- `OPENAI_API_KEY`：中转 API Key（不要提交到 git）
	- `OPENAI_MODEL`：使用的模型名
	- `BOT_PLATFORM`：运行平台，取值 `web|wechat|qq`
	- `WEB_ENABLE_WECHAT_BOT` / `WEB_ENABLE_QQ_BOT`：是否在 web 控制台同时监听对应平台
	- `QQ_ONEBOT_ACCESS_TOKEN`：OneBot access token（如启用 QQ）

- 在生产环境中，优先通过容器或宿主机的环境变量注入 Key，避免把 Key 写入文件系统。

## 需要搭建的运行环境（新增）

最低建议环境：

- Node.js 18 或以上（建议使用 LTS 版本）
- npm 8+ 或 yarn
- Git（用于代码管理与历史清理）

本地快速启动步骤：

1. 克隆仓库并安装依赖：

```bash
git clone <repo-url>
cd shuishen\ 2.0
npm install
```

2. 准备环境变量（复制示例并填写）：

```bash
cp env.defaults .env
# 编辑 .env，填写 OPENAI_API_KEY 等
```

3. 启动开发模式（Web 控制台）：

```bash
npm run dev
```

4. 可选：如果启用 QQ 或 WeChat，按 README 中对应章节配置 OneBot 或扫码登录。

安全与注意事项：

- 本仓库已从历史记录中移除部分敏感文件（API key、微信 memory-card），但如果你在个人或其他分支中曾提交过密钥，请务必在相应服务中撤销/重置密钥。
- 所有合作者在拉取远程分支后，建议使用 `git fetch && git reset --hard origin/main` 重新同步或直接重新克隆仓库以避免历史冲突。

更多部署选项与容器化说明请参见：[DEPLOYMENT.md](DEPLOYMENT.md)

