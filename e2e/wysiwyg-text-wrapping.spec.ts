import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Tests for text wrapping behavior
 *
 * Verifies that long lines wrap at word/token boundaries instead of scrolling horizontally
 */
test.describe('WYSIWYG Editor - Text Wrapping', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page
			.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 })
			.catch(() => {});
	});

	test('long markdown lines should wrap at word boundaries', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create a very long markdown line
		const longText =
			'This is a simple budget calculator written in CalcMark that should wrap at word boundaries when the line extends beyond the visible editing canvas instead of scrolling horizontally.';

		await textarea.clear();
		await textarea.fill(longText);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Check that the textarea doesn't have horizontal scrollbar
		const textareaScrollWidth = await textarea.evaluate(
			(el: HTMLTextAreaElement) => el.scrollWidth
		);
		const textareaClientWidth = await textarea.evaluate(
			(el: HTMLTextAreaElement) => el.clientWidth
		);

		// scrollWidth should be approximately equal to clientWidth (allowing small tolerance for padding)
		expect(textareaScrollWidth).toBeLessThanOrEqual(textareaClientWidth + 100);

		// Check that the overlay wraps the content (height should be more than one line)
		const overlay = page.locator('.rendered-overlay');
		const overlayHeight = await overlay.evaluate((el) => el.scrollHeight);
		const lineHeight = 28; // from CSS

		// With wrapping, the content should be taller than a single line
		expect(overlayHeight).toBeGreaterThan(lineHeight * 1.5);
	});

	test('long calculation lines should wrap naturally', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create a long calculation with many identifiers
		const longCalc =
			'total_annual_budget = monthly_rent + monthly_utilities + monthly_food + monthly_transportation + monthly_entertainment + monthly_savings + monthly_insurance';

		await textarea.clear();
		await textarea.fill(longCalc);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Check that the textarea doesn't scroll horizontally
		const textareaScrollWidth = await textarea.evaluate(
			(el: HTMLTextAreaElement) => el.scrollWidth
		);
		const textareaClientWidth = await textarea.evaluate(
			(el: HTMLTextAreaElement) => el.clientWidth
		);

		expect(textareaScrollWidth).toBeLessThanOrEqual(textareaClientWidth + 100);

		// Check that the overlay wraps the content
		const overlay = page.locator('.rendered-overlay');
		const overlayHeight = await overlay.evaluate((el) => el.scrollHeight);
		const lineHeight = 28;

		expect(overlayHeight).toBeGreaterThan(lineHeight * 1.5);
	});

	test('textarea should not scroll horizontally when typing long lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.click();

		// Type a long line character by character
		const longText =
			'monthly_salary = $5000 and this is a very long line that extends beyond the visible canvas';

		for (const char of longText) {
			await textarea.press(char === ' ' ? 'Space' : char);
			await page.waitForTimeout(10);
		}

		await page.waitForTimeout(500);

		// Get scroll position
		const scrollLeft = await textarea.evaluate((el: HTMLTextAreaElement) => el.scrollLeft);

		// Should not have scrolled horizontally
		expect(scrollLeft).toBe(0);
	});

	test('cursor should remain visible when typing at end of long wrapped line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();

		// Type a long line that will wrap
		const longText =
			'This is a very long markdown line that will definitely wrap to multiple lines in the editor view and we want to make sure the cursor stays visible';
		await textarea.fill(longText);

		await page.waitForTimeout(500);

		// Move cursor to end
		await textarea.press('End');

		// Type more characters
		await textarea.type(' at the end');

		await page.waitForTimeout(500);

		// The cursor indicator should be visible
		const cursorIndicator = page.locator('.cursor-indicator');
		await expect(cursorIndicator).toBeVisible();

		// Get cursor position
		const cursorBox = await cursorIndicator.boundingBox();
		const containerBox = await page.locator('.wysiwyg-container').boundingBox();

		expect(cursorBox).not.toBeNull();
		expect(containerBox).not.toBeNull();

		// Cursor should be within the visible container
		expect(cursorBox!.x).toBeGreaterThanOrEqual(containerBox!.x);
		expect(cursorBox!.x).toBeLessThan(containerBox!.x + containerBox!.width);
		expect(cursorBox!.y).toBeGreaterThanOrEqual(containerBox!.y);
		expect(cursorBox!.y).toBeLessThan(containerBox!.y + containerBox!.height);
	});

	test('wrapped lines should maintain correct line numbering', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create content with a long line followed by another line
		await textarea.clear();
		await textarea.fill(
			'This is a very long first line that will wrap to multiple visual lines when rendered in the editor because it contains so much text.\nSecond line = 100'
		);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');
		const lines = overlay.locator('.line');

		// Should have exactly 2 logical lines (even though first wraps visually)
		expect(await lines.count()).toBe(2);

		// First line should be markdown
		const line0 = lines.nth(0);
		const line0Text = await line0.textContent();
		expect(line0Text).toContain('This is a very long first line');

		// Second line should be calculation
		const line1 = lines.nth(1);
		const line1Text = await line1.textContent();
		expect(line1Text).toContain('Second line = 100');
	});
});
