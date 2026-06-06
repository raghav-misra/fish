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
};
