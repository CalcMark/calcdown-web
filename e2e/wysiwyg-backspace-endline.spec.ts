import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * CRITICAL: Backspace at end of calculation line should NOT merge lines
 *
 * User reported: "When I position the cursor at the end of a line (in a calculation)
 * and press the 'delete' key on a mac, the _next_ line gets merged into the current line."
 *
 * User clarified: "I was pressing the delete key above the '\' key, which is above the return key."
 * This is the Backspace key (⌫).
 *
 * Expected behavior: Backspace at end of line should delete the last character of the line,
 * NOT merge the next line into the current line.
 */
test.describe('WYSIWYG Editor - Backspace at End of Calculation Line', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('Backspace at end of calculation line should delete last char, NOT merge next line', async ({
		page
	}) => {
		const textarea = page.locator('.raw-textarea');

		// Set up two calculation lines
		await textarea.clear();
		await textarea.fill('salary = $5000\nbonus = $500');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor at END of first calculation line (after "5000")
		const textValue = await textarea.inputValue();
		const endOfLine1 = textValue.indexOf('\n'); // Position just before newline
		await textarea.evaluate(
			(el: HTMLTextAreaElement, pos) => {
				el.setSelectionRange(pos, pos);
				el.focus();
			},
			endOfLine1
		);

		await page.waitForTimeout(100);

		// Verify cursor is at end of line 1
		const cursorBefore = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorBefore).toBe(endOfLine1);

		// Press Backspace (the delete key above Return)
		await textarea.press('Backspace');
		await page.waitForTimeout(50);

		const newText = await textarea.inputValue();

		// Should have deleted the '0' from "5000", resulting in "salary = $500"
		// Should NOT have merged the lines
		expect(newText).toBe('salary = $500\nbonus = $500');

		// Should still have 2 lines
		const lines = newText.split('\n');
		expect(lines.length).toBe(2);
		expect(lines[0]).toBe('salary = $500');
		expect(lines[1]).toBe('bonus = $500');
	});

	test('Multiple Backspace presses at end of calculation line should keep deleting chars', async ({
		page
	}) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('total = 12345\nsubtotal = 100');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor at end of line 1
		const textValue = await textarea.inputValue();
		const endOfLine1 = textValue.indexOf('\n');
		await textarea.evaluate(
			(el: HTMLTextAreaElement, pos) => {
				el.setSelectionRange(pos, pos);
				el.focus();
			},
			endOfLine1
		);

		await page.waitForTimeout(100);

		// Press Backspace 3 times
		await textarea.press('Backspace');
		await page.waitForTimeout(50);
		await textarea.press('Backspace');
		await page.waitForTimeout(50);
		await textarea.press('Backspace');
		await page.waitForTimeout(50);

		const newText = await textarea.inputValue();

		// Should have deleted "345", leaving "total = 12"
		// Should NOT have merged lines
		expect(newText).toBe('total = 12\nsubtotal = 100');
		expect(newText.split('\n').length).toBe(2);
	});

	test('Backspace at end of markdown line should NOT merge next line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('# Header Line\n\nParagraph text');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor at end of "# Header Line"
		const textValue = await textarea.inputValue();
		const endOfHeader = textValue.indexOf('\n');
		await textarea.evaluate(
			(el: HTMLTextAreaElement, pos) => {
				el.setSelectionRange(pos, pos);
				el.focus();
			},
			endOfHeader
		);

		await page.waitForTimeout(100);

		// Press Backspace
		await textarea.press('Backspace');
		await page.waitForTimeout(50);

		const newText = await textarea.inputValue();

		// Should have deleted 'e' from "Line", NOT merged with blank line
		expect(newText).toBe('# Header Lin\n\nParagraph text');

		// Should still have 3 lines
		expect(newText.split('\n').length).toBe(3);
	});

	test('Backspace after evaluation completes should still NOT merge lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('amount = $1000\ntax = $100');

		// Wait for evaluation to complete
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		// Position cursor at end of line 1 using keyboard navigation
		await textarea.click();
		await textarea.press('Home'); // Go to start
		await textarea.press('End'); // Go to end of first line

		await page.waitForTimeout(100);

		// Verify position
		const textValue = await textarea.inputValue();
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		const expectedPos = textValue.indexOf('\n');
		expect(cursorPos).toBe(expectedPos);

		// Press Backspace
		await textarea.press('Backspace');
		await page.waitForTimeout(50);

		const newText = await textarea.inputValue();

		// Should delete '0', NOT merge lines
		expect(newText).toBe('amount = $100\ntax = $100');
		expect(newText.split('\n').length).toBe(2);
	});

	test('Document exact cursor position and line content before/after Backspace', async ({
		page
	}) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('value1 = 999\nvalue2 = 888');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position at end of line 1
		const initialText = await textarea.inputValue();
		const endOfLine1 = initialText.indexOf('\n');
		await textarea.evaluate(
			(el: HTMLTextAreaElement, pos) => {
				el.setSelectionRange(pos, pos);
				el.focus();
			},
			endOfLine1
		);

		await page.waitForTimeout(100);

		// Document state BEFORE Backspace
		const cursorBefore = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		const linesBefore = initialText.split('\n');

		console.log('BEFORE Backspace:');
		console.log('  Text:', initialText);
		console.log('  Cursor position:', cursorBefore);
		console.log('  Line 0:', linesBefore[0]);
		console.log('  Line 1:', linesBefore[1]);
		console.log('  Number of lines:', linesBefore.length);

		// Press Backspace
		await textarea.press('Backspace');
		await page.waitForTimeout(100);

		// Document state AFTER Backspace
		const textAfter = await textarea.inputValue();
		const cursorAfter = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		const linesAfter = textAfter.split('\n');

		console.log('AFTER Backspace:');
		console.log('  Text:', textAfter);
		console.log('  Cursor position:', cursorAfter);
		console.log('  Line 0:', linesAfter[0]);
		console.log('  Line 1:', linesAfter[1]);
		console.log('  Number of lines:', linesAfter.length);

		// Verify expectations
		expect(textAfter).toBe('value1 = 99\nvalue2 = 888');
		expect(linesAfter.length).toBe(2);
		expect(linesAfter[0]).toBe('value1 = 99');
		expect(linesAfter[1]).toBe('value2 = 888');
		expect(cursorAfter).toBe(endOfLine1 - 1); // Cursor should move back by 1
	});
});
