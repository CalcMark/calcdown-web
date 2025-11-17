import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Tests for long word/token wrapping
 *
 * Verifies that extremely long words or identifiers break mid-word when necessary
 */
test.describe('WYSIWYG Editor - Long Word Wrapping', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page
			.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 })
			.catch(() => {});
	});

	test('extremely long identifier should break mid-word to prevent overflow', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create an identifier that's longer than the editor width
		const veryLongIdentifier =
			'an_extremely_long_variable_name_that_cannot_possibly_fit_on_a_single_line_and_must_break_somewhere = 1';

		await textarea.clear();
		await textarea.fill(veryLongIdentifier);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');
		const line = overlay.locator('.line').first();

		// Check that the line doesn't overflow horizontally
		const lineBox = await line.boundingBox();
		const overlayBox = await overlay.boundingBox();

		expect(lineBox).not.toBeNull();
		expect(overlayBox).not.toBeNull();

		// Line should not exceed overlay width
		expect(lineBox!.width).toBeLessThanOrEqual(overlayBox!.width + 10);

		// All text should still be present
		const lineText = await line.textContent();
		expect(lineText).toContain('an_extremely_long_variable_name');
		expect(lineText).toContain('cannot_possibly_fit');
		expect(lineText).toContain('must_break_somewhere');

		// No horizontal scroll
		const scrollWidth = await overlay.evaluate((el) => el.scrollWidth);
		const clientWidth = await overlay.evaluate((el) => el.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 100);
	});

	test('long markdown word should break mid-word if necessary', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create a single very long word without spaces
		const veryLongWord =
			'Thisisaverylongwordwithoutanyspacesthatwillneedtobreaksomewhereinordertofitwithinthevisiblecanvaswidthotherwiseitwillcausehorizontalscrolling';

		await textarea.clear();
		await textarea.fill(veryLongWord);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		const overlay = page.locator('.rendered-overlay');
		const line = overlay.locator('.line').first();

		const lineBox = await line.boundingBox();
		const overlayBox = await overlay.boundingBox();

		expect(lineBox).not.toBeNull();
		expect(overlayBox).not.toBeNull();

		// Should not overflow
		expect(lineBox!.width).toBeLessThanOrEqual(overlayBox!.width + 10);

		// Text should be present (may be broken across visual lines)
		const lineText = await line.textContent();
		expect(lineText).toContain('Thisisaverylongword');
	});

	test('long URL in markdown should break to prevent overflow', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		const longURL =
			'Check out https://www.example.com/this/is/a/very/long/url/path/that/could/cause/problems/if/not/handled/properly/with/many/segments';

		await textarea.clear();
		await textarea.fill(longURL);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		const overlay = page.locator('.rendered-overlay');
		const line = overlay.locator('.line').first();

		const lineBox = await line.boundingBox();
		const overlayBox = await overlay.boundingBox();

		expect(lineBox).not.toBeNull();
		expect(overlayBox).not.toBeNull();

		expect(lineBox!.width).toBeLessThanOrEqual(overlayBox!.width + 10);

		const lineText = await line.textContent();
		expect(lineText).toContain('Check out');
		expect(lineText).toContain('example.com');
	});

	test('calculation with very long expression should wrap', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		const longCalc =
			'result = very_long_variable_one + another_extremely_long_variable_name + yet_another_long_identifier + final_long_variable';

		await textarea.clear();
		await textarea.fill(longCalc);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');
		const line = overlay.locator('.line').first();

		const lineBox = await line.boundingBox();
		const overlayBox = await overlay.boundingBox();

		expect(lineBox).not.toBeNull();
		expect(overlayBox).not.toBeNull();

		// Should wrap, not overflow
		expect(lineBox!.width).toBeLessThanOrEqual(overlayBox!.width + 10);

		const lineText = await line.textContent();
		expect(lineText).toContain('very_long_variable_one');
		expect(lineText).toContain('final_long_variable');
	});

	test('mixed content with long tokens should all wrap without overflow', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		const content = `# VeryLongHeadingWithoutSpacesThatMustBreakToFitInTheEditor

an_extremely_long_variable_name_for_testing_wrapping = 100

> This is a blockquote with averylongwordwithoutspacesthatwillneedtobreak to prevent overflow.`;

		await textarea.clear();
		await textarea.fill(content);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		const overlay = page.locator('.rendered-overlay');
		const overlayBox = await overlay.boundingBox();
		expect(overlayBox).not.toBeNull();

		// Check that NO line overflows
		const lines = overlay.locator('.line');
		const lineCount = await lines.count();

		for (let i = 0; i < lineCount; i++) {
			const line = lines.nth(i);
			const lineBox = await line.boundingBox();

			if (lineBox) {
				expect(lineBox.width).toBeLessThanOrEqual(overlayBox!.width + 10);
			}
		}

		// Verify no horizontal scroll
		const scrollWidth = await overlay.evaluate((el) => el.scrollWidth);
		const clientWidth = await overlay.evaluate((el) => el.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 100);
	});

	test('consecutive long identifiers should each wrap independently', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		const content = `first_extremely_long_identifier_name = 1
second_extremely_long_identifier_name = 2
third_extremely_long_identifier_name = 3`;

		await textarea.clear();
		await textarea.fill(content);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		const overlay = page.locator('.rendered-overlay');
		const overlayBox = await overlay.boundingBox();
		expect(overlayBox).not.toBeNull();

		const lines = overlay.locator('.line');

		// Each of the 3 lines should not overflow
		for (let i = 0; i < 3; i++) {
			const line = lines.nth(i);
			const lineBox = await line.boundingBox();

			if (lineBox) {
				expect(lineBox.width).toBeLessThanOrEqual(overlayBox!.width + 10);
			}
		}
	});
});
