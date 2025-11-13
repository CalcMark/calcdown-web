/**
 * Keyboard interaction utilities for the CalcDown editor
 * Pure functions for testability
 */

export interface KeyboardActionContext {
	key: string;
	shiftKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
	cursorPosition: number;
	selectionStart: number;
	selectionEnd: number;
	contentLength: number;
	isAtStart: boolean;
	isAtEnd: boolean;
	blockType: 'markdown' | 'calculation';
}

export type KeyboardAction =
	| { type: 'IGNORE' }
	| { type: 'ESCAPE_TO_PREVIEW' }
	| { type: 'TAB_TO_NEXT_BLOCK' }
	| { type: 'ENTER_NEW_LINE' } // Normal line break mid-content
	| { type: 'ENTER_NEW_MARKDOWN_BLOCK' } // New block after current
	| { type: 'ENTER_NEW_CALCULATION_BLOCK' } // New calc block after current
	| { type: 'BACKSPACE_MERGE_WITH_PREVIOUS' }
	| { type: 'ALLOW_DEFAULT' }; // Let browser handle it

/**
 * Determines what action should occur based on keyboard event
 */
export function determineKeyboardAction(context: KeyboardActionContext): KeyboardAction {
	const { key, selectionStart, selectionEnd, blockType, isAtEnd, isAtStart } = context;

	// ESCAPE: Always return to preview mode
	if (key === 'Escape') {
		return { type: 'ESCAPE_TO_PREVIEW' };
	}

	// TAB: Move to next block (blur current, focus next)
	if (key === 'Tab' && !context.shiftKey) {
		return { type: 'TAB_TO_NEXT_BLOCK' };
	}

	// ENTER: Different behavior based on cursor position and block type
	if (key === 'Enter') {
		// If cursor is at the end of the line
		if (isAtEnd && selectionStart === selectionEnd) {
			if (blockType === 'markdown') {
				// In markdown: add a new line within the same block
				return { type: 'ENTER_NEW_LINE' };
			} else {
				// In calculation: create a new calculation block
				return { type: 'ENTER_NEW_CALCULATION_BLOCK' };
			}
		} else {
			// Cursor is mid-content: normal line break (for markdown)
			if (blockType === 'markdown') {
				return { type: 'ENTER_NEW_LINE' };
			} else {
				// For calculation, ENTER at mid-line creates new calc block
				return { type: 'ENTER_NEW_CALCULATION_BLOCK' };
			}
		}
	}

	// BACKSPACE at start: Merge with previous block
	if (key === 'Backspace' && isAtStart && selectionStart === 0 && selectionEnd === 0) {
		return { type: 'BACKSPACE_MERGE_WITH_PREVIOUS' };
	}

	// Default: allow normal browser behavior
	return { type: 'ALLOW_DEFAULT' };
}

/**
 * Helper to create keyboard action context from textarea element
 */
export function createKeyboardContext(
	event: KeyboardEvent,
	blockType: 'markdown' | 'calculation'
): KeyboardActionContext {
	const textarea = event.target as HTMLTextAreaElement;
	const { selectionStart, selectionEnd, value } = textarea;

	return {
		key: event.key,
		shiftKey: event.shiftKey,
		ctrlKey: event.ctrlKey,
		metaKey: event.metaKey,
		cursorPosition: selectionStart,
		selectionStart,
		selectionEnd,
		contentLength: value.length,
		isAtStart: selectionStart === 0,
		isAtEnd: selectionStart === value.length,
		blockType
	};
}

/**
 * Check if a keyboard event should be handled by the editor
 */
export function shouldHandleKeyboardEvent(event: KeyboardEvent): boolean {
	const handledKeys = ['Escape', 'Tab', 'Enter', 'Backspace'];
	return handledKeys.includes(event.key);
}
