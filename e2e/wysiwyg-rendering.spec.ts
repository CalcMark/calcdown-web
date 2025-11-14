import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Tests for visual rendering accuracy
 *
 * These tests verify that the rendered output matches the source text exactly,
 * with no missing characters, missing spaces, or incorrect styling.
 */
test.describe('WYSIWYG Editor - Rendering Accuracy', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 }).catch(() => {});
	});

	test('should render identifiers completely without splitting characters', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type a calculation with underscored identifier
		await textarea.clear();
		await textarea.fill('total_income = $5000');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Check that the identifier is rendered as a single unit
		const overlay = page.locator('.rendered-overlay');
		const overlayText = await overlay.textContent();

		// Should contain complete "total_income" - no "total" + gray "i" + "ncome"
		expect(overlayText).toContain('total_income');

		// Check that there's exactly one identifier token span containing the full text
		const identifierToken = overlay.locator('.token-identifier:has-text("total_income")');
		await expect(identifierToken).toBeVisible();

		const identifierText = await identifierToken.textContent();
		expect(identifierText).toBe('total_income');
	});

	test('should preserve all spaces in calculation lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('food = $800');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Get the raw HTML of the line
		const lineElement = page.locator('.rendered-overlay .line').first();
		const innerHTML = await lineElement.innerHTML();

		// Should contain spaces around "="
		// Check that spaces are preserved in the HTML (not collapsed)
		expect(innerHTML).toMatch(/food.*\s.*=.*\s.*\$800/);

		// Visual check: get text content and verify spacing
		const textContent = await lineElement.textContent();
		expect(textContent).toContain('food = $800');
	});

	test('should render multiple identifiers with shared prefixes correctly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create a case where indexOf could find wrong occurrences
		await textarea.clear();
		await textarea.fill('monthly_salary = $5000\nmonthly_bonus = $500\nmonthly_total = monthly_salary + monthly_bonus');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		const overlay = page.locator('.rendered-overlay');
		const overlayText = await overlay.textContent();

		// All three identifiers should appear completely
		expect(overlayText).toContain('monthly_salary');
		expect(overlayText).toContain('monthly_bonus');
		expect(overlayText).toContain('monthly_total');

		// Check that each identifier has its own complete token span
		const salaryToken = overlay.locator('.token-identifier:has-text("monthly_salary")').first();
		await expect(salaryToken).toBeVisible();
		expect(await salaryToken.textContent()).toBe('monthly_salary');

		const bonusToken = overlay.locator('.token-identifier:has-text("monthly_bonus")').first();
		await expect(bonusToken).toBeVisible();
		expect(await bonusToken.textContent()).toBe('monthly_bonus');

		const totalToken = overlay.locator('.token-identifier:has-text("monthly_total")').first();
		await expect(totalToken).toBeVisible();
		expect(await totalToken.textContent()).toBe('monthly_total');
	});

	test('should preserve whitespace at start and end of lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('  result = 100  ');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const lineElement = page.locator('.rendered-overlay .line').first();
		const innerHTML = await lineElement.innerHTML();

		// Should preserve leading and trailing spaces within the calculation span
		// HTML: <!----><span class="calculation">  <span ... >  </span><!---->
		expect(innerHTML).toContain('>  <span'); // Leading spaces inside calculation span
		expect(innerHTML).toContain('</span>  </span>'); // Trailing spaces before closing calculation span
	});

	test('should render special characters in identifiers correctly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('item_1 = 100\nitem_2 = 200\ntotal_items = item_1 + item_2');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		const overlay = page.locator('.rendered-overlay');

		// Check all identifiers are rendered completely with underscores and numbers
		const item1Token = overlay.locator('.token-identifier:has-text("item_1")').first();
		await expect(item1Token).toBeVisible();
		expect(await item1Token.textContent()).toBe('item_1');

		const item2Token = overlay.locator('.token-identifier:has-text("item_2")').first();
		await expect(item2Token).toBeVisible();
		expect(await item2Token.textContent()).toBe('item_2');

		const totalToken = overlay.locator('.token-identifier:has-text("total_items")').first();
		await expect(totalToken).toBeVisible();
		expect(await totalToken.textContent()).toBe('total_items');
	});

	test('should handle lines with only markdown text', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('# Budget Calculator\n\nCalculate your monthly budget:');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');
		const overlayText = await overlay.textContent();

		// Markdown should be preserved
		expect(overlayText).toContain('Budget Calculator');
		expect(overlayText).toContain('Calculate your monthly budget:');
	});

	test('should not lose characters when tokens are adjacent', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('result=100+200');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');
		const overlayText = await overlay.textContent();

		// All characters should be present
		expect(overlayText).toContain('result');
		expect(overlayText).toContain('=');
		expect(overlayText).toContain('100');
		expect(overlayText).toContain('+');
		expect(overlayText).toContain('200');
	});

	test('should render emoji in identifiers correctly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('🏠 = $1500\n💰 = $5000\ntotal = 🏠 + 💰');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		const overlay = page.locator('.rendered-overlay');
		const overlayText = await overlay.textContent();

		// Emoji should be preserved in rendering
		expect(overlayText).toContain('🏠');
		expect(overlayText).toContain('💰');
		expect(overlayText).toContain('total');
	});
});
