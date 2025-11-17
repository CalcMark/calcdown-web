import { test, expect } from '@playwright/test';

/**
 * Test cursor appearance and behavior
 *
 * CRITICAL: Native textarea caret is too tall (line-height based).
 * We need to hide it and show a custom cursor that matches token height.
 */

test.describe('WYSIWYG Cursor', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');

		// Clear initial content
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('');
		await page.waitForTimeout(300);
	});

	test('textarea should have transparent caret when idle', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('x = 5');

		// Wait for typing to complete (debounce)
		await page.waitForTimeout(500);

		const caretColor = await textarea.evaluate((el) => {
			return window.getComputedStyle(el).caretColor;
		});

		// Should be transparent when custom cursor is active
		expect(caretColor).toBe('rgba(0, 0, 0, 0)');
	});

	test('custom cursor should be visible after typing stops', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('x = 5');

		// Wait for custom cursor to appear (debounce = 150ms)
		await page.waitForTimeout(200);

		const customCursor = page.locator('.custom-cursor');
		await expect(customCursor).toBeVisible();
	});

	test('custom cursor should have correct height (font-size based)', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('x = 5');
		await page.waitForTimeout(200);

		const customCursor = page.locator('.custom-cursor');
		const cursorBox = await customCursor.boundingBox();

		expect(cursorBox).not.toBeNull();

		// Get font size from textarea
		const fontSize = await textarea.evaluate((el) => {
			return parseFloat(window.getComputedStyle(el).fontSize);
		});

		// Cursor height should be approximately 1em (font-size)
		// Allow 2px tolerance
		expect(Math.abs(cursorBox!.height - fontSize)).toBeLessThanOrEqual(2);
	});

	test('custom cursor should hide during typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('x = 5');
		await page.waitForTimeout(200);

		// Custom cursor should be visible
		const customCursor = page.locator('.custom-cursor');
		await expect(customCursor).toBeVisible();

		// Start typing again
		await textarea.press('ArrowRight');
		await textarea.type('0');

		// Custom cursor should hide immediately
		await expect(customCursor).not.toBeVisible();
	});

	test('native caret should show while typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Start typing
		await textarea.click();
		await textarea.type('x');

		// Immediately check - native caret should be visible
		const caretColor = await textarea.evaluate((el) => {
			return window.getComputedStyle(el).caretColor;
		});

		// Should NOT be transparent while typing
		expect(caretColor).not.toBe('rgba(0, 0, 0, 0)');
	});

	test('cursor position should update when clicking', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('monthly_salary = $5000');
		await page.waitForTimeout(200);

		// Get custom cursor initial position
		const customCursor = page.locator('.custom-cursor');
		let cursorBox = await customCursor.boundingBox();
		const initialX = cursorBox!.x;

		// Click in middle of line
		const line = page.locator('.rendered-overlay .line').first();
		const lineBox = await line.boundingBox();
		await page.mouse.click(lineBox!.x + lineBox!.width / 2, lineBox!.y + lineBox!.height / 2);

		await page.waitForTimeout(200);

		// Custom cursor should have moved
		cursorBox = await customCursor.boundingBox();
		expect(cursorBox!.x).not.toBe(initialX);
		expect(cursorBox!.x).toBeGreaterThan(initialX);
	});

	test('cursor should blink', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('x = 5');
		await page.waitForTimeout(200);

		const customCursor = page.locator('.custom-cursor');

		// Check opacity changes (blinking)
		const opacity1 = await customCursor.evaluate((el) => {
			return window.getComputedStyle(el).opacity;
		});

		// Wait for blink cycle (530ms from code)
		await page.waitForTimeout(550);

		const opacity2 = await customCursor.evaluate((el) => {
			return window.getComputedStyle(el).opacity;
		});

		// Opacity should have changed (blinking)
		expect(opacity1).not.toBe(opacity2);
	});
});
