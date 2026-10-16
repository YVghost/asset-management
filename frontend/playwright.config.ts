import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: process.env.AMS_E2E_URL || "http://localhost:5173",
    channel: process.env.AMS_E2E_CHANNEL || "chrome",
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: "list",
});
