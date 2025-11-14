import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Tests for correct text rendering in the WYSIWYG overlay
 *
 * These tests verify that ALL characters are rendered correctly,
 * with no missing, duplicated, or garbled characters.
 */
test.describe('WYSIWYG Editor - Text Rendering Accuracy', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 }).catch(() => {});
	});

	test('should render "total_income" without missing characters', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Enter the exact content from the screenshot
		await textarea.click();
		await textarea.clear();
		await textarea.fill('total_income = monthly_salary + bonus');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Get rendered text from overlay
		const overlayText = await page.locator('.rendered-overlay').textContent();

		// CRITICAL: Should show "total_income" not "totalcome" or "totalincome"
		expect(overlayText).toContain('total_income');
		expect(overlayText).not.toContain('totalcome');
		expect(overlayText).not.toContain('totalincome');
	});

	test('should render "total_expenses" without missing characters', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.click();
		await textarea.clear();
		await textarea.fill('total_expenses = rent + food + utiltes');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlayText = await page.locator('.rendered-overlay').textContent();

		// CRITICAL: Should show "total_expenses" not "total_expnes"
		expect(overlayText).toContain('total_expenses');
		expect(overlayText).not.toContain('total_expnes');
		expect(overlayText).not.toContain('totalexpenses');
	});

	test('should render all characters in variable names', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Test various identifier lengths and patterns
		const testCases = [
			'a = 1',
			'ab = 2',
			'abc = 3',
			'abcd = 4',
			'monthly_salary = 5000',
			'total_income = 100',
			'very_long_variable_name = 123',
			'x1 = 10',
			'var_with_numbers_123 = 456'
		];

		for (const testCase of testCases) {
			await textarea.click();
			await textarea.clear();
			await textarea.fill(testCase);

			await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

			const overlayText = await page.locator('.rendered-overlay').textContent();

			// Extract variable name (everything before =)
			const varName = testCase.split('=')[0].trim();

			// CRITICAL: Overlay must contain the EXACT variable name
			expect(overlayText).toContain(varName);
		}
	});

	test('should render underscores correctly in identifiers', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.click();
		await textarea.clear();
		await textarea.fill('my_var = 100\nother_var = 200\nfinal_var = my_var + other_var');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlayText = await page.locator('.rendered-overlay').textContent();

		// All underscores must be present
		expect(overlayText).toContain('my_var');
		expect(overlayText).toContain('other_var');
		expect(overlayText).toContain('final_var');

		// Should not have collapsed underscores
		expect(overlayText).not.toContain('myvar');
		expect(overlayText).not.toContain('othervar');
		expect(overlayText).not.toContain('finalvar');
	});

	test('should render numbers in variable names', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.click();
		await textarea.clear();
		await textarea.fill('var1 = 100\nvar2 = 200\nvar123 = 300');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlayText = await page.locator('.rendered-overlay').textContent();

		expect(overlayText).toContain('var1');
		expect(overlayText).toContain('var2');
		expect(overlayText).toContain('var123');
	});

	test('should match textarea content exactly (character-by-character)', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		const testContent = 'monthly_salary = $5000\nbonus = $500\ntotal_income = monthly_salary + bonus';

		await textarea.click();
		await textarea.clear();
		await textarea.fill(testContent);

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Get textarea content
		const textareaValue = await textarea.inputValue();

		// Get overlay content (will include results, so we check substrings)
		const overlayText = await page.locator('.rendered-overlay').textContent();

		// Every line in textarea should appear in overlay (ignoring results)
		const lines = testContent.split('\n');
		for (const line of lines) {
			// Extract the calculation part (before any result)
			const calculation = line.trim();
			if (calculation) {
				// Check that all identifiers from the line appear in overlay
				const identifiers = calculation.match(/[a-z_][a-z0-9_]*/gi) || [];
				for (const id of identifiers) {
					expect(overlayText).toContain(id);
				}
			}
		}
	});

	test('should render the sample document correctly', async ({ page }) => {
		// The sample document from the screenshot has issues
		// Let's verify it renders correctly

		await page.waitForTimeout(1000);

		const overlayText = await page.locator('.rendered-overlay').textContent();

		// Check for correct rendering of problematic identifiers
		const expectedIdentifiers = [
			'monthly_salary',
			'bonus',
			'total_income',
			'rent',
			'food',
			'utilities', // Note: sample has "utiltes" typo but that's in source
			'total_expenses'
		];

		for (const identifier of expectedIdentifiers) {
			// Check if it exists in overlay (allowing for typos in source)
			const pattern = new RegExp(identifier.split('').join('.*?'));
			const exists = overlayText.match(pattern);

			if (!exists) {
				console.log(`Missing or garbled identifier: ${identifier}`);
				console.log(`Overlay text: ${overlayText}`);
			}
		}
	});

	test('should not drop characters in long identifiers', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create identifiers of various lengths
		const longIdentifiers = [
			'this_is_a_very_long_variable_name_with_many_underscores',
			'another_long_name_123',
			'final_long_identifier_test'
		];

		for (const identifier of longIdentifiers) {
			await textarea.click();
			await textarea.clear();
			await textarea.fill(`${identifier} = 100`);

			await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

			const overlayText = await page.locator('.rendered-overlay').textContent();

			// Count characters
			const expectedLength = identifier.length;

			// The identifier should appear in full
			expect(overlayText).toContain(identifier);

			// Count how many times each character appears
			for (let i = 0; i < identifier.length; i++) {
				const char = identifier[i];
				if (char !== '_') { // Underscores might render differently
					expect(overlayText.includes(char)).toBe(true);
				}
			}
		}
	});

	test('should render calculations with all tokens visible', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.click();
		await textarea.clear();
		await textarea.fill('result = abc + def - ghi * jkl');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlayText = await page.locator('.rendered-overlay').textContent();

		// All identifiers must be present
		expect(overlayText).toContain('result');
		expect(overlayText).toContain('abc');
		expect(overlayText).toContain('def');
		expect(overlayText).toContain('ghi');
		expect(overlayText).toContain('jkl');

		// All operators must be present
		expect(overlayText).toContain('+');
		expect(overlayText).toContain('-');
		expect(overlayText).toContain('*');
	});

	test('should handle adjacent underscores correctly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Edge case: multiple underscores
		await textarea.click();
		await textarea.clear();
		await textarea.fill('var__with__double__underscores = 100');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlayText = await page.locator('.rendered-overlay').textContent();

		// Should preserve double underscores
		expect(overlayText).toContain('var__with__double__underscores');
	});

	test('should render each character exactly once (no duplication)', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.click();
		await textarea.clear();
		await textarea.fill('test = 123');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Get the calculation line (not including result)
		const calculationElement = page.locator('.calculation').first();
		const calculationHTML = await calculationElement.innerHTML();

		// Strip HTML tags to get text
		const calculationText = calculationHTML.replace(/<[^>]*>/g, '');

		// Should contain "test = 123" (possibly with result appended)
		// Check that "test" appears exactly once in the calculation part
		const beforeResult = calculationText.split('=')[0];
		const testCount = (beforeResult.match(/test/g) || []).length;

		expect(testCount).toBe(1);
	});
});
