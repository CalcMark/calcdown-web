import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Tests for markdown text wrapping
 *
 * Verifies that markdown content (including blockquotes, bold, italic, etc.) wraps correctly
 */
test.describe('WYSIWYG Editor - Markdown Wrapping', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 }).catch(() => {});
	});

	test('long blockquote should wrap without horizontal overflow', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create a blockquote with very long text
		const longBlockquote = '> This is a simple budget calculator written in CalcMark. And this text should wrap at word boundaries when it extends beyond the visible canvas instead of being cut off or scrolling horizontally.';

		await textarea.clear();
		await textarea.fill(longBlockquote);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Get the line element
		const overlay = page.locator('.rendered-overlay');
		const line = overlay.locator('.line').first();

		// Check that line content doesn't overflow horizontally
		const lineBox = await line.boundingBox();
		const overlayBox = await overlay.boundingBox();

		expect(lineBox).not.toBeNull();
		expect(overlayBox).not.toBeNull();

		// Line width should not exceed overlay width
		expect(lineBox!.width).toBeLessThanOrEqual(overlayBox!.width + 10); // +10 for padding tolerance

		// Check that the full text is present (not cut off)
		const lineText = await line.textContent();
		expect(lineText).toContain('This is a simple budget calculator');
		expect(lineText).toContain('written in CalcMark');
		expect(lineText).toContain('instead of being cut off');

		// Verify no horizontal scroll
		const scrollWidth = await overlay.evaluate((el) => el.scrollWidth);
		const clientWidth = await overlay.evaluate((el) => el.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 100);
	});

	test('long markdown with bold text should wrap correctly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		const longMarkdown = 'This is **a very important and extremely long piece of bold text that should definitely wrap** when it reaches the edge of the editor instead of overflowing.';

		await textarea.clear();
		await textarea.fill(longMarkdown);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		const overlay = page.locator('.rendered-overlay');
		const line = overlay.locator('.line').first();

		// Check text is present and wrapped
		const lineText = await line.textContent();
		expect(lineText).toContain('a very important');
		expect(lineText).toContain('instead of overflowing');

		// Verify the bold element doesn't cause overflow
		const boldElement = line.locator('strong').first();
		await expect(boldElement).toBeVisible();

		const boldBox = await boldElement.boundingBox();
		const lineBox = await line.boundingBox();

		if (boldBox && lineBox) {
			// Bold element should not extend beyond line width
			expect(boldBox.x + boldBox.width).toBeLessThanOrEqual(lineBox.x + lineBox.width + 10);
		}
	});

	test('long markdown with inline code should wrap correctly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		const longMarkdown = 'Use the function `this_is_a_very_long_function_name_that_might_cause_wrapping_issues_if_not_handled_properly` to calculate your budget.';

		await textarea.clear();
		await textarea.fill(longMarkdown);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		const overlay = page.locator('.rendered-overlay');
		const line = overlay.locator('.line').first();

		const lineBox = await line.boundingBox();
		const overlayBox = await overlay.boundingBox();

		expect(lineBox).not.toBeNull();
		expect(overlayBox).not.toBeNull();

		// Line should not overflow
		expect(lineBox!.width).toBeLessThanOrEqual(overlayBox!.width + 10);

		// All text should be present
		const lineText = await line.textContent();
		expect(lineText).toContain('Use the function');
		expect(lineText).toContain('to calculate your budget');
	});

	test('heading with long text should wrap correctly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		const longHeading = '# This Is A Very Long Heading That Should Wrap When It Extends Beyond The Visible Editor Canvas Width And Continues For Much Longer To Ensure It Really Does Wrap';

		await textarea.clear();
		await textarea.fill(longHeading);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		const overlay = page.locator('.rendered-overlay');
		const line = overlay.locator('.line').first();

		const lineBox = await line.boundingBox();
		const overlayBox = await overlay.boundingBox();

		expect(lineBox).not.toBeNull();
		expect(overlayBox).not.toBeNull();

		// Line should not overflow horizontally
		expect(lineBox!.width).toBeLessThanOrEqual(overlayBox!.width + 10);

		// All text should be visible
		const lineText = await line.textContent();
		expect(lineText).toContain('This Is A Very Long Heading');
		expect(lineText).toContain('Editor Canvas Width');
		expect(lineText).toContain('Really Does Wrap');
	});

	test('mixed markdown and calculations with long lines should all wrap', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		const content = `# Budget Calculator With A Very Long Title That Should Wrap Properly

monthly_salary = $5000
an_extremely_long_variable_name_to_make_text_wrap = 1

> This is a simple budget calculator written in CalcMark that should wrap at word boundaries when the line extends beyond the visible editing canvas.`;

		await textarea.clear();
		await textarea.fill(content);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		const overlay = page.locator('.rendered-overlay');
		const overlayBox = await overlay.boundingBox();
		expect(overlayBox).not.toBeNull();

		// Check each line doesn't overflow
		const lines = overlay.locator('.line');
		const lineCount = await lines.count();

		for (let i = 0; i < lineCount; i++) {
			const line = lines.nth(i);
			const lineBox = await line.boundingBox();

			if (lineBox) {
				// Each line should not exceed overlay width
				expect(lineBox.width).toBeLessThanOrEqual(overlayBox!.width + 10);
			}
		}

		// Verify no horizontal scroll on overlay
		const scrollWidth = await overlay.evaluate((el) => el.scrollWidth);
		const clientWidth = await overlay.evaluate((el) => el.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 100);
	});
});
