import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Tests for gutter vertical alignment
 *
 * Verifies that computed values in the gutter appear on the same line
 * as the calculation that produced them.
 */
test.describe('WYSIWYG Editor - Gutter Alignment', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 }).catch(() => {});
	});

	test('gutter results should appear on the same line as the calculation', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create a simple document with calculations on specific lines
		await textarea.clear();
		await textarea.fill('monthly_salary = $5000\nbonus = $500\ntotal_income = monthly_salary + bonus');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		const gutter = page.locator('.gutter');
		const overlay = page.locator('.rendered-overlay');

		// Get all calculation lines in the overlay
		const overlayLines = overlay.locator('.line');
		const gutterLines = gutter.locator('.gutter-line');

		// Line 0: monthly_salary = $5000
		const line0Overlay = overlayLines.nth(0);
		const line0Gutter = gutterLines.nth(0);

		// Check that the gutter result for line 0 is at the same vertical position
		const line0OverlayBox = await line0Overlay.boundingBox();
		const line0GutterBox = await line0Gutter.boundingBox();

		expect(line0OverlayBox).not.toBeNull();
		expect(line0GutterBox).not.toBeNull();

		// The Y positions should match (allowing 1px tolerance for rounding)
		expect(Math.abs(line0OverlayBox!.y - line0GutterBox!.y)).toBeLessThanOrEqual(1);

		// Check that line 0 gutter shows the result
		const line0GutterText = await line0Gutter.textContent();
		expect(line0GutterText).toContain('= ');

		// Line 1: bonus = $500
		const line1Overlay = overlayLines.nth(1);
		const line1Gutter = gutterLines.nth(1);

		const line1OverlayBox = await line1Overlay.boundingBox();
		const line1GutterBox = await line1Gutter.boundingBox();

		expect(line1OverlayBox).not.toBeNull();
		expect(line1GutterBox).not.toBeNull();

		expect(Math.abs(line1OverlayBox!.y - line1GutterBox!.y)).toBeLessThanOrEqual(1);

		const line1GutterText = await line1Gutter.textContent();
		expect(line1GutterText).toContain('= ');

		// Line 2: total_income = monthly_salary + bonus
		const line2Overlay = overlayLines.nth(2);
		const line2Gutter = gutterLines.nth(2);

		const line2OverlayBox = await line2Overlay.boundingBox();
		const line2GutterBox = await line2Gutter.boundingBox();

		expect(line2OverlayBox).not.toBeNull();
		expect(line2GutterBox).not.toBeNull();

		expect(Math.abs(line2OverlayBox!.y - line2GutterBox!.y)).toBeLessThanOrEqual(1);

		const line2GutterText = await line2Gutter.textContent();
		expect(line2GutterText).toContain('= ');
	});

	test('gutter results should NOT be offset by one line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('x = 100\ny = 200\nz = 300');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const gutter = page.locator('.gutter');

		// Get the text content of all gutter lines
		const gutterLinesText = await gutter.locator('.gutter-line').allTextContents();

		// Line 0 should show "= 100"
		expect(gutterLinesText[0]).toContain('= 100');

		// Line 1 should show "= 200" (NOT "= 100" which would indicate off-by-one)
		expect(gutterLinesText[1]).toContain('= 200');

		// Line 2 should show "= 300" (NOT "= 200")
		expect(gutterLinesText[2]).toContain('= 300');
	});

	test('gutter results with markdown should align correctly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('# Budget\n\nmonthly_salary = $5000\nbonus = $500');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		const gutter = page.locator('.gutter');
		const overlay = page.locator('.rendered-overlay');

		const overlayLines = overlay.locator('.line');
		const gutterLines = gutter.locator('.gutter-line');

		// Line 0: # Budget (markdown, no result)
		const line0GutterText = await gutterLines.nth(0).textContent();
		expect(line0GutterText?.trim()).toBe(''); // No result for markdown

		// Line 1: (blank, no result)
		const line1GutterText = await gutterLines.nth(1).textContent();
		expect(line1GutterText?.trim()).toBe(''); // No result for blank

		// Line 2: monthly_salary = $5000
		const line2Overlay = overlayLines.nth(2);
		const line2Gutter = gutterLines.nth(2);

		const line2OverlayBox = await line2Overlay.boundingBox();
		const line2GutterBox = await line2Gutter.boundingBox();

		expect(Math.abs(line2OverlayBox!.y - line2GutterBox!.y)).toBeLessThanOrEqual(1);

		const line2GutterText = await line2Gutter.textContent();
		expect(line2GutterText).toContain('= ');

		// Line 3: bonus = $500
		const line3Overlay = overlayLines.nth(3);
		const line3Gutter = gutterLines.nth(3);

		const line3OverlayBox = await line3Overlay.boundingBox();
		const line3GutterBox = await line3Gutter.boundingBox();

		expect(Math.abs(line3OverlayBox!.y - line3GutterBox!.y)).toBeLessThanOrEqual(1);

		const line3GutterText = await line3Gutter.textContent();
		expect(line3GutterText).toContain('= ');
	});
});
