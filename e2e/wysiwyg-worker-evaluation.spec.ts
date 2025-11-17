import { test, expect } from '@playwright/test';

/**
 * Test that Web Worker successfully loads and evaluates CalcMark
 */

test.describe('WYSIWYG Web Worker Evaluation', () => {
	test.beforeEach(async ({ page }) => {
		// Collect console logs and errors
		const logs: string[] = [];
		const errors: string[] = [];

		page.on('console', (msg) => {
			const text = msg.text();
			logs.push(text);
			if (msg.type() === 'error') {
				errors.push(text);
			}
		});

		page.on('pageerror', (error) => {
			errors.push(error.message);
		});

		// Store logs for inspection
		(page as any).__testLogs = logs;
		(page as any).__testErrors = errors;

		await page.goto('/wysiwyg');
	});

	test('should initialize Web Worker without errors', async ({ page }) => {
		// Wait for worker initialization
		await page.waitForTimeout(1000);

		const errors = (page as any).__testErrors;
		const logs = (page as any).__testLogs;

		// Check for worker errors
		const workerErrors = errors.filter((e: string) => e.includes('[Worker]') || e.includes('[WorkerManager]'));

		if (workerErrors.length > 0) {
			console.log('Worker errors found:', workerErrors);
			console.log('All logs:', logs.filter((l: string) => l.includes('[Worker]') || l.includes('[WorkerManager]')));
		}

		expect(workerErrors).toHaveLength(0);
	});

	test('should initialize CalcMark WASM in worker', async ({ page }) => {
		// Type something to trigger evaluation
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('x = 5');

		// Wait for evaluation
		await page.waitForTimeout(1000);

		const logs = (page as any).__testLogs;

		// Should see worker initialization logs
		const hasWorkerInit = logs.some((l: string) =>
			l.includes('CalcMark worker initialized') ||
			l.includes('CalcMark WASM initialized')
		);

		if (!hasWorkerInit) {
			console.log('Expected worker init logs not found. All logs:', logs);
		}

		expect(hasWorkerInit).toBe(true);
	});

	test('should evaluate calculations and return results', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('x = 5\ny = 10\ntotal = x + y');

		// Wait for evaluation (debounce + processing)
		await page.waitForTimeout(1000);

		const logs = (page as any).__testLogs;

		// Should see evaluation complete log
		const hasEvaluationComplete = logs.some((l: string) =>
			l.includes('Evaluation complete') ||
			l.includes('got results')
		);

		if (!hasEvaluationComplete) {
			console.log('Evaluation logs:', logs.filter((l: string) =>
				l.includes('evaluat') || l.includes('result')
			));
		}

		expect(hasEvaluationComplete).toBe(true);
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

		const errors = (page as any).__testErrors;

		// Should not have fatal errors (worker should handle gracefully)
		const fatalErrors = errors.filter((e: string) =>
			e.toLowerCase().includes('uncaught') ||
			e.toLowerCase().includes('fatal')
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
