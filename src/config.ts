import "dotenv/config";
import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const envSchema = z.object({
  OPENAI_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  BOT_PLATFORM: z.enum(["web", "wechat", "qq"]).default("web"),
  BOT_NAME: z.string().default("Shuishen"),
  BOT_OWNER_NAME: z.string().optional().default(""),
  BOT_REPLY_GROUPS: z
    .string()
    .optional()
    .default("false")
    .transform((value) => value.toLowerCase() === "true"),
  BOT_GROUP_MENTION_ONLY: z
    .string()
    .optional()
    .default("true")
    .transform((value) => value.toLowerCase() === "true"),
  BOT_MAX_HISTORY: z
    .string()
    .optional()
    .default("12")
    .transform((value) => Number.parseInt(value, 10)),
  ENABLE_IMAGE_PERSONA: z
    .string()
    .optional()
    .default("false")
    .transform((value) => value.toLowerCase() === "true"),
  QQ_LISTEN_HOST: z.string().optional().default("127.0.0.1"),
  QQ_LISTEN_PORT: z
    .string()
    .optional()
    .default("3001")
    .transform((value) => Number.parseInt(value, 10)),
  QQ_ONEBOT_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  QQ_ONEBOT_ACCESS_TOKEN: z.string().optional().default(""),
  WEB_LISTEN_HOST: z.string().optional().default("127.0.0.1"),
  WEB_LISTEN_PORT: z
    .string()
    .optional()
    .default("5173")
    .transform((value) => Number.parseInt(value, 10)),
  WEB_ENABLE_QQ_BOT: z
    .string()
    .optional()
    .default("false")
    .transform((value) => value.toLowerCase() === "true"),
  WEB_ENABLE_WECHAT_BOT: z
    .string()
    .optional()
    .default("false")
    .transform((value) => value.toLowerCase() === "true")
});

export const config = envSchema.parse(process.env);
