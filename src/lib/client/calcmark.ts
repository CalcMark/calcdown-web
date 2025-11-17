/**
 * Client-side CalcMark WASM loader
 * Runs in browser for instant syntax highlighting and evaluation
 *
 * This mirrors the server-side implementation but runs in the browser.
 * Web Workers prevent blocking the main thread during evaluation.
 */

import type { Diagnostic, Token, EvaluationResult } from '$lib/state/CalcMarkDocument';

// Import WASM using Vite's special imports
import wasmExecCode from '../wasm/wasm_exec.js?raw';
import wasmUrl from '../wasm/calcmark.wasm?url';

interface CalcMarkAPI {
	tokenize(source: string): { tokens: string; error: string | null };
	evaluate(source: string, useGlobalContext: boolean): { results: string; error: string | null };
	evaluateDocument(
		source: string,
		useGlobalContext: boolean
	): { results: string; error: string | null };
	validate(source: string): { diagnostics: string; error: string | null };
	classifyLines(lines: string[]): { classifications: string; error: string | null };
	resetContext(): void;
	getVersion(): string;
}

interface WasmLineDiagnostics {
	Diagnostics: Diagnostic[];
}

type WasmDiagnosticsByLine = Record<number, WasmLineDiagnostics>;
type DiagnosticsByLine = Record<number, Diagnostic[]>;
type TokensByLine = Record<number, Token[]>;
type VariableContext = Record<string, EvaluationResult>;

declare global {
	var calcmark: CalcMarkAPI | undefined;
	var Go: {
		new (): {
			importObject: WebAssembly.Imports;
			run(instance: WebAssembly.Instance): Promise<void>;
		};
	};
}

let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null = null;

/**
 * Initialize CalcMark WASM in the browser
 */
export async function initCalcMark(): Promise<void> {
	if (wasmInitialized) return;
	if (wasmInitPromise) return wasmInitPromise;

	wasmInitPromise = (async () => {
		try {
			// Load Go's WASM runtime
			// Use indirect eval to execute in global scope
			(0, eval)(wasmExecCode);

			// Fetch and instantiate WASM
			const response = await fetch(wasmUrl);
			const wasmBuffer = await response.arrayBuffer();

			const go = new globalThis.Go();
			const { instance } = await WebAssembly.instantiate(wasmBuffer, go.importObject);

			// Run Go program (sets up globalThis.calcmark)
			go.run(instance);

			// Wait for initialization
			await new Promise((resolve) => setTimeout(resolve, 100));

			if (!globalThis.calcmark) {
				throw new Error('CalcMark API not initialized');
			}

			wasmInitialized = true;
			console.log('✓ CalcMark WASM initialized in browser');
		} catch (error) {
			wasmInitPromise = null;
			throw error;
		}
	})();

	return wasmInitPromise;
}

/**
 * Get the CalcMark API (ensures WASM is initialized)
 */
export async function getCalcMark(): Promise<CalcMarkAPI> {
	await initCalcMark();
	if (!globalThis.calcmark) {
		throw new Error('CalcMark API not available');
	}
	return globalThis.calcmark;
}

/**
 * Transform WASM diagnostic structure to frontend-expected structure
 */
function transformDiagnostics(wasmDiagnostics: WasmDiagnosticsByLine): DiagnosticsByLine {
	const result: DiagnosticsByLine = {};
	for (const [lineNumberStr, lineData] of Object.entries(wasmDiagnostics)) {
		const lineNumber = Number(lineNumberStr);
		result[lineNumber] = lineData.Diagnostics;
	}
	return result;
}

/**
 * Process CalcMark input and return all results
 * This is the client-side version that runs instantly without network calls
 */
export async function processCalcMark(input: string) {
	const api = await getCalcMark();
	const lines = input.split('\n');

	// Step 1: Classify lines
	const classifyResult = api.classifyLines(lines);
	const classifications = classifyResult.error ? [] : JSON.parse(classifyResult.classifications);

	// Step 2: Tokenize calculation lines only
	const tokensByLine: TokensByLine = {};
	for (let i = 0; i < lines.length; i++) {
		const classification = classifications[i];
		const lineNumber = i + 1;

		if (classification && classification.lineType === 'CALCULATION') {
			const tokenResult = api.tokenize(lines[i]);
			if (!tokenResult.error && tokenResult.tokens) {
				tokensByLine[lineNumber] = JSON.parse(tokenResult.tokens);
			}
		}
	}

	// Step 3: Evaluate document
	api.resetContext();
	const evalResult = api.evaluateDocument(input, true);
	const evaluationResults: EvaluationResult[] = evalResult.error
		? []
		: JSON.parse(evalResult.results);

	// Step 4: Build variable context
	const resultsByLine = evaluationResults;
	const variableContext: VariableContext = {};

	for (const result of evaluationResults) {
		const lineNumber = result.OriginalLine;
		const tokens = tokensByLine[lineNumber] || [];
		const assignToken = tokens.find((t) => t.type === 'ASSIGN');
		if (assignToken) {
			const varToken = tokens.find((t) => t.type === 'IDENTIFIER' && t.start < assignToken.start);
			if (varToken) {
				variableContext[varToken.value] = result;
			}
		}
	}

	// Step 5: Validate
	const validateResult = api.validate(input);
	const rawDiagnostics: WasmDiagnosticsByLine = validateResult.error
		? {}
		: JSON.parse(validateResult.diagnostics);
	const diagnostics = transformDiagnostics(rawDiagnostics);

	return {
		classifications,
		tokensByLine,
		evaluationResults: resultsByLine,
		diagnostics,
		variableContext
	};
}
