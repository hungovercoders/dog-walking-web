/** Pure helpers for the clients pages: roster search, counts, contact links. */

export interface RosterDog {
	dog_id: string;
	name: string;
}

export interface RosterClient {
	client_id: string;
	name: string;
	dogs: RosterDog[];
}

/** Clients whose name, or one of whose dogs' names, contains the query
 * (case-insensitive, trimmed). An empty query keeps everyone. */
export function filterRoster<T extends RosterClient>(clients: readonly T[], query: string): T[] {
	const q = query.trim().toLocaleLowerCase();
	if (!q) return [...clients];
	return clients.filter(
		(c) => c.name.toLocaleLowerCase().includes(q) || c.dogs.some((d) => d.name.toLocaleLowerCase().includes(q))
	);
}

export function rosterCounts(clients: readonly RosterClient[]): { clients: number; dogs: number } {
	return { clients: clients.length, dogs: clients.reduce((n, c) => n + c.dogs.length, 0) };
}

function plural(n: number, one: string, many: string): string {
	return `${n} ${n === 1 ? one : many}`;
}

/** "12 clients · 19 dogs" */
export function countLine(counts: { clients: number; dogs: number }): string {
	return `${plural(counts.clients, 'client', 'clients')} · ${plural(counts.dogs, 'dog', 'dogs')}`;
}

/** "1 result", "3 results" — announced while searching. */
export function resultsLabel(n: number): string {
	return plural(n, 'result', 'results');
}

/** The confirm text for removing a client, naming what goes with them. */
export function removeClientPrompt(name: string, dogCount: number): string {
	if (dogCount === 0) return `Remove ${name}?`;
	return `Remove ${name} and their ${plural(dogCount, 'dog', 'dogs')}?`;
}

/** The first non-empty line of a note. */
export function firstLine(text: string | undefined): string {
	return (text ?? '').split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? '';
}

/** A dialable number for tel:/sms: links: digits and a leading plus only. */
export function dialable(phone: string): string {
	const trimmed = phone.trim();
	return (trimmed.startsWith('+') ? '+' : '') + trimmed.replace(/\D/g, '');
}

export function mapsUrl(address: string): string {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}
