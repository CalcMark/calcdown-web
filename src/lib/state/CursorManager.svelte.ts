/**
 * Centralized cursor position management for WYSIWYG editor
 *
 * ARCHITECTURE:
 * - Native textarea.selectionStart is the ONLY source of truth
 * - All other representations are READ-ONLY derived state
 * - Conversions happen in one place with clear data flow
 *
 * PRINCIPLE: Unidirectional data flow
 * Browser updates textarea.selectionStart
 *   → CursorManager reads and derives state
 *   → Component reads from CursorManager
 *   → Visual cursor renders at derived position
 *
 * NEVER flows backward (cursor calculations don't modify textarea)
 */

import type { CalcMarkDocument } from './CalcMarkDocument';
import { calculateCursorPosition } from '$lib/utils/cursorPosition';

export class CursorManager {
	private textareaElement = $state<HTMLTextAreaElement | null>(null);
	private overlayElement = $state<HTMLElement | null>(null);
	private documentState = $state<CalcMarkDocument | null>(null);

	// Track if cursor is visible (for blinking animation)
	cursorVisible = $state(true);
	private blinkInterval: ReturnType<typeof setInterval> | null = null;

	// CRITICAL: Track textarea.selectionStart as Svelte $state for reactivity
	// Native textarea.selectionStart is not reactive, so we must manually sync it
	private _absolutePosition = $state(0);
	private _absoluteEnd = $state(0);

	constructor() {}

	/**
	 * Initialize with dependencies.
	 * Must be called in onMount() after DOM elements are ready.
	 */
	init(textarea: HTMLTextAreaElement, overlay: HTMLElement, doc: CalcMarkDocument): void {
		this.textareaElement = textarea;
		this.overlayElement = overlay;
		this.documentState = doc;
	}

	/**
	 * Update cursor position from textarea's current selectionStart.
	 * MUST be called whenever cursor moves (keydown, click, etc.) to sync state.
	 */
	updateFromTextarea(): void {
		if (!this.textareaElement) return;
		this._absolutePosition = this.textareaElement.selectionStart;
		this._absoluteEnd = this.textareaElement.selectionEnd;
	}

	// === DERIVED STATE (automatically reactive via Svelte $derived) ===

	/**
	 * Absolute cursor position in document (character offset from start).
	 * Source of truth: textarea.selectionStart (managed by browser).
	 * Tracked as $state for Svelte reactivity.
	 */
	get absolutePosition(): number {
		return this._absolutePosition;
	}

	/**
	 * Absolute end of selection (same as absolutePosition if no selection).
	 */
	get absoluteEnd(): number {
		return this._absoluteEnd;
	}

	/**
	 * Whether text is currently selected.
	 */
	get hasSelection(): boolean {
		return this.absolutePosition !== this.absoluteEnd;
	}

	/**
	 * Line number containing the cursor (0-indexed).
	 */
	get line(): number {
		if (!this.documentState) return 0;
		return this.documentState.getLineFromPosition(this.absolutePosition).line;
	}

	/**
	 * Character offset within the current line.
	 */
	get offset(): number {
		if (!this.documentState) return 0;
		return this.documentState.getLineFromPosition(this.absolutePosition).offset;
	}

	/**
	 * Visual X coordinate (pixels from left of overlay).
	 */
	get x(): number {
		return this.calculateVisualPosition().x;
	}

	/**
	 * Visual Y coordinate (pixels from top of overlay).
	 */
	get y(): number {
		return this.calculateVisualPosition().y;
	}

	/**
	 * Visual height of cursor (should match font-size, not line-height).
	 */
	get height(): number {
		return this.calculateVisualPosition().height;
	}

	// === PRIVATE HELPERS ===

	/**
	 * Calculate visual pixel position from the overlay's rendered DOM.
	 *
	 * CRITICAL: Uses the actual rendered overlay spans to ensure exact positioning.
	 * This respects all CSS: zoom, font-size, padding, line-height, etc.
	 * Uses textarea's scroll position since overlay doesn't scroll.
	 */
	private calculateVisualPosition(): { x: number; y: number; height: number } {
		if (!this.overlayElement || !this.documentState || !this.textareaElement) {
			return { x: 0, y: 0, height: 16 };
		}

		const lineElement = this.overlayElement.querySelector(`[data-line="${this.line}"]`);
		if (!lineElement) {
			return { x: 0, y: 0, height: 16 };
		}

		const position = calculateCursorPosition(
			lineElement,
			this.offset,
			this.overlayElement,
			this.textareaElement
		);
		return position ?? { x: 0, y: 0, height: 16 };
	}

	// === WRITE OPERATIONS (only for programmatic cursor placement) ===

	/**
	 * Set cursor position programmatically.
	 * This is the ONLY way to write cursor position.
	 * Used for: clicks, double-clicks, keyboard shortcuts.
	 */
	setPosition(absolutePosition: number): void {
		if (!this.textareaElement) return;

		this.textareaElement.selectionStart = absolutePosition;
		this.textareaElement.selectionEnd = absolutePosition;
		this.textareaElement.focus();

		// Update reactive state immediately
		this._absolutePosition = absolutePosition;
		this._absoluteEnd = absolutePosition;
	}

	/**
	 * Set selection range programmatically.
	 * Used for: double-click word selection, select-all, etc.
	 */
	setSelection(start: number, end: number): void {
		if (!this.textareaElement) return;

		this.textareaElement.selectionStart = start;
		this.textareaElement.selectionEnd = end;
		this.textareaElement.focus();

		// Update reactive state immediately
		this._absolutePosition = start;
		this._absoluteEnd = end;
	}

	// === CURSOR BLINKING ANIMATION ===

	/**
	 * Start cursor blink animation (standard 530ms interval).
	 */
	startBlink(): void {
		this.cursorVisible = true;
		if (this.blinkInterval) clearInterval(this.blinkInterval);

		this.blinkInterval = setInterval(() => {
			this.cursorVisible = !this.cursorVisible;
		}, 530);
	}

	/**
	 * Stop cursor blink animation and hide cursor.
	 */
	stopBlink(): void {
		if (this.blinkInterval) {
			clearInterval(this.blinkInterval);
			this.blinkInterval = null;
		}
		this.cursorVisible = false;
	}

	/**
	 * Show cursor immediately (used when cursor position changes).
	 */
	show(): void {
		this.cursorVisible = true;
	}

	/**
	 * Hide cursor immediately (used during typing).
	 */
	hide(): void {
		this.cursorVisible = false;
	}

	/**
	 * Cleanup when component unmounts.
	 */
	destroy(): void {
		if (this.blinkInterval) {
			clearInterval(this.blinkInterval);
		}
	}
}
