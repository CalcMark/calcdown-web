/**
 * Pure state management for CalcMark WYSIWYG editing
 * Browser-independent, fully testable with unit tests
 *
 * This class manages document state but does NOT call WASM directly
 * (WASM calls happen in the component layer)
 *
 * IMPORTANT: Token positions from Go WASM are in RUNES (Unicode code points),
 * but JavaScript string positions are UTF-16 code units.
 * Use unicode.ts utilities to convert between them.
 */

import { runeToUtf16Position, utf16ToRunePosition } from '$lib/utils/unicode';

export interface Token {
	type: string;
	value: string;
	start: number; // Position in RUNES (from Go WASM)
	end: number; // Position in RUNES (from Go WASM)
	originalText?: string;
}

export interface Diagnostic {
	severity: 'error' | 'warning' | 'info';
	message: string;
	range?: {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
}

export interface EvaluationResult {
	OriginalLine: number;
	Value: {
		Value: number | boolean;
		Symbol?: string;
		SourceFormat?: string;
	};
	Symbol?: string;
	SourceFormat?: string;
}

export interface Line {
	lineNumber: number;
	rawContent: string;
	classification: 'MARKDOWN' | 'CALCULATION' | 'BLANK' | null;
	tokens?: Token[];
	diagnostics?: Diagnostic[];
	calculationResult?: EvaluationResult;
}

export interface DocumentState {
	// Source of truth: raw CalcMark text
	rawText: string;

	// Derived state
	lines: Line[];

	// Cursor state (for restoration after render)
	cursor: {
		line: number;
		offset: number; // Character offset within line
	} | null;

	// Viewport for partial evaluation
	viewport: {
		firstVisibleLine: number;
		lastVisibleLine: number;
		bufferLines: number;
	};

	// Evaluation results from server (only calculations)
	evaluationResults: {
		variableContext: Record<string, EvaluationResult>;
		evaluatedRange: { start: number; end: number } | null;
	};
}

export class CalcMarkDocument {
	private state: DocumentState;

	constructor(initialText: string = '') {
		this.state = {
			rawText: initialText,
			lines: this.parseLines(initialText),
			cursor: null,
			viewport: {
				firstVisibleLine: 0,
				lastVisibleLine: 50,
				bufferLines: 10
			},
			evaluationResults: {
				variableContext: {},
				evaluatedRange: null
			}
		};
	}

	private parseLines(text: string): Line[] {
		if (text === '') {
			return [];
		}
		return text.split('\n').map((content, index) => ({
			lineNumber: index,
			rawContent: content,
			classification: null
		}));
	}

	// === Text Management ===

	getRawText(): string {
		return this.state.rawText;
	}

	updateRawText(newText: string): void {
		this.state.rawText = newText;
		this.state.lines = this.parseLines(newText);
	}

	getLines(): Line[] {
		return this.state.lines;
	}

	getLine(lineNumber: number): Line | undefined {
		return this.state.lines[lineNumber];
	}

	// === Classification (from client WASM) ===

	updateClassifications(classifications: Array<{ lineType: 'MARKDOWN' | 'CALCULATION' | 'BLANK'; line: string }>): void {
		classifications.forEach((classification, index) => {
			if (this.state.lines[index]) {
				this.state.lines[index].classification = classification.lineType;
			}
		});
	}

	// === Tokenization (from client WASM) ===

	updateTokens(lineNumber: number, tokens: Token[]): void {
		if (this.state.lines[lineNumber]) {
			this.state.lines[lineNumber].tokens = tokens;
		}
	}

	// === Diagnostics (from client WASM) ===

	updateDiagnostics(diagnosticsByLine: Record<number, Diagnostic[]>): void {
		for (const [lineStr, diagnostics] of Object.entries(diagnosticsByLine)) {
			const lineNumber = Number(lineStr);
			if (this.state.lines[lineNumber]) {
				this.state.lines[lineNumber].diagnostics = diagnostics;
			}
		}
	}

	// === Evaluation Results (from server) ===

	updateEvaluationResults(
		results: EvaluationResult[],
		variableContext: Record<string, EvaluationResult>,
		offset: number
	): void {
		// Clear previous calculation results
		this.state.lines.forEach((line) => {
			line.calculationResult = undefined;
		});

		// Update with new results
		// NOTE: Server returns 1-indexed line numbers, convert to 0-indexed
		results.forEach((result) => {
			const lineNumber = result.OriginalLine - 1 + offset;
			if (this.state.lines[lineNumber]) {
				this.state.lines[lineNumber].calculationResult = result;
			}
		});

		this.state.evaluationResults.variableContext = variableContext;
		this.state.evaluationResults.evaluatedRange = {
			start: offset,
			end: offset + results.length - 1
		};
	}

	getVariableContext(): Record<string, EvaluationResult> {
		return this.state.evaluationResults.variableContext;
	}

	// === Viewport Management ===

	updateViewport(firstVisible: number, lastVisible: number): void {
		this.state.viewport.firstVisibleLine = firstVisible;
		this.state.viewport.lastVisibleLine = lastVisible;
	}

	getEvaluationRange(): { start: number; end: number } {
		const { firstVisibleLine, lastVisibleLine, bufferLines } = this.state.viewport;
		const totalLines = this.state.lines.length;

		if (totalLines === 0) {
			return { start: 0, end: 0 };
		}

		return {
			start: Math.max(0, firstVisibleLine - bufferLines),
			end: Math.min(totalLines - 1, lastVisibleLine + bufferLines)
		};
	}

	getTextForEvaluation(): { text: string; offset: number } {
		const range = this.getEvaluationRange();
		const lines = this.state.lines.slice(range.start, range.end + 1).map((l) => l.rawContent);

		return {
			text: lines.join('\n'),
			offset: range.start
		};
	}

	// === Cursor Management ===

	setCursor(line: number, offset: number): void {
		this.state.cursor = { line, offset };
	}

	getCursor(): { line: number; offset: number } | null {
		return this.state.cursor;
	}

	// === Utilities ===

	getLineCount(): number {
		return this.state.lines.length;
	}

	/**
	 * Convert token positions from runes (Go) to UTF-16 (JavaScript) for a specific line.
	 * This is needed when rendering tokens with correct positions for emoji and international characters.
	 */
	getTokenUtf16Positions(lineNumber: number): Array<{ type: string; value: string; start: number; end: number }> | undefined {
		const line = this.state.lines[lineNumber];
		if (!line || !line.tokens) return undefined;

		const lineText = line.rawContent;

		return line.tokens.map((token) => ({
			type: token.type,
			value: token.value,
			start: runeToUtf16Position(lineText, token.start),
			end: runeToUtf16Position(lineText, token.end)
		}));
	}

	/**
	 * Extract token text from a line using rune positions.
	 * Handles emoji and international characters correctly.
	 */
	getTokenText(lineNumber: number, token: Token): string {
		const line = this.state.lines[lineNumber];
		if (!line) return '';

		const lineText = line.rawContent;
		const utf16Start = runeToUtf16Position(lineText, token.start);
		const utf16End = runeToUtf16Position(lineText, token.end);

		return lineText.substring(utf16Start, utf16End);
	}

	// Get absolute character position from line + offset
	getAbsolutePosition(line: number, offset: number): number {
		let position = 0;

		for (let i = 0; i < line; i++) {
			if (this.state.lines[i]) {
				position += this.state.lines[i].rawContent.length + 1; // +1 for newline
			}
		}

		position += offset;
		return position;
	}

	// Get line + offset from absolute position
	getLineFromPosition(position: number): { line: number; offset: number } {
		let currentPos = 0;

		for (let i = 0; i < this.state.lines.length; i++) {
			const lineLength = this.state.lines[i].rawContent.length + 1; // +1 for newline

			if (currentPos + lineLength > position) {
				return { line: i, offset: position - currentPos };
			}

			currentPos += lineLength;
		}

		// Position is beyond end of document
		const lastLine = this.state.lines.length - 1;
		return {
			line: lastLine,
			offset: this.state.lines[lastLine]?.rawContent.length || 0
		};
	}

	// Serialization for debugging
	toJSON() {
		return this.state;
	}
}
