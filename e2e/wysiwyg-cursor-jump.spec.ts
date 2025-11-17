import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * CRITICAL: Cursor jumping bug
 *
 * User reported: Positioned cursor mid-word "bonus| = $500", typed 3 spaces quickly,
 * cursor jumped to end of document instead of staying after spaces.
 *
 * This is a critical bug - cursor must NEVER jump unexpectedly.
 */
test.describe('WYSIWYG Editor - Cursor Jump Bug', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('typing spaces mid-word should NOT jump cursor to end', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('bonus = $500');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor after "bonus" (position 5)
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(5, 5);
			el.focus();
		});

		await page.waitForTimeout(100);

		// Verify cursor position
		let cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(5);

		// Type 3 spaces quickly
		await textarea.press(' ');
		await page.waitForTimeout(30);
		await textarea.press(' ');
		await page.waitForTimeout(30);
		await textarea.press(' ');
		await page.waitForTimeout(50);

		// Check text
		const text = await textarea.inputValue();
		expect(text).toBe('bonus    = $500'); // 3 extra spaces

		// CRITICAL: Cursor should be at position 8 (after the 3 spaces)
		// NOT at the end of the document
		cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		console.log('Cursor position after typing 3 spaces:', cursorPos);
		console.log('Expected: 8');
		console.log('Text length:', text.length);

		expect(cursorPos).toBe(8); // After "bonus   " (5 + 3 spaces)
		expect(cursorPos).not.toBe(text.length); // NOT at end!
	});

	test('typing multiple characters mid-line should keep cursor at insertion point', async ({
		page
	}) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('line1 = 100\nline2 = 200\nline3 = 300');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor in middle of line 2 (after "line2")
		const textValue = await textarea.inputValue();
		const line2Start = textValue.indexOf('line2');
		const cursorPos = line2Start + 5; // After "line2"

		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, cursorPos);

		await page.waitForTimeout(100);

		// Type "___" quickly
		await textarea.press('_');
		await page.waitForTimeout(30);
		await textarea.press('_');
		await page.waitForTimeout(30);
		await textarea.press('_');
		await page.waitForTimeout(50);

		// Check cursor position
		const newCursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Should be 3 characters after original position
		expect(newCursorPos).toBe(cursorPos + 3);

		// Verify we're still on line 2 (not jumped to end)
		const newText = await textarea.inputValue();
		const cursorLine = newText.substring(0, newCursorPos).split('\n').length;
		expect(cursorLine).toBe(2); // Still on line 2
	});

	test('rapid typing should never cause cursor to jump to end', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('test abc xyz');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor after "test" (position 4)
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(4, 4);
			el.focus();
		});

		// Type 10 characters very rapidly
		for (let i = 0; i < 10; i++) {
			await textarea.press('x');
			await page.waitForTimeout(10); // Very fast
		}

		const text = await textarea.inputValue();
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Should be after "testxxxxxxxxxx"
		expect(cursorPos).toBe(14);
		expect(text).toBe('testxxxxxxxxxx abc xyz');

		// NOT at end!
		expect(cursorPos).not.toBe(text.length);
	});

	test('typing during evaluation should not move cursor to end', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('value = 100');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor after "value" (position 5)
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(5, 5);
			el.focus();
		});

		// Type space
		await textarea.press(' ');
		await page.waitForTimeout(50);

		// Type more WHILE evaluation might be processing
		await textarea.press(' ');
		await page.waitForTimeout(50);

		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		const text = await textarea.inputValue();

		// Should be at position 7 (after "value  ")
		expect(cursorPos).toBe(7);
		expect(text).toBe('value   = 100');
	});
});
