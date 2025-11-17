/**
 * CalcMark Worker Manager
 * Manages Web Worker lifecycle and provides async API for editor
 */

export class CalcMarkWorkerManager {
	private worker: Worker | null = null;
	private nextRequestId = 0;
	private pendingRequests = new Map<
		number,
		{
			resolve: (result: unknown) => void;
			reject: (error: Error) => void;
			timestamp: number;
		}
	>();
	private initialized = false;
	private initPromise: Promise<void> | null = null;
	private initResolve: (() => void) | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.initWorker();
		}
	}

	private initWorker() {
		// Create promise that resolves when worker is initialized
		this.initPromise = new Promise((resolve) => {
			this.initResolve = resolve;
		});

		// Use Vite's worker import syntax
		this.worker = new Worker(new URL('../workers/calcmark.worker.ts', import.meta.url), {
			type: 'module'
		});

		this.worker.addEventListener('message', (event) => {
			const { type, id, results, error } = event.data;

			if (type === 'init-complete') {
				this.initialized = true;
				if (this.initResolve) {
					this.initResolve();
					this.initResolve = null;
				}
				return;
			}

			if (type === 'result' && id !== undefined) {
				const pending = this.pendingRequests.get(id);
				if (pending) {
					pending.resolve(results);
					this.pendingRequests.delete(id);
				}
			}

			if (type === 'error' && id !== undefined) {
				console.error('[WorkerManager] Received error for request', id, ':', error);
				const pending = this.pendingRequests.get(id);
				if (pending) {
					pending.reject(new Error(error));
					this.pendingRequests.delete(id);
				}
			}
		});

		this.worker.addEventListener('error', (error) => {
			console.error('[WorkerManager] Worker error:', error);
			console.error('[WorkerManager] Error details:', {
				message: error.message,
				filename: error.filename,
				lineno: error.lineno,
				colno: error.colno
			});
			// Reject all pending requests
			for (const [id, pending] of this.pendingRequests) {
				pending.reject(new Error('Worker error'));
				this.pendingRequests.delete(id);
			}
		});

		// Initialize worker
		this.worker.postMessage({ type: 'init' });
	}

	/**
	 * Wait for worker to finish initialization
	 * Safe to call multiple times - returns immediately if already initialized
	 */
	async waitForInit(): Promise<void> {
		// If running on server (no window), resolve immediately
		if (typeof window === 'undefined') {
			return;
		}

		if (this.initialized) {
			return;
		}
		if (this.initPromise) {
			return this.initPromise;
		}
		throw new Error('Worker not initialized - this should not happen');
	}

	/**
	 * Evaluate CalcMark input in background worker
	 * Returns a promise that resolves with syntax highlighting data
	 */
	async evaluate(input: string, offset: number = 0): Promise<unknown> {
		if (!this.worker) {
			throw new Error('Worker not initialized');
		}

		const id = this.nextRequestId++;
		const timestamp = Date.now();

		// Cancel older pending requests (they're stale)
		for (const [oldId, pending] of this.pendingRequests) {
			if (oldId < id) {
				pending.reject(new Error('Cancelled by newer request'));
				this.pendingRequests.delete(oldId);
			}
		}

		return new Promise((resolve, reject) => {
			this.pendingRequests.set(id, { resolve, reject, timestamp });

			this.worker!.postMessage({
				type: 'evaluate',
				id,
				input,
				offset
			});

			// Timeout after 5 seconds
			setTimeout(() => {
				if (this.pendingRequests.has(id)) {
					this.pendingRequests.delete(id);
					reject(new Error('Evaluation timeout'));
				}
			}, 5000);
		});
	}

	/**
	 * Terminate the worker (cleanup)
	 */
	terminate() {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		this.pendingRequests.clear();
	}
}

/**
 * Factory function to create a new worker manager instance
 * Each Editor component should get its own dedicated worker
 * This ensures:
 * 1. Predictable initialization per component
 * 2. Clean lifecycle management (worker terminated when component unmounts)
 * 3. Support for multiple editors on same page
 * 4. No state pollution across page navigations
 */
export function createWorkerManager(): CalcMarkWorkerManager {
	return new CalcMarkWorkerManager();
}
