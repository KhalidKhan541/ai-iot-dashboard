import { z } from "zod";

// ─── Environment Schema ───────────────────────────────────────────────────────

const envSchema = z.object({
  // ── Core ──────────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("AI IoT Dashboard"),

  // ── Database ──────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().url(),
  DATABASE_DIRECT_URL: z.string().url().optional(),

  // ── Auth ──────────────────────────────────────────────────────────────────
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // ── OAuth Providers ───────────────────────────────────────────────────────
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // ── Redis ─────────────────────────────────────────────────────────────────
  REDIS_URL: z.string().url().optional(),

  // ── MQTT ──────────────────────────────────────────────────────────────────
  MQTT_BROKER_URL: z.string().url().optional(),
  MQTT_PORT: z.coerce.number().int().min(1).max(65535).default(1883),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),

  // ── AWS IoT ───────────────────────────────────────────────────────────────
  AWS_IOT_ENDPOINT: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // ── Grafana ───────────────────────────────────────────────────────────────
  GRAFANA_URL: z.string().url().optional(),
  GRAFANA_API_KEY: z.string().optional(),

  // ── Logging ───────────────────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error", "fatal"])
    .default("info"),

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().default(100),
});

// ─── Parse & Validate ─────────────────────────────────────────────────────────

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((e) => `  ${e.path.join(".")}: ${e.message}`)
        .join("\n");

      console.error("\n❌ Environment validation failed:\n");
      console.error(missingVars);
      console.error(
        "\n💡 Check your .env file and ensure all required variables are set.\n"
      );
    }
    throw error;
  }
}

const env = validateEnv();

// ─── Typed Config Object ──────────────────────────────────────────────────────

export const config = {
  env: env.NODE_ENV,
  isDev: env.NODE_ENV === "development",
  isProd: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",

  app: {
    url: env.NEXT_PUBLIC_APP_URL,
    name: env.NEXT_PUBLIC_APP_NAME,
  },

  database: {
    url: env.DATABASE_URL,
    directUrl: env.DATABASE_DIRECT_URL,
  },

  auth: {
    secret: env.NEXTAUTH_SECRET,
    url: env.NEXTAUTH_URL,
    providers: {
      github:
        env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
          ? {
              clientId: env.GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET,
            }
          : undefined,
      google:
        env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
          ? {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            }
          : undefined,
    },
  },

  redis: {
    url: env.REDIS_URL,
    enabled: !!env.REDIS_URL,
  },

  mqtt: {
    broker: env.MQTT_BROKER_URL,
    port: env.MQTT_PORT,
    username: env.MQTT_USERNAME,
    password: env.MQTT_PASSWORD,
    enabled: !!env.MQTT_BROKER_URL,
  },

  aws: {
    iotEndpoint: env.AWS_IOT_ENDPOINT,
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    enabled: !!env.AWS_IOT_ENDPOINT,
  },

  grafana: {
    url: env.GRAFANA_URL,
    apiKey: env.GRAFANA_API_KEY,
    enabled: !!env.GRAFANA_URL,
  },

  logging: {
    level: env.LOG_LEVEL,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
} as const;

// ─── Feature Flags ────────────────────────────────────────────────────────────

export const features = {
  mqtt: config.mqtt.enabled,
  awsIot: config.aws.enabled,
  grafana: config.grafana.enabled,
  redis: config.redis.enabled,
  emailNotifications: !!process.env.SMTP_HOST,
  smsNotifications: !!process.env.TWILIO_ACCOUNT_SID,
  pushNotifications: !!process.env.FIREBASE_PROJECT_ID,
} as const;

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type Env = z.infer<typeof envSchema>;
export type Config = typeof config;
export type Features = typeof features;

export default config;
