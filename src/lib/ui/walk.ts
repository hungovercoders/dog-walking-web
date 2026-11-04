import { CANCELLATION_REASONS, type CancellationReason, type WalkStatus } from '$lib/api';
import type { IconName } from './Icon.svelte';

export const STATUS_META: Record<WalkStatus, { label: string; icon: IconName }> = {
	scheduled: { label: 'Scheduled', icon: 'clock' },
	in_progress: { label: 'In progress', icon: 'play' },
	completed: { label: 'Completed', icon: 'check' },
	cancelled: { label: 'Cancelled', icon: 'x' }
};

export function reasonLabel(reason: CancellationReason | undefined): string | undefined {
	return CANCELLATION_REASONS.find((r) => r.value === reason)?.label;
}

export function isOpen(status: WalkStatus): boolean {
	return status === 'scheduled' || status === 'in_progress';
}
