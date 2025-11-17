import { test, expect } from '@playwright/test';

/**
 * Test that dependent calculations update when upstream values change
 *
 * CRITICAL: When `a = 2` changes to `a = 5`, all calculations that depend
 * on `a` must show updated results in the gutter.
 */

test.describe('WYSIWYG - Dependent Calculations', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');

		// Clear initial content
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('');
		await page.waitForTimeout(300);
	});

	test('downstream calculations should update when upstream value changes', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create dependent calculations
		await textarea.fill('a = 2\nb = a + 3\nc = b * 2');
		await page.waitForTimeout(500);

		// Check initial results
		// a = 2, b = 5, c = 10
		const gutterLines = page.locator('.gutter-line');

		// Line 0: a = 2
		const line0Result = await gutterLines.nth(0).locator('.gutter-result').textContent();
		expect(line0Result?.trim()).toBe('2');

		// Line 1: b = a + 3 = 5
		const line1Result = await gutterLines.nth(1).locator('.gutter-result').textContent();
		expect(line1Result?.trim()).toBe('5');

		// Line 2: c = b * 2 = 10
		const line2Result = await gutterLines.nth(2).locator('.gutter-result').textContent();
		expect(line2Result?.trim()).toBe('10');

		// Now change a from 2 to 10
		await textarea.fill('a = 10\nb = a + 3\nc = b * 2');

		// Wait for evaluation
		await page.waitForTimeout(500);

		// Check updated results
		// a = 10, b = 13, c = 26
		const newLine0Result = await gutterLines.nth(0).locator('.gutter-result').textContent();
		expect(newLine0Result?.trim()).toBe('10');

		const newLine1Result = await gutterLines.nth(1).locator('.gutter-result').textContent();
		expect(newLine1Result?.trim()).toBe('13'); // CRITICAL: Should be 13, not 5

		const newLine2Result = await gutterLines.nth(2).locator('.gutter-result').textContent();
		expect(newLine2Result?.trim()).toBe('26'); // CRITICAL: Should be 26, not 10
	});

	test('multiple dependent calculations should all update', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('x = 5\ny = x * 2\nz = x + 10\nw = y + z');
		await page.waitForTimeout(500);

		// Initial: x=5, y=10, z=15, w=25
		const gutterLines = page.locator('.gutter-line');
		let results = await Promise.all([
			gutterLines.nth(0).locator('.gutter-result').textContent(),
			gutterLines.nth(1).locator('.gutter-result').textContent(),
			gutterLines.nth(2).locator('.gutter-result').textContent(),
			gutterLines.nth(3).locator('.gutter-result').textContent()
		]);
		expect(results.map((r) => r?.trim())).toEqual(['5', '10', '15', '25']);

		// Change x to 10
		await textarea.fill('x = 10\ny = x * 2\nz = x + 10\nw = y + z');
		await page.waitForTimeout(500);

		// Updated: x=10, y=20, z=20, w=40
		results = await Promise.all([
			gutterLines.nth(0).locator('.gutter-result').textContent(),
			gutterLines.nth(1).locator('.gutter-result').textContent(),
			gutterLines.nth(2).locator('.gutter-result').textContent(),
			gutterLines.nth(3).locator('.gutter-result').textContent()
		]);
		expect(results.map((r) => r?.trim())).toEqual(['10', '20', '20', '40']);
	});

	test('unchanged lines should not update when editing unrelated line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('a = 5\nb = 10\nc = 20');
		await page.waitForTimeout(300);

		// Get initial HTML of line 2 (c = 20)
		const line2 = page.locator('.rendered-overlay .line[data-line="2"]');
		const initialHTML = await line2.innerHTML();

		// Edit line 0 (a = 5)
		await textarea.fill('a = 99\nb = 10\nc = 20');
		await page.waitForTimeout(500);

		// Line 2 should NOT have changed (c = 20 doesn't depend on a or b)
		const newHTML = await line2.innerHTML();
		expect(newHTML).toBe(initialHTML);
	});

	test('calculation results should update in gutter without flickering', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('base = 100\nresult = base + 50');
		await page.waitForTimeout(500);

		const resultLine = page.locator('.gutter-line').nth(1);
		const initialResult = await resultLine.locator('.gutter-result').textContent();
		expect(initialResult?.trim()).toBe('150');

		// Track if the gutter line gets removed/re-added (which would cause flickering)
		let gutterLineDetached = false;
		await resultLine.evaluate((el) => {
			const observer = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					mutation.removedNodes.forEach(() => {
						(window as any).gutterLineDetached = true;
					});
				}
			});
			observer.observe(el.parentElement!, { childList: true });
		});

		// Change base value
		await textarea.fill('base = 200\nresult = base + 50');
		await page.waitForTimeout(500);

		// Result should be updated
		const newResult = await resultLine.locator('.gutter-result').textContent();
		expect(newResult?.trim()).toBe('250');

		// Gutter line should not have been detached (no flickering)
		gutterLineDetached = await page.evaluate(() => (window as any).gutterLineDetached || false);
		expect(gutterLineDetached).toBe(false);
	});
});
