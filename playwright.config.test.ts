import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'http-server -p 8081',
    port: 8081,
  },
});
