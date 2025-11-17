import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * CRITICAL: Evaluation Results Must Update When Variables Change
 *
 * When a user changes a variable name, the evaluation must re-run and
 * the UI must update to show the new results (or errors if the calculation
 * is now broken).
 *
 * Bug report: Changed "monthly_salary" to "mony_salary" but UI still showed
 * old result of 5500 instead of showing error or zero because "monthly_salary"
 * is now undefined.
 */

test.describe('WYSIWYG Editor - Evaluation Updates', () => {
	test.beforeEach(async ({ page }) => {
		// Capture console logs
		page.on('console', (msg) => {
			console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
		});

		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('changing variable name should update evaluation results', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Initial setup with correct variable names
		await textarea.clear();
		await textarea.fill(
			'monthly_salary = $5000\nbonus = $500\ntotal_income = monthly_salary + bonus'
		);
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Verify initial calculation is correct
		const initialResult = await page.locator('.gutter-result').nth(2).textContent();
		console.log('Initial total_income result:', initialResult);
		expect(initialResult).toContain('5500');

		// Now change "monthly_salary" to "mony_salary" in the first line
		await textarea.clear();
		await textarea.fill('mony_salary = $5000\nbonus = $500\ntotal_income = monthly_salary + bonus');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		// The calculation should now fail because "monthly_salary" is undefined
		// The result should either show a diagnostic OR not appear at all
		const gutterResults = page.locator('.gutter-result');
		const resultCount = await gutterResults.count();
		console.log('Gutter result count after variable rename:', resultCount);

		// Either we have diagnostics shown, OR the problematic result is missing
		// With correct behavior (context reset), there should be only 2 results (mony_salary, bonus)
		// NOT 3 (which would include the incorrect total_income with stale value)
		expect(resultCount).toBeLessThan(3); // Should be 2, not 3
	});

	test('adding new variable should update dependent calculations', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Start with a simple calculation
		await textarea.clear();
		await textarea.fill('a = 10\nb = a * 2');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Verify initial result
		let resultB = await page.locator('.gutter-result').nth(1).textContent();
		console.log('Initial b result:', resultB);
		expect(resultB).toContain('20');

		// Change 'a' to 20
		await textarea.clear();
		await textarea.fill('a = 20\nb = a * 2');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Result should update to 40
		resultB = await page.locator('.gutter-result').nth(1).textContent();
		console.log('Updated b result:', resultB);
		expect(resultB).toContain('40');
	});

	test('deleting variable definition should update dependent calculations', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Start with two variables
		await textarea.clear();
		await textarea.fill('x = 100\ny = x + 50');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Verify initial result
		let resultY = await page.locator('.gutter-result').nth(1).textContent();
		console.log('Initial y result:', resultY);
		expect(resultY).toContain('150');

		// Delete the 'x = 100' line
		await textarea.clear();
		await textarea.fill('y = x + 50');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		// Now 'x' is undefined - the result should NOT appear
		// With correct behavior (context reset), there should be 0 results
		// (since y = x + 50 cannot be evaluated when x is undefined)
		const gutterResults = page.locator('.gutter-result');
		const resultCount = await gutterResults.count();
		console.log('Gutter result count after deleting x:', resultCount);

		// Should have 0 results (y cannot be calculated without x)
		expect(resultCount).toBe(0);
	});

	test('rapid variable changes should eventually show correct result', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Start with value=10
		await textarea.clear();
		await textarea.fill('value = 10\nresult = value * 10');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		let result = await page.locator('.gutter-result').nth(1).textContent();
		expect(result).toContain('100');

		// Rapidly change value multiple times
		await textarea.clear();
		await textarea.fill('value = 20\nresult = value * 10');
		await page.waitForTimeout(100); // Don't wait for debounce

		await textarea.clear();
		await textarea.fill('value = 30\nresult = value * 10');
		await page.waitForTimeout(100);

		await textarea.clear();
		await textarea.fill('value = 40\nresult = value * 10');

		// Wait for evaluation to settle
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Should show final result (400)
		result = await page.locator('.gutter-result').nth(1).textContent();
		console.log('Final result after rapid changes:', result);
		expect(result).toContain('400');
	});

	test('evaluation should complete even when typing stops', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();

		// Type one character at a time with delays
		await textarea.type('salary = $1000', { delay: 50 });
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Should have result
		const result = await page.locator('.gutter-result').nth(0).textContent();
		console.log('Result after typing with delays:', result);
		expect(result).toContain('1000');
	});
});
