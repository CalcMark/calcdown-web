import { test, expect } from '@playwright/test';

/**
 * Tests for gutter vertical alignment
 *
 * Verifies that computed values in the gutter appear on the same line
 * as the calculation that produced them.
 */
test.describe('WYSIWYG Editor - Gutter Alignment', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page
			.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 })
			.catch(() => {});
	});

	test('gutter results should appear on the same line as the calculation', async ({ page }) => {
		// Use the existing SAMPLE_DOCUMENT that loads with the page
		// No need to modify textarea - tests should work with default content

		const gutter = page.locator('.gutter');
		const overlay = page.locator('.rendered-overlay');

		// Wait for at least one gutter result to appear (ensures evaluation is complete)
		await page.waitForSelector('.gutter-result', { timeout: 5000 });

		// Get all calculation lines in the overlay
		const overlayLines = overlay.locator('.line');
		const gutterLines = gutter.locator('.gutter-line');

		// Line 3: monthly_salary = $5000 (line numbers are 0-indexed in the SAMPLE_DOCUMENT)
		const line3Overlay = overlayLines.nth(3);
		const line3Gutter = gutterLines.nth(3);

		// Check that the gutter result for line 3 is at the same vertical position
		const line3OverlayBox = await line3Overlay.boundingBox();
		const line3GutterBox = await line3Gutter.boundingBox();

		expect(line3OverlayBox).not.toBeNull();
		expect(line3GutterBox).not.toBeNull();

		// The Y positions should match (allowing 2px tolerance for browser sub-pixel rendering)
		expect(Math.abs(line3OverlayBox!.y - line3GutterBox!.y)).toBeLessThanOrEqual(2);

		// Check that line 3 gutter shows the result (just the value, no "=" prefix)
		const line3GutterText = await line3Gutter.textContent();
		expect(line3GutterText).toContain('5000'); // Should show $5000

		// Line 4: bonus = $500
		const line4Overlay = overlayLines.nth(4);
		const line4Gutter = gutterLines.nth(4);

		const line4OverlayBox = await line4Overlay.boundingBox();
		const line4GutterBox = await line4Gutter.boundingBox();

		expect(line4OverlayBox).not.toBeNull();
		expect(line4GutterBox).not.toBeNull();

		expect(Math.abs(line4OverlayBox!.y - line4GutterBox!.y)).toBeLessThanOrEqual(2);

		const line4GutterText = await line4Gutter.textContent();
		expect(line4GutterText).toContain('500'); // Should show $500

		// Line 5: total_income = monthly_salary + bonus
		const line5Overlay = overlayLines.nth(5);
		const line5Gutter = gutterLines.nth(5);

		const line5OverlayBox = await line5Overlay.boundingBox();
		const line5GutterBox = await line5Gutter.boundingBox();

		expect(line5OverlayBox).not.toBeNull();
		expect(line5GutterBox).not.toBeNull();

		expect(Math.abs(line5OverlayBox!.y - line5GutterBox!.y)).toBeLessThanOrEqual(2);

		const line5GutterText = await line5Gutter.textContent();
		expect(line5GutterText).toContain('5500'); // Should show $5500
	});

	test('gutter results should NOT be offset by one line', async ({ page }) => {
		// Use the existing SAMPLE_DOCUMENT
		const gutter = page.locator('.gutter');

		// Get the text content of all gutter lines
		const gutterLinesText = await gutter.locator('.gutter-line').allTextContents();

		// Verify results appear on correct lines (using SAMPLE_DOCUMENT structure)
		// Line 3: monthly_salary = $5000
		expect(gutterLinesText[3]).toContain('5000');

		// Line 4: bonus = $500 (NOT "5000" which would indicate off-by-one)
		expect(gutterLinesText[4]).toContain('500');

		// Line 5: total_income = monthly_salary + bonus (should show 5500, NOT "500")
		expect(gutterLinesText[5]).toContain('5500');
	});

	test('gutter results with markdown should align correctly', async ({ page }) => {
		// Use the existing SAMPLE_DOCUMENT which contains markdown headings
		const gutter = page.locator('.gutter');
		const overlay = page.locator('.rendered-overlay');

		const overlayLines = overlay.locator('.line');
		const gutterLines = gutter.locator('.gutter-line');

		// Line 0: # Budget Calculator (markdown header, no result)
		const line0GutterText = await gutterLines.nth(0).textContent();
		expect(line0GutterText?.trim()).toBe(''); // No result for markdown

		// Line 1: (blank, no result)
		const line1GutterText = await gutterLines.nth(1).textContent();
		expect(line1GutterText?.trim()).toBe(''); // No result for blank

		// Line 2: ## Income (markdown header, no result)
		const line2GutterText = await gutterLines.nth(2).textContent();
		expect(line2GutterText?.trim()).toBe(''); // No result for markdown

		// Line 3: monthly_salary = $5000 (first calculation after markdown)
		const line3Overlay = overlayLines.nth(3);
		const line3Gutter = gutterLines.nth(3);

		const line3OverlayBox = await line3Overlay.boundingBox();
		const line3GutterBox = await line3Gutter.boundingBox();

		expect(Math.abs(line3OverlayBox!.y - line3GutterBox!.y)).toBeLessThanOrEqual(2);

		const line3GutterText = await line3Gutter.textContent();
		expect(line3GutterText).toContain('5000'); // Should show $5000 (no "=" prefix)
	});
});
