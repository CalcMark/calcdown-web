import { describe, it, expect } from 'vitest';
import { determineKeyboardAction, type KeyboardActionContext } from './keyboardInteractions';

describe('keyboardInteractions', () => {
	describe('determineKeyboardAction', () => {
		it('should return ESCAPE_TO_PREVIEW for Escape key', () => {
			const context: KeyboardActionContext = {
				key: 'Escape',
				shiftKey: false,
				ctrlKey: false,
				metaKey: false,
				cursorPosition: 5,
				selectionStart: 5,
				selectionEnd: 5,
				contentLength: 10,
				isAtStart: false,
				isAtEnd: false,
				blockType: 'markdown'
			};

			const action = determineKeyboardAction(context);
			expect(action.type).toBe('ESCAPE_TO_PREVIEW');
		});

		it('should return TAB_TO_NEXT_BLOCK for Tab key', () => {
			const context: KeyboardActionContext = {
				key: 'Tab',
				shiftKey: false,
				ctrlKey: false,
				metaKey: false,
				cursorPosition: 5,
				selectionStart: 5,
				selectionEnd: 5,
				contentLength: 10,
				isAtStart: false,
				isAtEnd: false,
				blockType: 'markdown'
			};

			const action = determineKeyboardAction(context);
			expect(action.type).toBe('TAB_TO_NEXT_BLOCK');
		});

		it('should return ENTER_NEW_LINE for Enter in markdown at end', () => {
			const context: KeyboardActionContext = {
				key: 'Enter',
				shiftKey: false,
				ctrlKey: false,
				metaKey: false,
				cursorPosition: 10,
				selectionStart: 10,
				selectionEnd: 10,
				contentLength: 10,
				isAtStart: false,
				isAtEnd: true,
				blockType: 'markdown'
			};

			const action = determineKeyboardAction(context);
			expect(action.type).toBe('ENTER_NEW_LINE');
		});

		it('should return ENTER_NEW_LINE for Enter in markdown mid-content', () => {
			const context: KeyboardActionContext = {
				key: 'Enter',
				shiftKey: false,
				ctrlKey: false,
				metaKey: false,
				cursorPosition: 5,
				selectionStart: 5,
				selectionEnd: 5,
				contentLength: 10,
				isAtStart: false,
				isAtEnd: false,
				blockType: 'markdown'
			};

			const action = determineKeyboardAction(context);
			expect(action.type).toBe('ENTER_NEW_LINE');
		});

		it('should return ENTER_NEW_CALCULATION_BLOCK for Enter in calculation at end', () => {
			const context: KeyboardActionContext = {
				key: 'Enter',
				shiftKey: false,
				ctrlKey: false,
				metaKey: false,
				cursorPosition: 10,
				selectionStart: 10,
				selectionEnd: 10,
				contentLength: 10,
				isAtStart: false,
				isAtEnd: true,
				blockType: 'calculation'
			};

			const action = determineKeyboardAction(context);
			expect(action.type).toBe('ENTER_NEW_CALCULATION_BLOCK');
		});

		it('should return ENTER_NEW_CALCULATION_BLOCK for Enter in calculation mid-content', () => {
			const context: KeyboardActionContext = {
				key: 'Enter',
				shiftKey: false,
				ctrlKey: false,
				metaKey: false,
				cursorPosition: 5,
				selectionStart: 5,
				selectionEnd: 5,
				contentLength: 10,
				isAtStart: false,
				isAtEnd: false,
				blockType: 'calculation'
			};

			const action = determineKeyboardAction(context);
			expect(action.type).toBe('ENTER_NEW_CALCULATION_BLOCK');
		});

		it('should return BACKSPACE_MERGE_WITH_PREVIOUS for Backspace at start', () => {
			const context: KeyboardActionContext = {
				key: 'Backspace',
				shiftKey: false,
				ctrlKey: false,
				metaKey: false,
				cursorPosition: 0,
				selectionStart: 0,
				selectionEnd: 0,
				contentLength: 10,
				isAtStart: true,
				isAtEnd: false,
				blockType: 'markdown'
			};

			const action = determineKeyboardAction(context);
			expect(action.type).toBe('BACKSPACE_MERGE_WITH_PREVIOUS');
		});

		it('should return ALLOW_DEFAULT for Backspace mid-content', () => {
			const context: KeyboardActionContext = {
				key: 'Backspace',
				shiftKey: false,
				ctrlKey: false,
				metaKey: false,
				cursorPosition: 5,
				selectionStart: 5,
				selectionEnd: 5,
				contentLength: 10,
				isAtStart: false,
				isAtEnd: false,
				blockType: 'markdown'
			};

			const action = determineKeyboardAction(context);
			expect(action.type).toBe('ALLOW_DEFAULT');
		});

		it('should return ALLOW_DEFAULT for unhandled keys', () => {
			const context: KeyboardActionContext = {
				key: 'a',
				shiftKey: false,
				ctrlKey: false,
				metaKey: false,
				cursorPosition: 5,
				selectionStart: 5,
				selectionEnd: 5,
				contentLength: 10,
				isAtStart: false,
				isAtEnd: false,
				blockType: 'markdown'
			};

			const action = determineKeyboardAction(context);
			expect(action.type).toBe('ALLOW_DEFAULT');
		});
	});
});
