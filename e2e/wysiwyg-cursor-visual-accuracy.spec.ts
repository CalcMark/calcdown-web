import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * CRITICAL: Visual Cursor Position Accuracy Tests
 *
 * These tests verify that the visual cursor indicator (the blinking line you see)
 * accurately reflects the actual textarea cursor position at all times.
 *
 * The visual cursor is calculated by:
 * 1. Getting textarea.selectionStart (the actual cursor position)
 * 2. Converting that to line number and offset
 * 3. Finding the corresponding DOM element in the overlay
 * 4. Using Range API to get pixel coordinates
 * 5. Positioning a visual cursor div at those coordinates
 *
 * ISSUES THIS TESTS FOR:
 * - Cursor lagging behind typing (visual cursor not updating in real-time)
 * - Cursor appearing "half-way over a character" (incorrect pixel calculation)
 * - Cursor jumping to wrong position (stale DOM or incorrect calculation)
 * - Styling differences causing cursor drift (font metrics mismatch)
 */

test.describe('WYSIWYG Editor - Visual Cursor Accuracy', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('cursor position should update in real-time during rapid typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('');

		// Type rapidly and check cursor position after EACH keystroke
		const text = 'salary = $100,000';
		for (let i = 0; i < text.length; i++) {
			await textarea.press(text[i]);
			await page.waitForTimeout(20); // Fast typing

			// Get cursor position - should be immediately after the character we just typed
			const textareaValue = await textarea.inputValue();
			const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

			// Cursor should be at i+1 (after the character just typed)
			expect(cursorPos).toBe(i + 1);
			expect(textareaValue.length).toBe(i + 1);
		}
	});

	test('visual cursor should not lag behind during continuous typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const cursorIndicator = page.locator('.cursor-indicator');

		await textarea.clear();

		// Type continuously without waiting
		const text = 'bonus = $500 + $200';
		for (const char of text) {
			await textarea.press(char);
			await page.waitForTimeout(10); // Very fast

			// Cursor should be visible immediately (no lag)
			const isVisible = await cursorIndicator.isVisible();
			expect(isVisible).toBe(true);
		}

		// Final verification
		const finalValue = await textarea.inputValue();
		expect(finalValue).toBe(text);
	});

	test('cursor position should be accurate in plain text', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('This is plain text');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Click in the middle of "plain"
		const textValue = await textarea.inputValue();
		const targetPos = textValue.indexOf('plain') + 2; // After 'pl'

		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, targetPos);

		await page.waitForTimeout(100);

		// Verify cursor position
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(targetPos);

		// Type a character
		await textarea.press('X');
		await page.waitForTimeout(50);

		// Verify insertion
		const newValue = await textarea.inputValue();
		expect(newValue).toBe('This is plXain text');

		// Cursor should be after X
		const newCursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(newCursorPos).toBe(targetPos + 1);
	});

	test('cursor position should be accurate in calculations', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('total = $1,234 + $5,678');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Click inside the number $1,234 (after the comma)
		const textValue = await textarea.inputValue();
		const targetPos = textValue.indexOf(',') + 1; // After ','

		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, targetPos);

		await page.waitForTimeout(100);

		// Type '999'
		await textarea.press('9');
		await page.waitForTimeout(30);
		await textarea.press('9');
		await page.waitForTimeout(30);
		await textarea.press('9');
		await page.waitForTimeout(30);

		// Check result
		const newValue = await textarea.inputValue();
		expect(newValue).toBe('total = $1,999234 + $5,678');

		// Cursor should be after the inserted 999
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(targetPos + 3);
	});

	test('cursor position should be accurate in markdown bold', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('This is **bold text** here');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Click inside "bold" (between 'b' and 'o')
		const textValue = await textarea.inputValue();
		const boldStart = textValue.indexOf('bold');
		const targetPos = boldStart + 1; // After 'b'

		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, targetPos);

		await page.waitForTimeout(100);

		// Type 'X'
		await textarea.press('X');
		await page.waitForTimeout(50);

		// Verify
		const newValue = await textarea.inputValue();
		expect(newValue).toBe('This is **bXold text** here');

		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(targetPos + 1);
	});

	test('cursor position should be accurate in markdown italic', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('This is *italic text* here');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Click inside "italic"
		const textValue = await textarea.inputValue();
		const italicStart = textValue.indexOf('italic');
		const targetPos = italicStart + 3; // After 'ita'

		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, targetPos);

		await page.waitForTimeout(100);

		// Type 'XXX'
		await textarea.press('X');
		await textarea.press('X');
		await textarea.press('X');
		await page.waitForTimeout(50);

		const newValue = await textarea.inputValue();
		expect(newValue).toBe('This is *itaXXXlic text* here');

		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(targetPos + 3);
	});

	test('cursor should not appear half-way over character', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const cursorIndicator = page.locator('.cursor-indicator');

		await textarea.clear();
		await textarea.fill('test = $500');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor after "$"
		const textValue = await textarea.inputValue();
		const dollarPos = textValue.indexOf('$') + 1;

		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, dollarPos);

		await page.waitForTimeout(200);

		// Get cursor indicator position
		const cursorBox = await cursorIndicator.boundingBox();
		expect(cursorBox).not.toBeNull();

		// Get the overlay to verify it exists
		const overlay = page.locator('.rendered-overlay');
		await expect(overlay).toBeVisible();

		// Type a character
		await textarea.press('9');
		await page.waitForTimeout(50);

		// Cursor should move by approximately one character width
		const newCursorBox = await cursorIndicator.boundingBox();
		expect(newCursorBox).not.toBeNull();

		// The cursor should have moved to the right (x position increased)
		if (cursorBox && newCursorBox) {
			expect(newCursorBox.x).toBeGreaterThan(cursorBox.x);

			// The movement should be a reasonable character width (not fractional)
			// Typical monospace character is 8-12px wide
			const movement = newCursorBox.x - cursorBox.x;
			expect(movement).toBeGreaterThan(6);
			expect(movement).toBeLessThan(15);
		}
	});

	test('cursor position during evaluation should not drift', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('value = 100');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor at end
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(11, 11); // After "value = 100"
			el.focus();
		});

		// Type while evaluation might be processing
		await textarea.press('0'); // "value = 1000"
		await page.waitForTimeout(50);
		await textarea.press('0'); // "value = 10000"
		await page.waitForTimeout(50);

		// Wait for evaluation to complete
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Check cursor hasn't drifted
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(13); // After "value = 10000"

		const textValue = await textarea.inputValue();
		expect(textValue).toBe('value = 10000');
	});

	test('cursor position accuracy with mixed content', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();

		// Type mixed content: markdown + calculations
		const content = '# Title\n\nvalue = $500\n\nThis is **bold** text';
		await textarea.fill(content);
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Click in various positions and verify cursor accuracy

		// 1. In the title
		let targetPos = content.indexOf('Title') + 2; // After "Ti"
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, targetPos);
		await page.waitForTimeout(50);

		await textarea.press('X');
		let newValue = await textarea.inputValue();
		expect(newValue).toContain('# TiXtle');

		// 2. In the calculation
		targetPos = newValue.indexOf('$500') + 1; // After "$"
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, targetPos);
		await page.waitForTimeout(50);

		await textarea.press('9');
		newValue = await textarea.inputValue();
		expect(newValue).toContain('$9500');

		// 3. In the markdown bold
		targetPos = newValue.indexOf('bold') + 2; // After "bo"
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, targetPos);
		await page.waitForTimeout(50);

		await textarea.press('Z');
		newValue = await textarea.inputValue();
		expect(newValue).toContain('**boZld**');
	});

	test('rapid cursor position changes should not cause visual glitches', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const cursorIndicator = page.locator('.cursor-indicator');

		await textarea.clear();
		await textarea.fill('line1 = $100\nline2 = $200\nline3 = $300');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Rapidly move cursor to different positions
		for (let i = 0; i < 10; i++) {
			const randomPos = Math.floor(Math.random() * 35);
			await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
				el.setSelectionRange(pos, pos);
				el.focus();
			}, randomPos);

			await page.waitForTimeout(20);

			// Cursor should be visible at each position
			const isVisible = await cursorIndicator.isVisible();
			expect(isVisible).toBe(true);
		}
	});
});
