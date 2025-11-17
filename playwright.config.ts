import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	},
	testDir: 'e2e',

	// Test on Chromium by default
	// For WebKit/Safari testing, run: npx playwright install webkit && npm run test:e2e -- --project=webkit
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
