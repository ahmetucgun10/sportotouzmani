import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    launchOptions: process.env.CHROMIUM_PATH
      ? {
          executablePath: process.env.CHROMIUM_PATH,
          args: process.env.CHROMIUM_ARGS
            ? JSON.parse(process.env.CHROMIUM_ARGS)
            : [],
        }
      : {},
  },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
