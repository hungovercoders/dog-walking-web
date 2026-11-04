import { readFileSync } from 'node:fs';
import type { BrowserContext, Page } from '@playwright/test';

/** What scripts/seed-demo.mjs wrote: the seeded day and the ids to visit. */
export interface Seed {
	today: string;
	tz: string;
	seededAt: string;
	clients: Record<'alice' | 'ben' | 'chloe', string>;
	dogs: Record<'biscuit' | 'rex' | 'mango' | 'pepper', string>;
	walks: Record<'completed' | 'inProgress' | 'scheduled' | 'cancelled', string>;
}

export const seed: Seed = JSON.parse(readFileSync(process.env.SEED_FILE ?? 'e2e/.seed.json', 'utf-8'));

/** The main pages, by a short name used in screenshot file names. */
export const pages: { name: string; path: string }[] = [
	{ name: 'today', path: '/' },
	{ name: 'walks-week', path: '/walks' },
	{ name: 'walk-in-progress', path: `/walks/${seed.walks.inProgress}` },
	{ name: 'walk-new', path: '/walks/new' },
	{ name: 'clients', path: '/clients' },
	{ name: 'client-detail', path: `/clients/${seed.clients.alice}` },
	{ name: 'dog-detail', path: `/dogs/${seed.dogs.pepper}` }
];

export const viewports = {
	phone: { width: 390, height: 844 },
	desktop: { width: 1280, height: 800 }
} as const;

/**
 * Put the browser in the walker's world before the first navigation: the
 * zone cookie the layout would otherwise set (so the first render is not
 * UTC), and a clock fixed shortly after the seed ran, so relative times
 * such as an in-progress walk's elapsed minutes are the same every run.
 */
export async function prepare(context: BrowserContext, page: Page, baseURL: string) {
	await context.addCookies([{ name: 'tz', value: seed.tz, url: baseURL }]);
	await page.clock.setFixedTime(new Date(Date.parse(seed.seededAt) + 15 * 60_000));
}
