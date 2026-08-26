import { defineConfig, devices } from '@playwright/test';

const API_PORT = 3000;
const WEB_PORT = 5173;
const CAMPAIGN_PORT = 5174;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'web',
      testMatch: 'web/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${WEB_PORT}`,
      },
    },
    {
      name: 'campaign',
      testMatch: 'campaign/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${CAMPAIGN_PORT}`,
      },
    },
  ],
  webServer: [
    {
      command: 'npm --workspace=api run start',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm --workspace=web run dev -- --host 127.0.0.1 --port 5173',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm --workspace=campaign run dev -- --host 127.0.0.1 --port 5174',
      url: `http://localhost:${CAMPAIGN_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
