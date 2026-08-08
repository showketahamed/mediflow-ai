import assert from "node:assert/strict";
import test from "node:test";
import { validateEnvironment } from "./environment";

const baseEnvironment = {
  DATABASE_URL: "postgresql://mediflow:password@localhost:5432/mediflow",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  CORS_ORIGIN: "http://localhost:5173",
};

test("accepts a safe development environment", () => {
  const environment = validateEnvironment(baseEnvironment);

  assert.equal(environment.NODE_ENV, "development");
  assert.equal(environment.PORT, 4000);
});

test("rejects insecure production cookie configuration", () => {
  assert.throws(() => validateEnvironment({
    ...baseEnvironment,
    NODE_ENV: "production",
    COOKIE_SECURE: "false",
    CSRF_SECRET: "c".repeat(32),
    METRICS_TOKEN: "d".repeat(24),
    RATE_LIMIT_STORAGE: "redis",
    CORS_ORIGIN: "https://app.mediflow.example",
  }), /COOKIE_SECURE/);
});
