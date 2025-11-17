import { test, expect } from '@playwright/test';

/**
 * Test that the /edit page loads with syntax highlighting and gutter content
 */

test.describe('/edit Page Load', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test/budget');
		// Wait a bit for WASM worker to initialize
		await page.waitForTimeout(2000);
	});

	test('should show gutter results after load', async ({ page }) => {
		// Take screenshot for debugging
		await page.screenshot({ path: 'test-results/edit-page-loaded.png', fullPage: true });

		// Check that gutter has calculation results
		const gutterResults = page.locator('.gutter-result');

		// Should have at least one gutter result
		await expect(gutterResults.first()).toBeVisible({ timeout: 5000 });

		// Count how many results we have
		const count = await gutterResults.count();
		console.log(`Found ${count} gutter results`);

		// Should have multiple results (monthly_salary, bonus, total_income, etc.)
		expect(count).toBeGreaterThan(3);

		// Check specific results
		const salaryResult = gutterResults.filter({ hasText: '5000' }).first();
		await expect(salaryResult).toBeVisible();

		const bonusResult = gutterResults.filter({ hasText: '500' }).first();
		await expect(bonusResult).toBeVisible();

		// Take another screenshot showing success
		await page.screenshot({ path: 'test-results/edit-page-with-results.png', fullPage: true });
	});

	test('should have syntax highlighting', async ({ page }) => {
		// Check that lines have content
		const lines = page.locator('.rendered-overlay .line');
		const count = await lines.count();

		console.log(`Found ${count} lines`);
		expect(count).toBeGreaterThan(10);

		// Check for specific content
		const salaryLine = lines.filter({ hasText: 'monthly_salary' }).first();
		await expect(salaryLine).toBeVisible();
	});

	test('should show textarea with initial content', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await expect(textarea).toBeVisible();

		const value = await textarea.inputValue();
		console.log('Textarea value length:', value.length);

		expect(value).toContain('monthly_salary');
		expect(value).toContain('Budget Calculator');
	});
});
