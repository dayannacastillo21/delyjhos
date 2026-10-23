import { defineConfig } from "@playwright/test";
export default defineConfig({
  timeout: 60000,
  expect: { timeout: 15000 },
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://localhost:5174",
    browserName: "chromium",
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        process.platform === "win32"
          ? "..\\backend\\.venv\\Scripts\\python.exe -m uvicorn tests.e2e_server:app --app-dir ../backend --port 8001"
          : "python -m uvicorn tests.e2e_server:app --app-dir ../backend --port 8001",
      url: "http://127.0.0.1:8001/",
      timeout: 60000,
      reuseExistingServer: false,
      env: { PYTHONPATH: "../backend" },
    },
    {
      command: "npm run dev -- --host localhost --port 5174 --strictPort",
      url: "http://localhost:5174",
      env: { VITE_API_URL: "http://127.0.0.1:8001" },
      timeout: 30000,
      reuseExistingServer: false,
    },
  ],
});
