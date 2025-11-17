import { test, expect } from '@playwright/test';

/**
 * Test /edit page with EXPLICIT cold start (no cache)
 * This simulates a brand new user visiting the page
 */

test.describe('/edit Page - Cold Start (No Cache)', () => {
	test('should work on completely fresh browser with no WASM cache', async ({ browser }) => {
		// Create a completely fresh context with cache disabled
		const context = await browser.newContext({
			// Disable all caching
			serviceWorkers: 'block',
			// Start with empty cache
			storageState: undefined
		});

		// Clear any existing storage
		await context.clearCookies();
		await context.clearPermissions();

		const page = await context.newPage();

		// Listen for all network requests to verify WASM is loaded
		const wasmRequests: string[] = [];
		page.on('request', (request) => {
			const url = request.url();
			if (url.includes('.wasm') || url.includes('wasm_exec.js')) {
				console.log('WASM REQUEST:', url);
				wasmRequests.push(url);
			}
		});

		// Listen for console to see initialization
		const consoleMessages: string[] = [];
		page.on('console', (msg) => {
			const text = msg.text();
			consoleMessages.push(text);
			console.log('BROWSER:', text);
		});

		// Navigate to /edit
		console.log('Navigating to /edit with fresh browser...');
		await page.goto('/edit', { waitUntil: 'networkidle' });

		// Wait for WASM to initialize (should see initialization logs)
		await page.waitForTimeout(3000);

		console.log('\n=== WASM Requests ===');
		console.log(wasmRequests);

		console.log('\n=== Console Messages ===');
		const wasmMessages = consoleMessages.filter(
			(m) => m.includes('WASM') || m.includes('Worker') || m.includes('CalcMark')
		);
		wasmMessages.forEach((m) => console.log(m));

		// Verify WASM files were requested
		expect(wasmRequests.length).toBeGreaterThan(0);
		expect(wasmRequests.some((url) => url.includes('.wasm'))).toBe(true);

		// Verify initialization happened
		const hasWasmInit = consoleMessages.some((m) => m.includes('CalcMark WASM initialized'));
		expect(hasWasmInit).toBe(true);

		// Take screenshot of initial load
		await page.screenshot({ path: 'test-results/cold-start-initial.png', fullPage: true });

		// Check that gutter has results
		const gutterResults = page.locator('.gutter-result');

		// Should have at least one result visible
		console.log('\nChecking for gutter results...');
		await expect(gutterResults.first()).toBeVisible({ timeout: 5000 });

		const count = await gutterResults.count();
		console.log(`Found ${count} gutter results`);
		expect(count).toBeGreaterThan(5);

		// Verify specific results are visible
		const results = await gutterResults.allTextContents();
		console.log('Gutter results:', results);

		expect(results).toContain('5000'); // monthly_salary
		expect(results).toContain('500'); // bonus
		expect(results).toContain('5500'); // total_income
		expect(results).toContain('1500'); // rent
		expect(results).toContain('800'); // food

		// Take final screenshot showing results
		await page.screenshot({ path: 'test-results/cold-start-with-results.png', fullPage: true });

		console.log('\n✓ Cold start test PASSED - editor works from fresh browser!');

		await context.close();
	});

	test('should show loading/evaluation states correctly', async ({ browser }) => {
		const context = await browser.newContext();
		const page = await context.newPage();

		let evaluationStarted = false;
		let evaluationCompleted = false;

		page.on('console', (msg) => {
			const text = msg.text();
			if (text.includes('evaluateDocument: starting')) {
				evaluationStarted = true;
				console.log('✓ Evaluation started');
			}
			if (text.includes('Evaluation complete')) {
				evaluationCompleted = true;
				console.log('✓ Evaluation completed');
			}
			if (text.includes('Applying render update')) {
				console.log('✓ Render update applied');
			}
		});

		await page.goto('/edit');
		await page.waitForTimeout(3000);

		expect(evaluationStarted).toBe(true);
		expect(evaluationCompleted).toBe(true);

		// Verify the UI actually updated
		const gutterResults = page.locator('.gutter-result');
		await expect(gutterResults.first()).toBeVisible();

		await context.close();
	});
});
