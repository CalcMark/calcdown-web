import { test, expect } from '@playwright/test';

/**
 * Test cursor visibility and positioning during scrolling
 *
 * CRITICAL: Cursor must remain visible and correctly positioned
 * when content is scrolled, both programmatically and by user interaction.
 */

test.describe('WYSIWYG Cursor Scrolling', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test/scrolling');
		await page.waitForTimeout(500);
	});

	test('cursor should remain visible when typing causes scroll', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const customCursor = page.locator('.custom-cursor');

		// Clear initial content
		await textarea.fill('');
		await page.waitForTimeout(200);

		// Type many lines to force scrolling
		const lines = Array.from({ length: 30 }, (_, i) => `line${i} = ${i}`).join('\n');
		await textarea.fill(lines);
		await page.waitForTimeout(300);

		// Click to position cursor (stops typing state)
		await textarea.click();
		await page.waitForTimeout(100);

		// Cursor should be visible
		const cursorBox = await customCursor.boundingBox();
		expect(cursorBox).not.toBeNull();

		// Cursor should be within the visible viewport
		const textareaBox = await textarea.boundingBox();
		expect(textareaBox).not.toBeNull();

		// Cursor Y should be within textarea viewport
		expect(cursorBox!.y).toBeGreaterThanOrEqual(textareaBox!.y);
		expect(cursorBox!.y).toBeLessThanOrEqual(textareaBox!.y + textareaBox!.height);
	});

	test('cursor should not be cut off at bottom of viewport', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const customCursor = page.locator('.custom-cursor');

		// Clear and add content that fills the viewport
		await textarea.fill('');
		const lines = Array.from({ length: 20 }, (_, i) => `line${i}`).join('\n');
		await textarea.fill(lines);
		await page.waitForTimeout(300);

		// Position cursor at the end
		await textarea.press('End');
		await page.waitForTimeout(200);

		// Click to stop typing and show custom cursor
		await textarea.click();
		await page.waitForTimeout(100);

		const cursorBox = await customCursor.boundingBox();
		const textareaBox = await textarea.boundingBox();

		expect(cursorBox).not.toBeNull();
		expect(textareaBox).not.toBeNull();

		// Cursor bottom should not extend beyond textarea bottom
		// Allow 2px tolerance for rounding
		expect(cursorBox!.y + cursorBox!.height).toBeLessThanOrEqual(
			textareaBox!.y + textareaBox!.height + 2
		);
	});

	test('cursor should update position when scrolling manually', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const customCursor = page.locator('.custom-cursor');

		// Create scrollable content
		await textarea.fill('');
		const lines = Array.from({ length: 50 }, (_, i) => `line${i} = ${i * 10}`).join('\n');
		await textarea.fill(lines);
		await page.waitForTimeout(300);

		// Position cursor at line 25 (middle)
		await textarea.evaluate((el) => {
			const lines = el.value.split('\n');
			let offset = 0;
			for (let i = 0; i < 25; i++) {
				offset += lines[i].length + 1; // +1 for newline
			}
			el.selectionStart = offset;
			el.selectionEnd = offset;
		});

		// Trigger cursor update
		await textarea.press('ArrowRight');
		await textarea.press('ArrowLeft');
		await page.waitForTimeout(100);

		// Click to show custom cursor
		await textarea.click();
		await page.waitForTimeout(100);

		const initialCursorBox = await customCursor.boundingBox();
		expect(initialCursorBox).not.toBeNull();

		// Scroll down manually
		await textarea.evaluate((el) => {
			el.scrollTop = el.scrollHeight / 2;
		});
		await page.waitForTimeout(200);

		// Move cursor to trigger update
		await textarea.press('ArrowRight');
		await textarea.press('ArrowLeft');
		await page.waitForTimeout(100);

		const afterScrollCursorBox = await customCursor.boundingBox();
		expect(afterScrollCursorBox).not.toBeNull();

		// Cursor Y position should have changed (moved up in viewport)
		expect(afterScrollCursorBox!.y).not.toBe(initialCursorBox!.y);
	});

	test('cursor should be visible after typing at bottom of scrolled content', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const customCursor = page.locator('.custom-cursor');

		// Create content that requires scrolling
		await textarea.fill('');
		const lines = Array.from({ length: 30 }, (_, i) => `line${i}`).join('\n');
		await textarea.fill(lines);
		await page.waitForTimeout(300);

		// Move to end
		await textarea.press('End');
		await page.waitForTimeout(100);

		// Type a single character
		await textarea.type('x');
		await page.waitForTimeout(100);

		// Click to stop typing and show cursor
		await textarea.click();
		await page.waitForTimeout(100);

		// Cursor should be visible
		const cursorBox = await customCursor.boundingBox();
		expect(cursorBox).not.toBeNull();

		// Cursor should be fully within viewport
		const textareaBox = await textarea.boundingBox();
		expect(cursorBox!.y).toBeGreaterThanOrEqual(textareaBox!.y);
		expect(cursorBox!.y + cursorBox!.height).toBeLessThanOrEqual(
			textareaBox!.y + textareaBox!.height + 2
		);
	});

	test('cursor should stay visible when entering many blank lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const customCursor = page.locator('.custom-cursor');

		// Clear content
		await textarea.fill('');
		await page.waitForTimeout(200);

		// Press Enter many times to create blank lines
		for (let i = 0; i < 40; i++) {
			await textarea.press('Enter');
		}
		await page.waitForTimeout(300);

		// Click to show cursor
		await textarea.click();
		await page.waitForTimeout(100);

		// Cursor should be visible
		const cursorBox = await customCursor.boundingBox();
		expect(cursorBox).not.toBeNull();

		// Cursor should be in viewport
		const textareaBox = await textarea.boundingBox();
		expect(cursorBox!.y).toBeGreaterThanOrEqual(textareaBox!.y);
		expect(cursorBox!.y + cursorBox!.height).toBeLessThanOrEqual(
			textareaBox!.y + textareaBox!.height + 2
		);
	});

	test('cursor should be visible after scrolling to top', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const customCursor = page.locator('.custom-cursor');

		// Create scrollable content
		const lines = Array.from({ length: 50 }, (_, i) => `line${i}`).join('\n');
		await textarea.fill(lines);
		await page.waitForTimeout(300);

		// Scroll to bottom
		await textarea.press('End');
		await page.waitForTimeout(200);

		// Scroll back to top
		await textarea.press('Home');
		await textarea.evaluate((el) => {
			el.scrollTop = 0;
		});
		await page.waitForTimeout(200);

		// Position cursor at start
		await textarea.evaluate((el) => {
			el.selectionStart = 0;
			el.selectionEnd = 0;
		});
		await textarea.press('ArrowRight');
		await textarea.press('ArrowLeft');
		await page.waitForTimeout(100);

		// Click to show cursor
		await textarea.click();
		await page.waitForTimeout(100);

		// Cursor should be visible at top
		const cursorBox = await customCursor.boundingBox();
		const textareaBox = await textarea.boundingBox();

		expect(cursorBox).not.toBeNull();
		// Cursor should be near the top of the textarea
		expect(cursorBox!.y).toBeGreaterThanOrEqual(textareaBox!.y);
		expect(cursorBox!.y).toBeLessThan(textareaBox!.y + 100); // Within first 100px
	});

	test('typing single character should keep cursor visible', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const customCursor = page.locator('.custom-cursor');

		// Create content that requires scrolling
		await textarea.fill('');
		const lines = Array.from({ length: 25 }, (_, i) => `test${i}`).join('\n');
		await textarea.fill(lines);
		await page.waitForTimeout(300);

		// Add one more line to bottom
		await textarea.press('End');
		await textarea.press('Enter');
		await page.waitForTimeout(100);

		// Type single character that evaluates to something
		await textarea.type('f');
		await page.waitForTimeout(300);

		// Click to show cursor
		await textarea.click();
		await page.waitForTimeout(100);

		// Cursor MUST be visible
		const cursorBox = await customCursor.boundingBox();
		expect(cursorBox).not.toBeNull();

		const textareaBox = await textarea.boundingBox();

		// Cursor should be fully within viewport (not cut off)
		expect(cursorBox!.y).toBeGreaterThanOrEqual(textareaBox!.y - 2);
		expect(cursorBox!.y + cursorBox!.height).toBeLessThanOrEqual(
			textareaBox!.y + textareaBox!.height + 2
		);

		// Cursor should have non-zero dimensions
		expect(cursorBox!.height).toBeGreaterThan(10);
	});
});
