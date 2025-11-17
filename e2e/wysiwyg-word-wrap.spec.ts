import { test, expect } from '@playwright/test';

/**
 * Test word wrapping behavior in WYSIWYG editor
 *
 * CRITICAL: Long text should wrap at word/token boundaries, NOT cause horizontal scrolling.
 * The editor should NEVER shift content left (horizontal scroll) - everything must be visible.
 */

test.describe('WYSIWYG Word Wrapping', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');

		// Clear initial content
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('');
		await page.waitForTimeout(300);
	});

	test('long text should wrap within editor bounds, not cause horizontal scroll', async ({
		page
	}) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Type a very long sentence
		const longText =
			'This is a really long sentence that should wrap at word boundaries and not cause the editor to scroll horizontally cutting off content on the left side';
		await textarea.fill(longText);
		await page.waitForTimeout(500);

		// Get overlay dimensions
		const overlayBox = await overlay.boundingBox();
		expect(overlayBox).not.toBeNull();

		// Check that overlay has no horizontal scroll
		const scrollLeft = await overlay.evaluate((el) => el.scrollLeft);
		expect(scrollLeft).toBe(0);

		// Check that the rendered line wraps (height should be greater than single line height)
		const line = overlay.locator('.line').first();
		const lineBox = await line.boundingBox();
		expect(lineBox).not.toBeNull();

		// A wrapped line should be taller than the line-height (28px)
		// If wrapping correctly, height should be at least 2 * line-height (56px)
		expect(lineBox!.height).toBeGreaterThanOrEqual(50);
	});

	test('long calculation line should wrap at token boundaries', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Type a calculation with many tokens
		const longCalc =
			'total_expenses = rent + food + utilities + transportation + entertainment + healthcare + insurance + savings + miscellaneous + emergency_fund';
		await textarea.fill(longCalc);
		await page.waitForTimeout(500);

		// Get overlay box
		const overlayBox = await overlay.boundingBox();
		expect(overlayBox).not.toBeNull();

		// No horizontal scroll
		const scrollLeft = await overlay.evaluate((el) => el.scrollLeft);
		expect(scrollLeft).toBe(0);

		// Line should wrap (be taller than single line)
		const line = overlay.locator('.line').first();
		const lineBox = await line.boundingBox();
		expect(lineBox!.height).toBeGreaterThanOrEqual(50);
	});

	test('all content should remain visible (no left-side cutoff)', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Type content that starts with a specific word
		const text =
			'expenses = rent + food + utilities + transportation + entertainment + healthcare + insurance';
		await textarea.fill(text);
		await page.waitForTimeout(500);

		// The first word "expenses" should be visible at the left edge
		const line = overlay.locator('.line').first();
		const lineBox = await line.boundingBox();
		const overlayBox = await overlay.boundingBox();

		// The line should start at or very near the left edge of the overlay
		expect(lineBox!.x).toBeGreaterThanOrEqual(overlayBox!.x - 5);
		expect(lineBox!.x).toBeLessThanOrEqual(overlayBox!.x + 30); // Allow for padding

		// Check that "expenses" is visible in the DOM
		const lineText = await line.textContent();
		expect(lineText).toContain('expenses');
	});

	test('editor should not have horizontal scrollbar', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const editorArea = page.locator('.editor-area');

		// Type extremely long text
		const veryLongText = 'a'.repeat(500);
		await textarea.fill(veryLongText);
		await page.waitForTimeout(500);

		// Check for horizontal scroll
		const hasHorizontalScroll = await editorArea.evaluate((el) => {
			return el.scrollWidth > el.clientWidth;
		});

		// Should NOT have horizontal scroll
		expect(hasHorizontalScroll).toBe(false);
	});

	test('wrapped lines should maintain proper line height and spacing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Create multiple lines, some short, some long
		const text = `x = 5
monthly_salary = $5000
This is a very long line that should wrap at word boundaries and maintain consistent line spacing with other lines in the document
y = 10`;

		await textarea.fill(text);
		await page.waitForTimeout(500);

		const lines = overlay.locator('.line');
		const lineCount = await lines.count();
		expect(lineCount).toBe(4);

		// Get positions of all lines
		const positions = [];
		for (let i = 0; i < lineCount; i++) {
			const box = await lines.nth(i).boundingBox();
			positions.push({ y: box!.y, height: box!.height });
		}

		// Lines should be stacked vertically with proper spacing
		// Each line should start below the previous one
		for (let i = 1; i < positions.length; i++) {
			expect(positions[i].y).toBeGreaterThan(positions[i - 1].y);
		}

		// The long line (index 2) should be taller than short lines
		expect(positions[2].height).toBeGreaterThan(positions[0].height);
	});

	test('word-wrap should preserve syntax highlighting tokens', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Long calculation with currency tokens
		const longCalc =
			'total = $1000 + $2000 + $3000 + $4000 + $5000 + $6000 + $7000 + $8000 + $9000 + $10000';
		await textarea.fill(longCalc);
		await page.waitForTimeout(500);

		// Check that currency tokens are still highlighted
		const currencyTokens = overlay.locator('.token-currency');
		const count = await currencyTokens.count();

		// Should have 10 currency tokens
		expect(count).toBe(10);

		// All tokens should be visible (not scrolled out of view)
		for (let i = 0; i < count; i++) {
			await expect(currencyTokens.nth(i)).toBeVisible();
		}
	});

	test('textarea and overlay should remain synchronized when wrapping', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		const longText =
			'This is a long line of text that will wrap and we need to ensure the textarea and overlay remain perfectly synchronized';
		await textarea.fill(longText);
		await page.waitForTimeout(500);

		// Both should have the same dimensions
		const textareaBox = await textarea.boundingBox();
		const overlayBox = await overlay.boundingBox();

		expect(textareaBox!.x).toBeCloseTo(overlayBox!.x, 0);
		expect(textareaBox!.y).toBeCloseTo(overlayBox!.y, 0);
		expect(textareaBox!.width).toBeCloseTo(overlayBox!.width, 0);
		expect(textareaBox!.height).toBeCloseTo(overlayBox!.height, 1);
	});

	test('cursor should position correctly on wrapped lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const customCursor = page.locator('.custom-cursor');

		// Type a long line that will wrap
		const longText = 'monthly_expenses = rent + food + utilities + transportation + entertainment';
		await textarea.fill(longText);
		await page.waitForTimeout(300);

		// Click at the beginning
		await textarea.click({ position: { x: 5, y: 10 } });
		await page.waitForTimeout(100);

		const startBox = await customCursor.boundingBox();
		expect(startBox).not.toBeNull();

		// Click near the end (which should be on a wrapped line)
		await textarea.press('End');
		await page.waitForTimeout(100);

		const endBox = await customCursor.boundingBox();
		expect(endBox).not.toBeNull();

		// Cursor should have moved (either right or down depending on wrapping)
		const moved = endBox!.x !== startBox!.x || endBox!.y !== startBox!.y;
		expect(moved).toBe(true);
	});

	test('gutter should align with wrapped lines correctly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create content with wrapped calculation lines
		const text = `x = 5
total_monthly_expenses = rent + food + utilities + transportation + entertainment + healthcare + insurance
y = 10`;

		await textarea.fill(text);
		await page.waitForTimeout(500);

		// Get gutter lines
		const gutterLines = page.locator('.gutter-line');
		const count = await gutterLines.count();

		// Should have 3 gutter lines (one per logical line, not per wrapped line)
		expect(count).toBe(3);

		// Middle gutter line should have a result (it's a calculation)
		const middleGutterLine = gutterLines.nth(1);
		const hasResult = await middleGutterLine.evaluate((el) =>
			el.classList.contains('has-result')
		);
		expect(hasResult).toBe(true);
	});

	test('editing wrapped line should not cause horizontal scroll', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Start with a long line
		const longText = 'expenses = rent + food + utilities + transportation + entertainment';
		await textarea.fill(longText);
		await page.waitForTimeout(300);

		// Add more text at the end
		await textarea.press('End');
		await textarea.type(' + healthcare + insurance + savings');
		await page.waitForTimeout(300);

		// No horizontal scroll
		const scrollLeft = await overlay.evaluate((el) => el.scrollLeft);
		expect(scrollLeft).toBe(0);

		// Content should still be visible
		const line = overlay.locator('.line').first();
		const lineText = await line.textContent();
		expect(lineText).toContain('expenses');
		expect(lineText).toContain('savings');
	});
});
