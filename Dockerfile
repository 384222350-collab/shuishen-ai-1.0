# Dockerfile for Shuishen persona bot
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build || true

# Runtime image
FROM node:18-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S app && adduser -S -G app app

# Copy built artifacts and production deps
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/env.defaults ./env.defaults
COPY --from=build /app/data ./data

# Use non-root user
USER app

ENV NODE_ENV=production
EXPOSE 5173
CMD ["node", "dist/index.js"]
