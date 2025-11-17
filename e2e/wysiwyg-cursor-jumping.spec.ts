import { test, expect } from '@playwright/test';

/**
 * Test cursor jumping bugs
 *
 * CRITICAL: Cursor should NEVER jump to position 0 when typing.
 * This is the most severe UX bug - makes the editor unusable.
 */

test.describe('WYSIWYG Cursor - No Jumping', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');

		// Clear initial content
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('');
		await page.waitForTimeout(300);
	});

	test('cursor should NOT jump to position 0 when typing at end', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type initial text
		await textarea.fill('x = 5');
		await page.waitForTimeout(200);

		// Get cursor position (should be at end)
		let cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(5);

		// Type one more character at end
		await textarea.press('End'); // Ensure at end
		await textarea.type(' ');

		// Cursor should be at position 6, NOT 0
		cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(6);
		expect(cursorPos).not.toBe(0);
	});

	test('cursor should NOT jump to position 0 after space', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('x = 5');
		await page.waitForTimeout(200);

		// Move to end and type space
		await textarea.press('End');
		const beforeSpace = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		await textarea.type(' ');

		const afterSpace = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Should have moved forward by 1, not jumped to 0
		expect(afterSpace).toBe(beforeSpace + 1);
		expect(afterSpace).not.toBe(0);
	});

	test('cursor should stay in place when typing in middle', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('x = 5');
		await page.waitForTimeout(200);

		// Move to position 2 (after 'x ')
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.selectionStart = 2;
			el.selectionEnd = 2;
		});

		// Type a character
		await textarea.type('y');

		// Should be at position 3
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(3);
		expect(cursorPos).not.toBe(0);
	});

	test('cursor should NOT jump during rapid typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type multiple characters rapidly
		await textarea.type('hello');

		// Don't wait for debounce - type immediately
		await textarea.type(' world');

		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Should be at end (11 characters)
		expect(cursorPos).toBe(11);
		expect(cursorPos).not.toBe(0);
	});

	test('cursor should persist after evaluation completes', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('x = 5');

		// Move to end
		await textarea.press('End');
		const beforeEval = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Wait for evaluation to complete
		await page.waitForTimeout(500);

		// Cursor should still be at end
		const afterEval = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(afterEval).toBe(beforeEval);
		expect(afterEval).not.toBe(0);
	});

	test('custom cursor should appear at correct position after typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('monthly_salary = $5000');
		await page.waitForTimeout(200);

		// Custom cursor should be visible
		const customCursor = page.locator('.custom-cursor');
		await expect(customCursor).toBeVisible();

		// Get cursor X position
		const cursorBox = await customCursor.boundingBox();
		const initialX = cursorBox!.x;

		// Type one more character
		await textarea.press('End');
		await textarea.type('0');
		await page.waitForTimeout(200);

		// Custom cursor should have moved to the right
		const newBox = await customCursor.boundingBox();
		expect(newBox!.x).toBeGreaterThan(initialX);
	});

	test('cursor should be visible after any keystroke', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('x = 5');
		await page.waitForTimeout(200);

		// Type space
		await textarea.press('End');
		await textarea.type(' ');

		// Wait for custom cursor
		await page.waitForTimeout(200);

		// Either native or custom cursor should be visible
		const customCursor = page.locator('.custom-cursor');
		const caretColor = await textarea.evaluate((el) =>
			window.getComputedStyle(el).caretColor
		);

		// At least one cursor should be visible
		const customVisible = await customCursor.isVisible();
		const nativeVisible = caretColor !== 'rgba(0, 0, 0, 0)';

		expect(customVisible || nativeVisible).toBe(true);
	});

	test('textarea value should update correctly when typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('x = 5');
		await page.waitForTimeout(100);

		// Type at end
		await textarea.press('End');
		await textarea.type('0');

		// Value should be updated
		const value = await textarea.evaluate((el: HTMLTextAreaElement) => el.value);
		expect(value).toBe('x = 50');
	});
});
