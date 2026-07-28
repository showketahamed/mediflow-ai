import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().startsWith("postgresql://"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  CORS_ORIGIN: z.string().min(1),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
  COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("strict"),
  COOKIE_DOMAIN: z.string().optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
  RATE_LIMIT_TTL_MS: z.coerce.number().int().min(1000).default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
  RATE_LIMIT_STORAGE: z.enum(["memory", "redis"]).default("memory"),
  METRICS_TOKEN: z.string().min(24).optional(),
}).passthrough().superRefine((environment, context) => {
  if (environment.COOKIE_SAME_SITE === "none" && environment.COOKIE_SECURE !== "true") {
    context.addIssue({ code: "custom", path: ["COOKIE_SAME_SITE"], message: "SameSite=None cookies must also be Secure." });
  }
  if (environment.NODE_ENV !== "production") return;
  if (environment.COOKIE_SECURE !== "true") {
    context.addIssue({ code: "custom", path: ["COOKIE_SECURE"], message: "COOKIE_SECURE must be true in production." });
  }
  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
    if (/replace|change|secret/i.test(environment[key])) {
      context.addIssue({ code: "custom", path: [key], message: `${key} contains an unsafe placeholder.` });
    }
  }
  if (!environment.CSRF_SECRET || /replace|change|secret/i.test(environment.CSRF_SECRET)) {
    context.addIssue({ code: "custom", path: ["CSRF_SECRET"], message: "A dedicated non-placeholder CSRF_SECRET is required in production." });
  }
  if (!environment.METRICS_TOKEN) {
    context.addIssue({ code: "custom", path: ["METRICS_TOKEN"], message: "METRICS_TOKEN is required in production." });
  }
  if (environment.RATE_LIMIT_STORAGE !== "redis") {
    context.addIssue({ code: "custom", path: ["RATE_LIMIT_STORAGE"], message: "Production rate limiting must use Redis." });
  }
  const origins = environment.CORS_ORIGIN.split(",").map((item) => item.trim());
  if (origins.some((origin) => !origin.startsWith("https://"))) {
    context.addIssue({ code: "custom", path: ["CORS_ORIGIN"], message: "Production CORS origins must use HTTPS." });
  }
});

export function validateEnvironment(values: Record<string, unknown>) {
  const result = environmentSchema.safeParse(values);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${message}`);
  }
  return result.data;
}
