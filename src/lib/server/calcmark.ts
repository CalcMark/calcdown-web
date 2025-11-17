/**
 * Server-side CalcMark WASM loader
 * Loads and initializes the WASM module once on server startup
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join } from 'path';
import type { Diagnostic, Token, EvaluationResult } from '$lib/stores/blockStore.svelte';

// Import wasm_exec.js as raw text - Vite will inline it into the bundle
// @ts-expect-error - Vite special import
import wasmExecCode from '../wasm/wasm_exec.js?raw';
// Import WASM file as URL - Vite will copy it and provide the path
// @ts-expect-error - Vite special import
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

// WASM returns diagnostics wrapped in a container object per line
interface WasmLineDiagnostics {
	Diagnostics: Diagnostic[];
}

// WASM diagnostic response structure: { lineNumber: { Diagnostics: [...] } }
type WasmDiagnosticsByLine = Record<number, WasmLineDiagnostics>;

// Frontend expects: { lineNumber: [...] }
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
 * Initialize the CalcMark WASM module
 * Only runs once, subsequent calls return immediately
 */
export async function initCalcMark(): Promise<void> {
	if (wasmInitialized) return;
	if (wasmInitPromise) return wasmInitPromise;

	wasmInitPromise = (async () => {
		try {
			// Load wasm_exec.js (Go's WASM runtime)
			// wasmExecCode is inlined as string by Vite's ?raw import
			// Use indirect eval to execute in global scope
			(0, eval)(wasmExecCode);

			// Load WASM file
			// wasmUrl is provided by Vite's ?url import:
			// - In dev: file:// URL pointing to source
			// - In build: web path like /_app/immutable/assets/calcmark.xxx.wasm
			let wasmPath: string;
			if (wasmUrl.startsWith('file://')) {
				// Development: convert file:// URL to filesystem path
				wasmPath = fileURLToPath(wasmUrl);
			} else if (wasmUrl.startsWith('/')) {
				// Production: web path, resolve to filesystem
				// In Vercel/serverless: process.cwd() is the function directory
				// In local preview: need to look in .svelte-kit/output/server
				const locations = [
					join(process.cwd(), wasmUrl), // Vercel runtime
					join(process.cwd(), '.svelte-kit', 'output', 'server', wasmUrl) // Local preview
				];

				// Find the first location that exists
				let foundPath: string | undefined;
				for (const loc of locations) {
					try {
						await readFile(loc);
						foundPath = loc;
						break;
					} catch {
						// Continue to next location
					}
				}

				wasmPath = foundPath || locations[0]; // Fallback to first if none found
			} else {
				// Already a filesystem path
				wasmPath = wasmUrl;
			}

			const wasmBuffer = await readFile(wasmPath);

			// Instantiate WASM
			const go = new global.Go();
			const { instance } = await WebAssembly.instantiate(wasmBuffer, go.importObject);

			// Run Go program (sets up global.calcmark)
			go.run(instance);

			// Wait for initialization
			await new Promise((resolve) => setTimeout(resolve, 100));

			if (!global.calcmark) {
				throw new Error('CalcMark API not initialized');
			}

			wasmInitialized = true;
			console.log('✓ CalcMark WASM initialized on server');
		} catch (error) {
			wasmInitPromise = null;
			throw error;
		}
	})();

	return wasmInitPromise;
}

/**
 * Transform WASM diagnostic structure to frontend-expected structure
 * @param wasmDiagnostics - Diagnostics from WASM: { lineNumber: { Diagnostics: [...] } }
 * @returns Transformed diagnostics: { lineNumber: [...] }
 */
function transformDiagnostics(wasmDiagnostics: WasmDiagnosticsByLine): DiagnosticsByLine {
	const result: DiagnosticsByLine = {};

	for (const [lineNumberStr, lineData] of Object.entries(wasmDiagnostics)) {
		const lineNumber = Number(lineNumberStr);
		// Extract the Diagnostics array from the wrapper object
		result[lineNumber] = lineData.Diagnostics;
	}

	return result;
}

/**
 * Get the CalcMark API (ensures WASM is initialized)
 */
export async function getCalcMark(): Promise<CalcMarkAPI> {
	await initCalcMark();
	if (!global.calcmark) {
		throw new Error('CalcMark API not available');
	}

	// Debug: log available functions
	console.log('[getCalcMark] Available functions:', Object.keys(global.calcmark));

	return global.calcmark;
}

/**
 * Process CalcMark input and return all results
 */
export async function processCalcMark(input: string) {
	console.log('[processCalcMark] START - input length:', input.length);
	const api = await getCalcMark();

	const lines = input.split('\n');
	console.log('[processCalcMark] Split into', lines.length, 'lines');

	// Step 1: Classify lines
	const classifyResult = api.classifyLines(lines);
	const classifications = classifyResult.error ? [] : JSON.parse(classifyResult.classifications);

	// Step 2: Tokenize calculation lines only
	// Returns tokens grouped by line number (1-indexed)
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

	// Step 3: Evaluate (single pass for entire document using evaluateDocument)
	// This function handles markdown + calculations properly by classifying first
	// CRITICAL: Reset context before evaluation to ensure fresh variable context
	// Without this, variables from previous evaluations persist and cause stale results
	api.resetContext();
	const evalResult = api.evaluateDocument(input, true);
	if (evalResult.error) {
		console.log('[processCalcMark] EVALUATION ERROR:', evalResult.error);
	}
	const evaluationResults: EvaluationResult[] = evalResult.error
		? []
		: JSON.parse(evalResult.results);
	console.log('[processCalcMark] Evaluation results count:', evaluationResults.length);

	// Map evaluation results to line numbers and build variable context
	// evaluateDocument already provides OriginalLine, so we just need to build variableContext
	const resultsByLine = evaluationResults; // Already has OriginalLine from evaluateDocument
	const variableContext: VariableContext = {}; // varName -> {Value, Symbol, SourceFormat}

	console.log(
		'[processCalcMark] Building variableContext from',
		evaluationResults.length,
		'results'
	);
	for (const result of evaluationResults) {
		const lineNumber = result.OriginalLine;
		const tokens = tokensByLine[lineNumber] || [];
		const assignToken = tokens.find((t) => t.type === 'ASSIGN');
		if (assignToken) {
			// First token before ASSIGN is the variable name
			const varToken = tokens.find((t) => t.type === 'IDENTIFIER' && t.start < assignToken.start);
			if (varToken) {
				console.log('Adding to variableContext:', varToken.value, '=', result);
				variableContext[varToken.value] = result;
			} else {
				console.log(
					'No IDENTIFIER token before ASSIGN on line',
					lineNumber,
					'tokens:',
					tokens.map((t) => `${t.type}:${t.value}`)
				);
			}
		}
	}
	console.log(
		'[processCalcMark] Final variableContext has',
		Object.keys(variableContext).length,
		'variables'
	);

	// Step 4: Validate
	const validateResult = api.validate(input);
	const rawDiagnostics: WasmDiagnosticsByLine = validateResult.error
		? {}
		: JSON.parse(validateResult.diagnostics);

	// Transform diagnostics structure from { lineNumber: { Diagnostics: [...] } }
	// to { lineNumber: [...] } to match frontend expectations
	const diagnostics = transformDiagnostics(rawDiagnostics);

	const response = {
		classifications,
		tokensByLine,
		evaluationResults: resultsByLine,
		diagnostics,
		variableContext
	};
	console.log(
		'[processCalcMark] Returning variableContext:',
		JSON.stringify(variableContext),
		'Keys:',
		Object.keys(variableContext)
	);
	return response;
}
