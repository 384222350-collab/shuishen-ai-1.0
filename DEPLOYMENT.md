# 部署说明（详细）

本文件提供多种部署选项：Docker 部署、docker-compose、以及在 Linux 主机上使用 systemd 的示例。

## 准备工作

- 在开始前，请确保你已经在服务端或宿主机上添加了必要的环境变量或 `.env` 文件，且 `.env` 中不要包含被泄露的旧密钥。
- 建议先备份 `data/` 目录：

```bash
tar czvf shuishen-data-backup-$(date +%F).tar.gz data/
```

## Docker 部署

1. 在仓库目录下构建镜像：

```bash
docker build -t shuishen-persona-bot:latest .
```

2. 运行容器（示例）：

```bash
docker run -d \
  --name shuishen-persona-bot \
  --restart unless-stopped \
  --env-file .env \
  -p 5173:5173 \
  -v $(pwd)/data:/app/data \
  shuishen-persona-bot:latest
```

3. 更新镜像并重启容器：

```bash
docker build -t shuishen-persona-bot:latest .
docker stop shuishen-persona-bot && docker rm shuishen-persona-bot
# 然后重新运行上面的 docker run 命令
```

## docker-compose（推荐用于单机托管）

1. 复制 `env.defaults` 为 `.env` 并编辑：

```bash
cp env.defaults .env
# 编辑 .env，填写 OPENAI_API_KEY 和其他变量
```

2. 使用 docker-compose 启动：

```bash
docker-compose up -d --build
```

3. 查看日志：

```bash
docker-compose logs -f
```

4. 更新：

```bash
docker-compose pull || true
docker-compose build --no-cache
docker-compose up -d
```

## 在 Linux 服务上使用 systemd（示例）

适用于不使用容器，直接在服务器上运行的场景。

1. 在 `/opt/shuishen` 放置仓库代码，并执行：

```bash
npm install --production
npm run build
```

2. 创建运行用户并设置权限：

```bash
sudo useradd -r -s /usr/sbin/nologin shuishen
sudo chown -R shuishen:shuishen /opt/shuishen
```

3. 在 `/etc/default/shuishen` 写入环境变量（或使用 systemd 的 `EnvironmentFile`）：

```bash
OPENAI_BASE_URL=https://api.example.com
OPENAI_API_KEY=...
OPENAI_MODEL=deepseek-v4-flash
```

4. 将 `deploy/shuishen.service` 复制到 `/etc/systemd/system/shuishen.service`：

```bash
sudo cp deploy/shuishen.service /etc/systemd/system/shuishen.service
sudo systemctl daemon-reload
sudo systemctl enable --now shuishen.service
sudo journalctl -u shuishen.service -f
```

## 证书、反向代理与 TLS

- 如果你需要通过公网访问 web 控制台，建议在前端放置 Nginx/Traefik 做反向代理并配置 HTTPS（Let's Encrypt）。
- 在使用反向代理时，把 `WEB_LISTEN_HOST` 设置为 `127.0.0.1`，并将外部端口暴露在代理上。

## 安全建议

- 任何被泄露的 Key 都需要立即在对应服务（OpenAI/中转/OneBot 等）中撤销并重置。
- 定期备份 `data/` 并把备份存储在安全位置。
- 为部署服务器配置防火墙，仅开放必要端口（例如 5173 仅在内部网络或反向代理上可达）。

## 常见操作

重启容器：

```bash
docker-compose restart
```

查看状态（systemd）：

```bash
sudo systemctl status shuishen.service
```

更新代码并重启（非容器化）：

```bash
git pull origin main
npm install --production
npm run build
sudo systemctl restart shuishen.service
```
