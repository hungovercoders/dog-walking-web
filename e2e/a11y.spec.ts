import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { pages, prepare, viewports } from './pages';

/**
 * Automated accessibility check of every main page: zero serious or critical
 * axe violations against WCAG 2.1 A and AA, at phone width, light and dark.
 * The full axe results are attached to each test for the report.
 */
for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`a11y ${colorScheme}`, () => {
		test.use({ viewport: viewports.phone, colorScheme });

		for (const { name, path } of pages) {
			test(name, async ({ context, page, baseURL }, testInfo) => {
				await prepare(context, page, baseURL!);
				await page.goto(path, { waitUntil: 'networkidle' });
				const results = await new AxeBuilder({ page })
					.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
					.analyze();
				await testInfo.attach('axe-results', {
					body: JSON.stringify(results.violations, null, 2),
					contentType: 'application/json'
				});
				// Moderate and minor findings are reported, not failed on.
				for (const v of results.violations.filter((x) => x.impact !== 'serious' && x.impact !== 'critical')) {
					testInfo.annotations.push({ type: `axe ${v.impact}`, description: `${v.id} (${v.nodes.length}) ${v.help}` });
					console.log(`axe ${v.impact} on ${path}: ${v.id} (${v.nodes.length}) ${v.help}`);
				}
				const blocking = results.violations
					.filter((v) => v.impact === 'serious' || v.impact === 'critical')
					.map((v) => `${v.impact}: ${v.id} (${v.nodes.length}) ${v.help}`);
				expect(blocking, `serious or critical axe violations on ${path}`).toEqual([]);
			});
		}
	});
}
