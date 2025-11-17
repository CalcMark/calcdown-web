import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * CRITICAL: Visual Cursor After Newline Bug
 *
 * Bug report: When pressing RETURN at end of line, a new line is created but:
 * 1. Visual cursor stays at end of previous line (does not move to new line)
 * 2. Cannot click or use keyboard to get focus on the new blank line
 * 3. Cursor is present (Down Arrow works) but visually invisible
 *
 * This is a critical UX bug - user cannot see where they're typing.
 */

test.describe('WYSIWYG Editor - Newline Cursor Bug', () => {
	test.beforeEach(async ({ page }) => {
		// Capture console logs for debugging
		page.on('console', (msg) => {
			console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
		});

		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('cursor should move to new line after pressing RETURN', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const cursorIndicator = page.locator('.cursor-indicator');

		await textarea.clear();
		await textarea.fill('total_income = monthly_salary + bonus');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor at end of line
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(el.value.length, el.value.length);
			el.focus();
		});

		await page.waitForTimeout(100);

		// Get initial cursor position
		const initialCursorBox = await cursorIndicator.boundingBox();
		expect(initialCursorBox).not.toBeNull();
		console.log('Initial cursor position:', initialCursorBox);

		// Press RETURN to create new line
		await textarea.press('Enter');
		await page.waitForTimeout(100);

		// Check textarea now has a newline
		const textValue = await textarea.inputValue();
		expect(textValue).toBe('total_income = monthly_salary + bonus\n');

		// Check cursor position in textarea
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		console.log('Cursor position after Enter:', cursorPos);
		expect(cursorPos).toBe(textValue.length); // Should be at end (on new line)

		// CRITICAL: Visual cursor should have moved down (Y position should increase)
		const newCursorBox = await cursorIndicator.boundingBox();
		expect(newCursorBox).not.toBeNull();
		console.log('New cursor position:', newCursorBox);

		if (initialCursorBox && newCursorBox) {
			// Y position should have increased (cursor moved down)
			expect(newCursorBox.y).toBeGreaterThan(initialCursorBox.y);
			console.log('Y position change:', newCursorBox.y - initialCursorBox.y);
		}

		// Cursor should be visible
		const isVisible = await cursorIndicator.isVisible();
		expect(isVisible).toBe(true);
	});

	test('cursor should be visible on blank line after pressing RETURN', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const cursorIndicator = page.locator('.cursor-indicator');

		await textarea.clear();
		await textarea.fill('line1\n\nline3');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor at start of line 2 (the blank line)
		const textValue = await textarea.inputValue();
		const blankLinePos = textValue.indexOf('\n') + 1; // After first newline

		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, blankLinePos);

		await page.waitForTimeout(200);

		// Visual cursor should be visible on the blank line
		const isVisible = await cursorIndicator.isVisible();
		expect(isVisible).toBe(true);

		const cursorBox = await cursorIndicator.boundingBox();
		expect(cursorBox).not.toBeNull();
		console.log('Cursor on blank line:', cursorBox);
	});

	test('cursor should update position when navigating with Down Arrow', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const cursorIndicator = page.locator('.cursor-indicator');

		await textarea.clear();
		await textarea.fill('line1\nline2\nline3\nline4');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Start at beginning
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(0, 0);
			el.focus();
		});

		await page.waitForTimeout(100);

		// Get initial Y position
		let prevY = (await cursorIndicator.boundingBox())?.y || 0;
		console.log('Line 1 cursor Y:', prevY);

		// Press Down Arrow 3 times
		for (let i = 0; i < 3; i++) {
			await textarea.press('ArrowDown');
			await page.waitForTimeout(50);

			const cursorBox = await cursorIndicator.boundingBox();
			expect(cursorBox).not.toBeNull();

			if (cursorBox) {
				console.log(`Line ${i + 2} cursor Y:`, cursorBox.y);
				// Y should have increased (moved down)
				expect(cursorBox.y).toBeGreaterThan(prevY);
				prevY = cursorBox.y;
			}

			// Cursor should be visible on every line
			const isVisible = await cursorIndicator.isVisible();
			expect(isVisible).toBe(true);
		}
	});

	test('typing after RETURN should show characters on new line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('first line');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor at end
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(el.value.length, el.value.length);
			el.focus();
		});

		// Press RETURN
		await textarea.press('Enter');
		await page.waitForTimeout(50);

		// Type on new line
		await textarea.press('s');
		await textarea.press('e');
		await textarea.press('c');
		await textarea.press('o');
		await textarea.press('n');
		await textarea.press('d');
		await page.waitForTimeout(50);

		// Check text is correct
		const textValue = await textarea.inputValue();
		expect(textValue).toBe('first line\nsecond');

		// Check cursor is at end of "second"
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(textValue.length);
	});

	test('cursor visibility after multiple newlines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const cursorIndicator = page.locator('.cursor-indicator');

		await textarea.clear();
		await textarea.fill('start');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor at end
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(el.value.length, el.value.length);
			el.focus();
		});

		// Press RETURN multiple times
		for (let i = 0; i < 5; i++) {
			await textarea.press('Enter');
			await page.waitForTimeout(50);

			// After each RETURN, cursor should be visible
			const isVisible = await cursorIndicator.isVisible();
			expect(isVisible).toBe(true);

			const cursorBox = await cursorIndicator.boundingBox();
			expect(cursorBox).not.toBeNull();
			console.log(`After Enter #${i + 1} cursor Y:`, cursorBox?.y);
		}

		// Final text should have 5 newlines
		const textValue = await textarea.inputValue();
		expect(textValue).toBe('start\n\n\n\n\n');
	});
});
