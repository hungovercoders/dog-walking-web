#!/usr/bin/env node
// Seed a realistic week for one walker, only through the public API, and write
// the ids the screenshot and accessibility specs need to e2e/.seed.json.
//
//   API_URL=http://localhost:8787 SEED_BEARER=test:walker-demo node scripts/seed-demo.mjs
//
// API_URL      where the API answers (both services; or set API_CLIENTS_URL / API_WALKS_URL)
// SEED_BEARER  the bearer token to act as; `test:<walker_id>` against an API in test auth mode
// SEED_TODAY   the day to build the week around, YYYY-MM-DD (default: today in SEED_TZ)
// SEED_TZ      the walker's IANA zone (default Europe/London)
// SEED_OUT     where to write the ids (default e2e/.seed.json)
//
// Deterministic relative to SEED_TODAY: the same clients, dogs and walk times
// every run. Lifecycle timestamps (started_at, completed_at, cancelled_at) are
// set by the API when the actions run, so they are real time, not fixed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const base = process.env.API_URL ?? 'http://localhost:8787';
const clientsUrl = process.env.API_CLIENTS_URL ?? base;
const walksUrl = process.env.API_WALKS_URL ?? base;
const bearer = process.env.SEED_BEARER ?? 'test:walker-demo';
const tz = process.env.SEED_TZ ?? 'Europe/London';
const out = process.env.SEED_OUT ?? 'e2e/.seed.json';
const today = process.env.SEED_TODAY ?? dayIn(tz, new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`SEED_TODAY must be YYYY-MM-DD, got ${today}`);

/** YYYY-MM-DD of an instant in a zone. */
function dayIn(zone, date) {
	return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function shiftDay(day, days) {
	const [y, m, d] = day.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Wall-clock `day` `hh:mm` in `zone` as a UTC ISO instant (two-pass, DST-safe). */
function zoned(day, hm, zone) {
	const [y, m, d] = day.split('-').map(Number);
	const [h, mi] = hm.split(':').map(Number);
	const wall = Date.UTC(y, m - 1, d, h, mi);
	const offset = (ms) => {
		const p = Object.fromEntries(
			new Intl.DateTimeFormat('en-US', {
				timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
				hour: '2-digit', minute: '2-digit', second: '2-digit'
			}).formatToParts(new Date(ms)).map((x) => [x.type, x.value])
		);
		return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
	};
	let o = offset(wall);
	o = offset(wall - o);
	return new Date(wall - o).toISOString();
}

async function call(root, method, path, body) {
	const res = await fetch(root + path, {
		method,
		headers: { authorization: `Bearer ${bearer}`, ...(body ? { 'content-type': 'application/json' } : {}) },
		body: body ? JSON.stringify(body) : undefined
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
	return text ? JSON.parse(text) : null;
}
const clients = (m, p, b) => call(clientsUrl, m, p, b);
const walks = (m, p, b) => call(walksUrl, m, p, b);

const alice = await clients('POST', '/clients', {
	name: 'Alice Ahmed', email: 'alice@example.com', phone: '+44 7700 900001',
	address: '1 Park Lane, Cardiff CF10 3AA', notes: 'Key safe by the back door, code 4821.'
});
const ben = await clients('POST', '/clients', {
	name: 'Ben Brooks', email: 'ben.brooks@example.com', phone: '+44 7700 900002', address: '14 Cathedral Road, Cardiff'
});
const chloe = await clients('POST', '/clients', {
	name: 'Chloe Davies', phone: '+44 7700 900003', address: '7 Llandaff Fields Cottages', notes: "Works nights; text, don't call."
});
const biscuit = await clients('POST', '/dogs', {
	client_id: alice.client_id, name: 'Biscuit', breed: 'Cockapoo', date_of_birth: '2022-05-14', notes: 'Pulls on the lead near squirrels.'
});
const rex = await clients('POST', '/dogs', {
	client_id: alice.client_id, name: 'Rex', breed: 'Labrador', date_of_birth: '2019-09-02', notes: 'Older boy, keep walks under an hour.'
});
const mango = await clients('POST', '/dogs', {
	client_id: ben.client_id, name: 'Mango', breed: 'Border Collie', date_of_birth: '2023-03-30'
});
const pepper = await clients('POST', '/dogs', {
	client_id: chloe.client_id, name: 'Pepper', breed: 'Jack Russell', notes: 'Reactive to other small dogs.'
});

const book = (dogs, day, hm, minutes, notes) =>
	walks('POST', '/walks', {
		scheduled_at: zoned(day, hm, tz), duration_minutes: minutes, dog_ids: dogs.map((d) => d.dog_id), ...(notes ? { notes } : {})
	});
const d0 = today;
const d1 = shiftDay(today, 1);
const d2 = shiftDay(today, 2);

const early = await book([pepper], d0, '07:30', 30, 'Quiet route, avoid the park.');
await walks('POST', `/walks/${early.walk_id}/start`);
await walks('POST', `/walks/${early.walk_id}/complete`, { notes: 'Calm today, no reactions.' });
const inProgress = await book([biscuit, rex], d0, '09:00', 45, 'Meet at the park gate.');
await walks('POST', `/walks/${inProgress.walk_id}/start`);
const scheduled = await book([mango], d0, '13:30', 60, 'Frisbee in Bute Park.');
await book([biscuit, rex], d1, '09:00', 45);
await book([mango], d1, '14:00', 60);
const rained = await book([pepper], d1, '17:00', 30);
await walks('POST', `/walks/${rained.walk_id}/cancel`, { reason: 'bad_weather' });
await book([biscuit], d2, '10:00', 30, 'Vet check first, then a short loop.');

const seed = {
	today,
	tz,
	seededAt: new Date().toISOString(),
	clients: { alice: alice.client_id, ben: ben.client_id, chloe: chloe.client_id },
	dogs: { biscuit: biscuit.dog_id, rex: rex.dog_id, mango: mango.dog_id, pepper: pepper.dog_id },
	walks: { completed: early.walk_id, inProgress: inProgress.walk_id, scheduled: scheduled.walk_id, cancelled: rained.walk_id }
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(seed, null, 2) + '\n');
console.log(`seeded the week of ${today} (${tz}) for ${bearer} -> ${out}`);
