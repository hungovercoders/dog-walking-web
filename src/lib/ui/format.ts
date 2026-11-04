/** Join the non-empty parts of a meta line with a spaced middle dot:
 * "45 min · Meet at the park gate.". Built in code, not markup, so no
 * whitespace is lost at a template block boundary. */
export function joinMeta(...parts: (string | number | null | undefined | false)[]): string {
	return parts
		.filter((p): p is string | number => p !== null && p !== undefined && p !== false && String(p).trim() !== '')
		.map((p) => String(p).trim())
		.join(' · ');
}

/** Initials for an avatar: "Biscuit" -> "B", "Alice Ahmed" -> "AA". */
export function initials(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return '?';
	const letters = words.length === 1 ? [words[0][0]] : [words[0][0], words[words.length - 1][0]];
	return letters.join('').toUpperCase();
}

/**
 * A stable avatar colour for an id. The palette is dark enough that white
 * initials meet 4.5:1 on every swatch (lowest measured 6.0:1).
 */
export const AVATAR_COLOURS = ['#1f6f5f', '#3a5a9f', '#8a3f7a', '#9a4a1c', '#2f6b2f', '#5b4a9a', '#7a5a14', '#a3321f'] as const;

export function avatarColour(id: string): string {
	let hash = 0;
	for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
	return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}
