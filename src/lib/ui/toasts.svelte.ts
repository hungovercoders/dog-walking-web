import type { ToastMessage } from './feedback';

export interface Toast extends ToastMessage {
	id: number;
}

/** Browser-only toast queue; the layout's Toaster renders it in a live region. */
class Toasts {
	items = $state<Toast[]>([]);
	#next = 0;

	push(message: ToastMessage, ms = 4000) {
		const id = ++this.#next;
		this.items = [...this.items, { ...message, id }];
		setTimeout(() => this.dismiss(id), ms);
	}

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toasts = new Toasts();
