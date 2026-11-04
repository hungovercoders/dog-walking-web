import { defineConfig, devices } from '@playwright/test';

/**
 * Screenshots and accessibility checks of the main pages, run against a web
 * app that is already up (WEB_URL) and an API seeded by scripts/seed-demo.mjs.
 * `task screens` starts both and runs this; see README.md.
 */
export default defineConfig({
	testDir: 'e2e',
	outputDir: 'e2e/test-results',
	fullyParallel: true,
	retries: 0,
	reporter: process.env.CI ? [['list'], ['github']] : 'list',
	use: {
		baseURL: process.env.WEB_URL ?? 'http://localhost:5199',
		timezoneId: 'Europe/London',
		locale: 'en-GB',
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
