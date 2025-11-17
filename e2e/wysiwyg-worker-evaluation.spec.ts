import { test, expect } from '@playwright/test';

/**
 * Test that Web Worker successfully loads and evaluates CalcMark
 */

test.describe('WYSIWYG Web Worker Evaluation', () => {
	test.beforeEach(async ({ page }) => {
		// Collect page errors only (not console logs)
		const errors: string[] = [];

		page.on('pageerror', (error) => {
			errors.push(error.message);
		});

		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				errors.push(msg.text());
			}
		});

		// Store errors for inspection
		(page as { __testErrors?: string[] }).__testErrors = errors;

		await page.goto('/test/budget');
	});

	test('should initialize Web Worker without errors', async ({ page }) => {
		// Wait for initial render and worker to process
		await page.waitForTimeout(1000);

		// Check that gutter results are present (proves worker initialized and evaluated)
		const gutterResults = page.locator('.gutter-result');
		const count = await gutterResults.count();

		// Budget fixture has multiple calculations, should have results
		expect(count).toBeGreaterThan(0);

		// Verify no errors occurred
		const errors = (page as { __testErrors?: string[] }).__testErrors || [];
		expect(errors).toHaveLength(0);
	});

	test('should initialize CalcMark WASM in worker', async ({ page }) => {
		// Type something to trigger evaluation
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('x = 5');

		// Wait for evaluation
		await page.waitForTimeout(1000);

		// Verify gutter shows result (proves WASM initialized and evaluated)
		const gutterResult = page.locator('.gutter-result').first();
		await expect(gutterResult).toBeVisible();

		const text = await gutterResult.textContent();
		expect(text).toContain('5');
	});

	test('should evaluate calculations and return results', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('x = 5\ny = 10\ntotal = x + y');

		// Wait for evaluation (debounce + processing)
		await page.waitForTimeout(1000);

		// Check for gutter results (proves evaluation completed)
		const gutterResults = page.locator('.gutter-result');
		const count = await gutterResults.count();

		expect(count).toBe(3); // x, y, total

		// Verify the total result
		const totalResult = gutterResults.nth(2);
		const text = await totalResult.textContent();
		expect(text).toContain('15');
	});

	test('should render syntax highlighting after evaluation', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('monthly_salary = $5000');

		// Wait for evaluation
		await page.waitForTimeout(1000);

		// Check for syntax-highlighted elements in overlay
		const calculationSpan = page.locator('.rendered-overlay .calculation');
		await expect(calculationSpan).toBeVisible();

		// Check for token spans (syntax highlighting)
		const tokenSpans = page.locator('.rendered-overlay .calculation span');
		const count = await tokenSpans.count();

		expect(count).toBeGreaterThan(0);
	});

	test('should render markdown headings', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('# Budget Calculator\n\nmonthly_salary = $5000');

		// Wait for evaluation
		await page.waitForTimeout(1000);

		// Check for markdown rendering
		const overlay = page.locator('.rendered-overlay');
		const innerHTML = await overlay.innerHTML();

		// Should contain markdown heading
		expect(innerHTML).toContain('Budget Calculator');

		// Should contain calculation
		expect(innerHTML).toContain('monthly_salary');
	});

	test('should show calculation results in gutter', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('x = 5\ny = 10\ntotal = x + y');

		// Wait for evaluation
		await page.waitForTimeout(1000);

		// Check for gutter results
		const gutterResults = page.locator('.gutter .gutter-result');
		const count = await gutterResults.count();

		// Should have results for x, y, and total
		expect(count).toBe(3);

		// Check that total = 15
		const totalResult = gutterResults.nth(2);
		const text = await totalResult.textContent();
		expect(text).toContain('15');
	});

	test('should handle errors without crashing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.click();

		// Type invalid syntax
		await textarea.fill('x = = = 5');

		// Wait for evaluation
		await page.waitForTimeout(1000);

		const testPage = page as TestPage;
		const errors = testPage.__testErrors || [];

		// Should not have fatal errors (worker should handle gracefully)
		const fatalErrors = errors.filter(
			(e: string) => e.toLowerCase().includes('uncaught') || e.toLowerCase().includes('fatal')
		);

		expect(fatalErrors).toHaveLength(0);
	});

	test('should update results when content changes', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('x = 5');

		await page.waitForTimeout(1000);

		// Get initial result
		const gutter = page.locator('.gutter .gutter-result').first();
		let text = await gutter.textContent();
		expect(text).toContain('5');

		// Update value
		await textarea.fill('x = 10');
		await page.waitForTimeout(1000);

		// Result should update
		text = await gutter.textContent();
		expect(text).toContain('10');
	});
});
