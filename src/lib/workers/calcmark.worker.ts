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
			if (!initialized) {
				await initCalcMark();
				initialized = true;
			}
			self.postMessage({ type: 'init-complete' });
			return;
		}

		if (message.type === 'evaluate') {
			if (!initialized) {
				await initCalcMark();
				initialized = true;
			}

			const results = await processCalcMark(message.input);

			self.postMessage({
				type: 'result',
				id: message.id,
				results
			});
		}
	} catch (error) {
		// Error will be sent to main thread via postMessage
		self.postMessage({
			type: 'error',
			id: (message as EvaluateMessage).id,
			error: error instanceof Error ? error.message : String(error)
		});
	}
});
