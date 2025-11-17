import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * CRITICAL: Delete and Backspace key behavior
 *
 * Documents and tests the correct behavior for delete operations:
 * - Backspace (⌫): Deletes character BEFORE cursor
 * - Delete (⌦): Deletes character AFTER cursor
 * - At end of line: Behavior depends on which key is pressed
 */
test.describe('WYSIWYG Editor - Delete/Backspace Behavior', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('Backspace at end of line should delete last character, NOT merge lines', async ({
		page
	}) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('line1 = 100\nline2 = 200');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor at end of line 1
		const textValue = await textarea.inputValue();
		const endOfLine1 = textValue.indexOf('\n');
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, endOfLine1);

		await page.waitForTimeout(100);

		// Press Backspace (should delete the '0' before cursor)
		await textarea.press('Backspace');
		await page.waitForTimeout(50);

		const newText = await textarea.inputValue();

		// Should have deleted the '0', not merged lines
		expect(newText).toBe('line1 = 10\nline2 = 200');

		// Should still have 2 lines
		expect(newText.split('\n').length).toBe(2);
	});

	test('Delete at end of line SHOULD merge next line (standard editor behavior)', async ({
		page
	}) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('line1 = 100\nline2 = 200');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor at end of line 1
		const textValue = await textarea.inputValue();
		const endOfLine1 = textValue.indexOf('\n');
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, endOfLine1);

		await page.waitForTimeout(100);

		// Press Delete/Forward Delete (should delete the newline, merging lines)
		await textarea.press('Delete');
		await page.waitForTimeout(50);

		const newText = await textarea.inputValue();

		// Should have merged the lines by deleting the newline
		expect(newText).toBe('line1 = 100line2 = 200');

		// Should now have 1 line
		expect(newText.split('\n').length).toBe(1);
	});

	test('Backspace in middle of line should delete character before cursor', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('result = 100');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor after '100' (at position 12, at end of text)
		// "result = 100" is 12 characters, so position 11 is after the first '0'
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(11, 11); // After "result = 10" (before last '0')
			el.focus();
		});

		await page.waitForTimeout(100);

		// Press Backspace (should delete '0' before cursor, leaving "result = 10")
		await textarea.press('Backspace');
		await page.waitForTimeout(50);

		const newText = await textarea.inputValue();
		expect(newText).toBe('result = 10');
	});

	test('Delete in middle of line should delete character after cursor', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('result = 100');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor after '10' (before last '0')
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(10, 10); // After "result = 10"
			el.focus();
		});

		await page.waitForTimeout(100);

		// Press Delete
		await textarea.press('Delete');
		await page.waitForTimeout(50);

		const newText = await textarea.inputValue();
		expect(newText).toBe('result = 10');
	});

	test('Backspace on markdown at end of line should NOT merge lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('# Header\n\nParagraph text');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor at end of "# Header"
		const textValue = await textarea.inputValue();
		const endOfHeader = textValue.indexOf('\n');
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, endOfHeader);

		await page.waitForTimeout(100);

		// Press Backspace
		await textarea.press('Backspace');
		await page.waitForTimeout(50);

		const newText = await textarea.inputValue();

		// Should have deleted the 'r', not merged lines
		expect(newText).toBe('# Heade\n\nParagraph text');

		// Should still have 3 lines
		expect(newText.split('\n').length).toBe(3);
	});

	test('Delete on markdown at end of line should merge next line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('# Header\n\nParagraph text');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor at end of "# Header"
		const textValue = await textarea.inputValue();
		const endOfHeader = textValue.indexOf('\n');
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, endOfHeader);

		await page.waitForTimeout(100);

		// Press Delete
		await textarea.press('Delete');
		await page.waitForTimeout(50);

		const newText = await textarea.inputValue();

		// Should have deleted the first newline, merging header with blank line
		expect(newText).toBe('# Header\nParagraph text');

		// Should now have 2 lines
		expect(newText.split('\n').length).toBe(2);
	});

	test('IF delete is merging lines when it should not, document the bug', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('calc1 = 100\ncalc2 = 200');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position at end of line 1
		const textValue = await textarea.inputValue();
		const endOfLine1 = textValue.indexOf('\n');
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, endOfLine1);

		await page.waitForTimeout(100);

		// Record what key the user is actually pressing
		// On Mac: The key above Return is "Backspace" but might send "Delete" event

		// Try Backspace first
		await textarea.press('Backspace');
		await page.waitForTimeout(50);

		const newText = await textarea.inputValue();

		// Document actual behavior
		console.log('After Backspace:', newText);
		console.log('Lines after Backspace:', newText.split('\n').length);

		// Expected: Should delete '0', result in 'calc1 = 10\ncalc2 = 200'
		// If instead we got 'calc1 = 100calc2 = 200', then Backspace is merging lines (BUG)
	});
});
