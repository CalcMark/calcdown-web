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
	version?: number; // Incremented when line data changes (for Svelte reactivity)
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
			classification: null,
			version: 0
		}));
	}

	// === Text Management ===

	getRawText(): string {
		return this.state.rawText;
	}

	updateRawText(newText: string): void {
		this.state.rawText = newText;

		// Parse new lines
		const newLines = this.parseLines(newText);

		// Preserve existing metadata (classification, tokens, diagnostics, results) for unchanged lines
		// This prevents syntax highlighting from disappearing while typing
		// IMPORTANT: Reuse old Line objects for unchanged lines to prevent Svelte re-renders
		const oldLines = this.state.lines;

		for (let i = 0; i < newLines.length; i++) {
			if (i < oldLines.length && oldLines[i].rawContent === newLines[i].rawContent) {
				// Line content hasn't changed - reuse the old Line object entirely
				// This prevents Svelte from re-rendering this line
				newLines[i] = oldLines[i];
			}
			// If line content changed or is new, use the new Line object (classification: null)
		}

		this.state.lines = newLines;
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
				const line = this.state.lines[index];
				// Only increment version if classification actually changed
				if (line.classification !== classification.lineType) {
					line.classification = classification.lineType;
					line.version = (line.version || 0) + 1;
				}
			}
		});
	}

	// === Tokenization (from client WASM) ===

	updateTokens(lineNumber: number, tokens: Token[]): void {
		if (this.state.lines[lineNumber]) {
			const line = this.state.lines[lineNumber];
			line.tokens = tokens;
			line.version = (line.version || 0) + 1;
		}
	}

	// === Diagnostics (from client WASM) ===

	updateDiagnostics(diagnosticsByLine: Record<number, Diagnostic[]>): void {
		for (const [lineStr, diagnostics] of Object.entries(diagnosticsByLine)) {
			const lineNumber = Number(lineStr);
			if (this.state.lines[lineNumber]) {
				const line = this.state.lines[lineNumber];
				line.diagnostics = diagnostics;
				line.version = (line.version || 0) + 1;
			}
		}
	}

	// === Evaluation Results (from server) ===

	/**
	 * Convert server line numbers to document line numbers.
	 *
	 * IMPORTANT: Different server endpoints return different line number formats:
	 * - evaluateDocument(): Returns 1-indexed line numbers (OriginalLine starts at 1)
	 * - validate() (diagnostics): Returns 0-indexed line numbers (starts at 0)
	 * - tokensByLine: Server-built with i+1, so 1-indexed
	 *
	 * @param serverLineNumber - Line number from server (check source to determine if 0 or 1 indexed)
	 * @param isOneIndexed - true if server uses 1-indexed (evaluateDocument, tokensByLine), false if 0-indexed (validate/diagnostics)
	 * @param viewportOffset - First line number in document (0-indexed) that corresponds to line 1 in viewport
	 * @returns Document line number (0-indexed)
	 */
	static serverLineToDocumentLine(serverLineNumber: number, isOneIndexed: boolean, viewportOffset: number): number {
		return isOneIndexed
			? serverLineNumber - 1 + viewportOffset  // Convert 1-indexed to 0-indexed, then add offset
			: serverLineNumber + viewportOffset;      // Already 0-indexed, just add offset
	}

	updateEvaluationResults(
		results: EvaluationResult[],
		variableContext: Record<string, EvaluationResult>,
		offset: number
	): void {
		// Clear previous calculation results and increment version for lines that had results
		this.state.lines.forEach((line) => {
			if (line.calculationResult !== undefined) {
				line.calculationResult = undefined;
				line.version = (line.version || 0) + 1;
			}
		});

		// Update with new results
		// NOTE: evaluateDocument() returns 1-indexed line numbers
		results.forEach((result) => {
			const documentLineNumber = CalcMarkDocument.serverLineToDocumentLine(result.OriginalLine, true, offset);
			if (this.state.lines[documentLineNumber]) {
				const line = this.state.lines[documentLineNumber];
				const oldValue = line.calculationResult?.Value?.Value;
				const newValue = result.Value?.Value;

				// Always update the result
				line.calculationResult = result;

				// Increment version if the value actually changed
				// This ensures dependent calculations re-render when upstream values change
				if (oldValue !== newValue) {
					line.version = (line.version || 0) + 1;
				}
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
		const viewportLines = this.state.lines.slice(range.start, range.end + 1).map((l) => l.rawContent);

		return {
			text: viewportLines.join('\n'),
			offset: range.start // First line number in document (0-indexed) that corresponds to line 1 in viewport
		};
	}

	// === Cursor Management ===

	setCursor(line: number, offset: number): void {
		this.state.cursor = { line, offset };
	}

	getCursor(): { line: number; offset: number } | null {
		return this.state.cursor;
	}

	/**
	 * Update cursor position from absolute character position in the textarea.
	 *
	 * @param absolutePosition - Absolute character position in the entire document
	 * @param recalculateLine - If true, recalculate which line the cursor is on.
	 *                          If false, keep cursor on same line and only update offset.
	 *                          This prevents cursor jumping when typing regular characters.
	 * @returns The current cursor line and offset
	 */
	updateCursorFromAbsolutePosition(absolutePosition: number, recalculateLine: boolean = true): { line: number; offset: number } {
		let line: number;
		let offset: number;

		if (recalculateLine || this.state.cursor === null) {
			// Explicit navigation or first time: recalculate line number
			const result = this.getLineFromPosition(absolutePosition);
			line = result.line;
			offset = result.offset;
		} else {
			// Typing on same line: keep line number, only update offset
			line = this.state.cursor.line;

			// Validate that the line still exists
			if (line >= this.state.lines.length) {
				// Line was deleted, fallback to recalculate
				const result = this.getLineFromPosition(absolutePosition);
				line = result.line;
				offset = result.offset;
			} else {
				// Calculate offset within the current line
				const lineStart = this.getAbsolutePosition(line, 0);
				offset = absolutePosition - lineStart;

				// Validate offset is within line bounds
				const lineLength = this.state.lines[line].rawContent.length;
				if (offset < 0 || offset > lineLength) {
					// Offset out of bounds, fallback to recalculate
					const result = this.getLineFromPosition(absolutePosition);
					line = result.line;
					offset = result.offset;
				}
			}
		}

		this.state.cursor = { line, offset };
		return { line, offset };
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
