export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  /**
   * Shared secret for the /admin testing API. Falls back to a well-known dev
   * value for local use; ALWAYS set ADMIN_TOKEN in any shared/prod deployment.
   */
  adminToken: process.env.ADMIN_TOKEN ?? "dev-admin-token",
  /**
   * Optional site-wide access key. When set, clients must provide this key
   * to connect. Leave empty/unset to disable the gate.
   */
  gameKey: process.env.GAME_KEY ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
};
