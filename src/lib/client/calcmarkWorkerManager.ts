/**
 * CalcMark Worker Manager
 * Manages Web Worker lifecycle and provides async API for editor
 */

type EvaluationResult = any; // Import from your types

export class CalcMarkWorkerManager {
	private worker: Worker | null = null;
	private nextRequestId = 0;
	private pendingRequests = new Map<
		number,
		{
			resolve: (result: any) => void;
			reject: (error: Error) => void;
			timestamp: number;
		}
	>();
	private initialized = false;

	constructor() {
		if (typeof window !== 'undefined') {
			this.initWorker();
		}
	}

	private initWorker() {
		// Use Vite's worker import syntax
		this.worker = new Worker(new URL('../workers/calcmark.worker.ts', import.meta.url), {
			type: 'module'
		});

		this.worker.addEventListener('message', (event) => {
			const { type, id, results, error } = event.data;

			if (type === 'init-complete') {
				this.initialized = true;
				console.log('[WorkerManager] ✓ CalcMark worker initialized');
				return;
			}

			if (type === 'result' && id !== undefined) {
				console.log('[WorkerManager] Received result for request', id);
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
	 * Evaluate CalcMark input in background worker
	 * Returns a promise that resolves with syntax highlighting data
	 */
	async evaluate(input: string, offset: number = 0): Promise<any> {
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

// Singleton instance
let workerManager: CalcMarkWorkerManager | null = null;

export function getWorkerManager(): CalcMarkWorkerManager {
	if (!workerManager) {
		workerManager = new CalcMarkWorkerManager();
	}
	return workerManager;
}
