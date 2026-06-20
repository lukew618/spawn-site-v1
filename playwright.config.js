const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/pdp',
  timeout: 45_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.PDP_PREVIEW_URL || 'http://127.0.0.1:9292',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
});
