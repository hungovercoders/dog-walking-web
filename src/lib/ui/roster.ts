import type { Client, Dog, Walk } from '$lib/api';

/** A dog with its owner attached. */
export interface RosterDog extends Dog {
	client?: Client;
}

export interface Roster {
	dogs: Record<string, RosterDog>;
	clients: Record<string, Client>;
}

export function buildRoster(dogs: readonly Dog[], clients: readonly Client[]): Roster {
	const byClient = Object.fromEntries(clients.map((c) => [c.client_id, c]));
	return {
		clients: byClient,
		dogs: Object.fromEntries(dogs.map((d) => [d.dog_id, { ...d, client: byClient[d.client_id] }]))
	};
}

/** Who a walk is for: its dogs (a removed dog reads "Unknown dog") and the
 * clients to collect them from, in the order their dogs appear. */
export interface WalkParty {
	dogs: { id: string; name: string; dog?: RosterDog }[];
	clients: { client: Client; dogs: RosterDog[] }[];
}

export function walkParty(walk: Pick<Walk, 'dog_ids'>, roster: Roster): WalkParty {
	const dogs = walk.dog_ids.map((id) => {
		const dog = roster.dogs[id];
		return { id, name: dog?.name ?? 'Unknown dog', dog };
	});
	const clients: WalkParty['clients'] = [];
	for (const { dog } of dogs) {
		if (!dog?.client) continue;
		const group = clients.find((g) => g.client.client_id === dog.client!.client_id);
		if (group) group.dogs.push(dog);
		else clients.push({ client: dog.client, dogs: [dog] });
	}
	return { dogs, clients };
}

/** The first line of an address, for a card: "1 Park Lane, Cardiff CF10 3AA" -> "1 Park Lane". */
export function shortAddress(address: string | undefined): string | undefined {
	const first = address?.split(/[,\n]/)[0]?.trim();
	return first || undefined;
}

/** "Alice Ahmed · 1 Park Lane" for one client, "Alice Ahmed, Ben Brooks" for several. */
export function pickupLine(party: WalkParty): string | undefined {
	if (party.clients.length === 0) return undefined;
	if (party.clients.length === 1) {
		const { client } = party.clients[0];
		const where = shortAddress(client.address);
		return where ? `${client.name} · ${where}` : client.name;
	}
	return party.clients.map((g) => g.client.name).join(', ');
}

/** Dogs grouped under their clients for a picker: clients A–Z, dogs A–Z. */
export function dogsByClient(roster: Roster): { client: Client | undefined; dogs: RosterDog[] }[] {
	const groups = new Map<string, { client: Client | undefined; dogs: RosterDog[] }>();
	for (const dog of Object.values(roster.dogs)) {
		const key = dog.client_id;
		const group = groups.get(key) ?? { client: dog.client, dogs: [] };
		group.dogs.push(dog);
		groups.set(key, group);
	}
	const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
	return [...groups.values()]
		.map((g) => ({ ...g, dogs: g.dogs.sort((a, b) => byName(a.name, b.name)) }))
		.sort((a, b) => byName(a.client?.name ?? '~', b.client?.name ?? '~'));
}
