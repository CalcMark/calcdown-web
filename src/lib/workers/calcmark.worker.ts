/**
 * CalcMark Web Worker
 * Runs WASM evaluation in background thread to prevent blocking UI
 */

import { processCalcMark, initCalcMark } from '../client/calcmark.js';

// Message types
interface EvaluateMessage {
	type: 'evaluate';
	id: number;
	input: string;
	offset: number;
}

interface InitMessage {
	type: 'init';
}

type WorkerMessage = EvaluateMessage | InitMessage;

// Initialize WASM when worker starts
let initialized = false;

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
	const message = event.data;

	try {
		if (message.type === 'init') {
			console.log('[Worker] Initializing CalcMark WASM...');
			if (!initialized) {
				await initCalcMark();
				initialized = true;
				console.log('[Worker] ✓ CalcMark WASM initialized');
			}
			self.postMessage({ type: 'init-complete' });
			return;
		}

		if (message.type === 'evaluate') {
			console.log('[Worker] Evaluating input, length:', message.input.length);
			if (!initialized) {
				console.log('[Worker] WASM not initialized, initializing now...');
				await initCalcMark();
				initialized = true;
				console.log('[Worker] ✓ WASM initialized');
			}

			const results = await processCalcMark(message.input);
			console.log('[Worker] ✓ Evaluation complete, sending results');

			self.postMessage({
				type: 'result',
				id: message.id,
				results
			});
		}
	} catch (error) {
		console.error('[Worker] Error:', error);
		self.postMessage({
			type: 'error',
			id: (message as EvaluateMessage).id,
			error: error instanceof Error ? error.message : String(error)
		});
	}
});
