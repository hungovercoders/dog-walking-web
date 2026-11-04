import { test } from '@playwright/test';
import { pages, prepare, viewports } from './pages';

/**
 * Full-page screenshots of every main page at phone and desktop widths, in
 * light and dark mode, written to e2e/screenshots/<page>-<viewport>-<scheme>.png.
 * Artifacts for review, not pixel baselines: nothing is compared yet.
 */
for (const [viewportName, viewport] of Object.entries(viewports)) {
	for (const colorScheme of ['light', 'dark'] as const) {
		test.describe(`${viewportName} ${colorScheme}`, () => {
			test.use({ viewport, colorScheme, deviceScaleFactor: 2 });

			for (const { name, path } of pages) {
				test(name, async ({ context, page, baseURL }) => {
					await prepare(context, page, baseURL!);
					await page.goto(path, { waitUntil: 'networkidle' });
					await page.screenshot({
						path: `e2e/screenshots/${name}-${viewportName}-${colorScheme}.png`,
						fullPage: true,
						animations: 'disabled'
					});
				});
			}
		});
	}
}
