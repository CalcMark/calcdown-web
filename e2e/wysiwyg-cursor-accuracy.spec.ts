import { test, expect } from '@playwright/test';

/**
 * Test cursor positioning accuracy
 *
 * CRITICAL: Custom cursor must:
 * 1. Use font-size for height, NOT line-height
 * 2. Appear between characters, not in the middle of them
 * 3. Position based on overlay's rendered DOM, not textarea estimates
 */

test.describe('WYSIWYG Cursor - Positioning Accuracy', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');

		// Clear initial content
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('');
		await page.waitForTimeout(300);
	});

	test('custom cursor height should match font-size, not line-height', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type some content
		await textarea.fill('monthly_salary = $5000');
		await page.waitForTimeout(300);

		// Click to show custom cursor
		await textarea.click({ position: { x: 100, y: 10 } });
		await page.waitForTimeout(100);

		const customCursor = page.locator('.custom-cursor');
		await expect(customCursor).toBeVisible();

		// Get cursor height
		const cursorBox = await customCursor.boundingBox();
		const cursorHeight = cursorBox!.height;

		// Get font-size and line-height from overlay
		const overlay = page.locator('.rendered-overlay');
		const styles = await overlay.evaluate((el) => {
			const computed = window.getComputedStyle(el);
			return {
				fontSize: parseFloat(computed.fontSize),
				lineHeight: parseFloat(computed.lineHeight)
			};
		});

		// Cursor height should match font-size (16px)
		// NOT line-height (28px = 16px * 1.75)
		expect(cursorHeight).toBeCloseTo(styles.fontSize, 2);
		expect(cursorHeight).toBeLessThan(styles.lineHeight);
	});

	test('custom cursor should align with rendered character positions', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type content with syntax highlighting
		await textarea.fill('price = $800');
		await page.waitForTimeout(300);

		// Click after the "8" in "$800"
		// This tests cursor alignment with rendered spans
		const line = page.locator('.rendered-overlay .line').first();

		// Find the dollar sign token
		const dollarToken = line.locator('.token-currency').first();
		const dollarBox = await dollarToken.boundingBox();

		// Click right after the dollar sign
		await textarea.click({
			position: {
				x: dollarBox!.x + dollarBox!.width - dollarBox!.x + 5,
				y: 10
			}
		});
		await page.waitForTimeout(100);

		const customCursor = page.locator('.custom-cursor');
		await expect(customCursor).toBeVisible();

		// Get cursor position
		const cursorBox = await customCursor.boundingBox();

		// Cursor should appear AFTER the dollar sign
		// Not in the middle of the "8"
		expect(cursorBox!.x).toBeGreaterThanOrEqual(dollarBox!.x + dollarBox!.width - 2);
	});

	test('cursor should position correctly at start of line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('x = 5');
		await page.waitForTimeout(300);

		// Click at the very start
		await textarea.click({ position: { x: 5, y: 10 } });
		await page.waitForTimeout(100);

		const customCursor = page.locator('.custom-cursor');
		await expect(customCursor).toBeVisible();

		const cursorBox = await customCursor.boundingBox();
		const line = page.locator('.rendered-overlay .line').first();
		const lineBox = await line.boundingBox();

		// Cursor should be at or very near the start of the line
		expect(Math.abs(cursorBox!.x - lineBox!.x)).toBeLessThan(5);
	});

	test('cursor should position correctly at end of line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('x = 5');
		await page.waitForTimeout(300);

		// Move to end with keyboard
		await textarea.press('End');
		await page.waitForTimeout(100);

		const customCursor = page.locator('.custom-cursor');
		await expect(customCursor).toBeVisible();

		// Type one more character
		await textarea.type('0');
		await page.waitForTimeout(100);

		// Cursor should have moved to the right
		const cursorBox = await customCursor.boundingBox();
		const line = page.locator('.rendered-overlay .line').first();
		const lineBox = await line.boundingBox();

		// Cursor should be past the start (we typed "x = 50")
		expect(cursorBox!.x).toBeGreaterThan(lineBox!.x + 30);
	});

	test('cursor vertical position should align with text baseline', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('a = 1\\nb = 2\\nc = 3');
		await page.waitForTimeout(300);

		// Click on line 2 (b = 2)
		const line2 = page.locator('.rendered-overlay .line[data-line="1"]');
		const line2Box = await line2.boundingBox();

		await textarea.click({
			position: {
				x: 10,
				y: line2Box!.y - (await page.locator('.rendered-overlay').boundingBox())!.y + 5
			}
		});
		await page.waitForTimeout(100);

		const customCursor = page.locator('.custom-cursor');
		await expect(customCursor).toBeVisible();

		const cursorBox = await customCursor.boundingBox();

		// Cursor Y should be within the line's bounding box
		expect(cursorBox!.y).toBeGreaterThanOrEqual(line2Box!.y);
		expect(cursorBox!.y + cursorBox!.height).toBeLessThanOrEqual(line2Box!.y + line2Box!.height);
	});

	test('cursor should not appear in middle of multi-byte characters', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Use emoji which is a multi-byte character
		await textarea.fill('emoji = 😀');
		await page.waitForTimeout(300);

		// Click somewhere in the line
		await textarea.click({ position: { x: 50, y: 10 } });
		await page.waitForTimeout(100);

		const customCursor = page.locator('.custom-cursor');
		await expect(customCursor).toBeVisible();

		// Cursor should be visible and positioned
		// (not broken by multi-byte character handling)
		const cursorBox = await customCursor.boundingBox();
		expect(cursorBox!.height).toBeGreaterThan(10);
	});

	test('cursor position should update when clicking different positions', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('variable = 123');
		await page.waitForTimeout(300);

		// Click at start
		await textarea.click({ position: { x: 5, y: 10 } });
		await page.waitForTimeout(100);

		const customCursor = page.locator('.custom-cursor');
		const startBox = await customCursor.boundingBox();

		// Click further right
		await textarea.click({ position: { x: 100, y: 10 } });
		await page.waitForTimeout(100);

		const endBox = await customCursor.boundingBox();

		// Cursor should have moved to the right
		expect(endBox!.x).toBeGreaterThan(startBox!.x);
	});

	test('cursor should align with syntax-highlighted tokens', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create content with multiple token types
		await textarea.fill('total = price * 0.15');
		await page.waitForTimeout(500); // Wait for tokenization

		// Click right before the number "0.15"
		const line = page.locator('.rendered-overlay .line').first();

		// Get position of the number token
		// The content should be syntax-highlighted
		const lineText = await line.textContent();
		expect(lineText).toContain('total');

		// Click in the middle of the line
		await textarea.click({ position: { x: 100, y: 10 } });
		await page.waitForTimeout(100);

		const customCursor = page.locator('.custom-cursor');
		await expect(customCursor).toBeVisible();

		// Cursor should be positioned based on the actual rendered spans
		// Not on textarea's estimated character positions
		const cursorBox = await customCursor.boundingBox();
		expect(cursorBox!.height).toBeGreaterThan(10);
		expect(cursorBox!.x).toBeGreaterThan(0);
	});
});
