/**
 * Line Context State Management
 *
 * Provides reactive access to the current line's context based on cursor or hover position.
 * This is a Svelte 5 runes-based module that returns functionally pure line context data.
 *
 * Usage:
 *   const lineContext = new LineContext(document);
 *   lineContext.setHoveredLine(5);
 *   const context = lineContext.getCurrentContext(); // Returns full Line data
 */

import type { CalcMarkDocument, Line } from './CalcMarkDocument';

export interface LineContextData {
	lineNumber: number | null;
	line: Line | null;
}

export class LineContext {
	// Current hover state
	private hoveredLineNumber = $state<number | null>(null);

	// Current cursor state (could be extended later)
	private cursorLineNumber = $state<number | null>(null);

	// Reference to document for lookups
	private document: CalcMarkDocument;

	constructor(document: CalcMarkDocument) {
		this.document = document;
	}

	/**
	 * Set the currently hovered line number
	 */
	setHoveredLine(lineNumber: number | null): void {
		this.hoveredLineNumber = lineNumber;
	}

	/**
	 * Get the currently hovered line number
	 */
	getHoveredLineNumber(): number | null {
		return this.hoveredLineNumber;
	}

	/**
	 * Set the current cursor line number
	 */
	setCursorLine(lineNumber: number | null): void {
		this.cursorLineNumber = lineNumber;
	}

	/**
	 * Get the current cursor line number
	 */
	getCursorLineNumber(): number | null {
		return this.cursorLineNumber;
	}

	/**
	 * Get the current line context (hover takes precedence over cursor)
	 * This is a reactive derived value that returns full line data including:
	 * - lineNumber
	 * - rawContent
	 * - classification (MARKDOWN, CALCULATION, BLANK)
	 * - tokens (if available)
	 * - diagnostics (if any)
	 * - calculationResult (if evaluated)
	 */
	getCurrentContext = $derived.by((): LineContextData => {
		const lineNumber = this.hoveredLineNumber ?? this.cursorLineNumber;

		if (lineNumber === null) {
			return { lineNumber: null, line: null };
		}

		const line = this.document.getLine(lineNumber);

		return {
			lineNumber,
			line: line ?? null
		};
	});

	/**
	 * Get context for a specific line (useful for overlays that need adjacent line data)
	 */
	getContextForLine(lineNumber: number): LineContextData {
		const line = this.document.getLine(lineNumber);
		return {
			lineNumber,
			line: line ?? null
		};
	}

	/**
	 * Check if a specific line is currently hovered
	 */
	isLineHovered(lineNumber: number): boolean {
		return this.hoveredLineNumber === lineNumber;
	}

	/**
	 * Check if a specific line is the cursor line
	 */
	isLineCursor(lineNumber: number): boolean {
		return this.cursorLineNumber === lineNumber;
	}
}
