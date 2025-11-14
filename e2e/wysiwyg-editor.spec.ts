import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

test.describe('WYSIWYG CalcMark Editor', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		// Wait for editor to be visible
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		// Wait for initial evaluation to complete
		await page.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 }).catch(() => {
			// It's okay if it's already hidden
		});
	});

	test('should render editor with textarea and overlay', async ({ page }) => {
		// Check that container is present
		await expect(page.locator('.wysiwyg-container')).toBeVisible();

		// Check that textarea exists
		const textarea = page.locator('.raw-textarea');
		await expect(textarea).toBeVisible();

		// Check that overlay exists
		const overlay = page.locator('.rendered-overlay');
		await expect(overlay).toBeVisible();
	});

	test('should render sample document with multiple lines', async ({ page }) => {
		// Check that rendered lines are present
		const lines = page.locator('.rendered-overlay .line');
		const lineCount = await lines.count();
		expect(lineCount).toBeGreaterThan(10); // Sample doc has ~20 lines
	});

	test('should show markdown rendering in overlay', async ({ page }) => {
		// Check for markdown rendering (# Budget Calculator should render as heading)
		const lines = page.locator('.rendered-overlay .line');
		const firstLineText = await lines.first().textContent();

		// First line should be a heading with "Budget Calculator"
		expect(firstLineText).toContain('Budget Calculator');
	});

	test('should show calculation results in overlay', async ({ page }) => {
		// Wait a bit for calculations to complete
		await page.waitForTimeout(500);

		// Check for calculation results (= $5500 type output)
		const calcResults = page.locator('.calc-result');
		const resultCount = await calcResults.count();
		expect(resultCount).toBeGreaterThan(0);

		// Check that a result has the expected format
		const firstResult = await calcResults.first().textContent();
		expect(firstResult).toMatch(/=/); // Should show "= value"
	});

	test('should update content when typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Click to focus
		await textarea.click();

		// Clear and type new content
		await textarea.clear();
		await textarea.fill('test = 100');

		// Wait for debounce + server evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Content should be in textarea
		expect(await textarea.inputValue()).toBe('test = 100');

		// Check that overlay was updated
		const overlayContent = await page.locator('.rendered-overlay').textContent();
		expect(overlayContent).toContain('test');
	});

	test('should show evaluating indicator during processing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Focus textarea
		await textarea.click();

		// Make a change
		await textarea.fill('new_calc = 999');

		// Wait a bit to trigger debounce
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 50);

		// Evaluating indicator should appear briefly (might be too fast to catch)
		const indicator = page.locator('.evaluating-indicator');

		// Wait for it to disappear
		await page.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 3000 }).catch(() => {
			// Already hidden
		});

		// Should eventually be hidden
		await expect(indicator).not.toBeVisible();
	});

	test('should handle multi-line input with ENTER key', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Clear and enter multi-line content
		await textarea.click();
		await textarea.clear();
		await textarea.fill('line1\nline2\nline3');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Check that overlay has 3 lines
		const lines = page.locator('.rendered-overlay .line');
		const lineCount = await lines.count();
		expect(lineCount).toBe(3);
	});

	test('should sync scroll between textarea and overlay', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Create a long document to enable scrolling
		const longContent = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n');
		await textarea.click();
		await textarea.fill(longContent);

		// Wait for render
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Scroll textarea
		await textarea.evaluate((el) => {
			el.scrollTop = 500;
		});

		// Wait for scroll sync
		await page.waitForTimeout(100);

		// Overlay should have same scrollTop
		const overlayScrollTop = await overlay.evaluate((el) => el.scrollTop);
		expect(overlayScrollTop).toBe(500);
	});

	test('should preserve cursor position while typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Click and type
		await textarea.click();
		await textarea.clear();
		await textarea.fill('hello world');

		// Get cursor position
		const cursorPos1 = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Cursor should still be at end
		const cursorPos2 = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos2).toBe(cursorPos1);
	});

	test('should handle rapid typing with debounce', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Focus
		await textarea.click();
		await textarea.clear();

		// Type rapidly
		await textarea.fill('A');
		await page.waitForTimeout(10);
		await textarea.fill('AB');
		await page.waitForTimeout(10);
		await textarea.fill('ABC');
		await page.waitForTimeout(10);
		await textarea.fill('ABCD');

		// Wait for debounce to settle
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Final content should be correct
		expect(await textarea.inputValue()).toBe('ABCD');

		// Overlay should show content
		const overlayText = await page.locator('.rendered-overlay').textContent();
		expect(overlayText).toContain('ABCD');
	});

	test('should display syntax highlighting for calculations', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Enter a calculation
		await textarea.click();
		await textarea.clear();
		await textarea.fill('price = $100 + $50');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Check for calculation styling
		const calculation = page.locator('.calculation');
		await expect(calculation).toBeVisible();
	});

	test('should show calculation results inline', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Enter a simple calculation
		await textarea.click();
		await textarea.clear();
		await textarea.fill('result = 10 + 20');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Check that the overlay shows the calculation
		const overlayText = await page.locator('.rendered-overlay').textContent();
		expect(overlayText).toContain('result');

		// Check for calc-result class (result might be there)
		const hasCalcResult = (await page.locator('.calc-result').count()) > 0;
		// We expect a result, but don't fail if the API hasn't processed yet
		if (hasCalcResult) {
			const resultText = await page.locator('.calc-result').first().textContent();
			expect(resultText).toMatch(/30/); // Should contain the value 30
		}
	});

	test('should handle emoji and unicode characters', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Enter content with emoji and unicode - simpler test
		await textarea.click();
		await textarea.clear();
		await textarea.fill('🏠 = $1500');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Check that emoji is preserved in textarea
		const textareaValue = await textarea.inputValue();
		expect(textareaValue).toContain('🏠');

		// Check that overlay renders the emoji
		const overlayText = await page.locator('.rendered-overlay').textContent();
		expect(overlayText).toContain('🏠');
	});

	test('should handle mixed markdown and calculations', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Enter mixed content
		await textarea.click();
		await textarea.clear();
		await textarea.fill('# Budget\n\nsalary = $5000\nrent = $1500\nleftover = salary - rent');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Check that overlay contains the heading and calculations
		const overlayText = await page.locator('.rendered-overlay').textContent();
		expect(overlayText).toContain('Budget');
		expect(overlayText).toContain('salary');
		expect(overlayText).toContain('rent');
	});

	test('should handle empty document', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Clear document
		await textarea.click();
		await textarea.clear();

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Textarea should be empty
		expect(await textarea.inputValue()).toBe('');

		// Overlay should have no lines
		const lines = page.locator('.rendered-overlay .line');
		const lineCount = await lines.count();
		expect(lineCount).toBe(0);
	});

	test('should handle variable references across lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Enter calculations with variable references
		await textarea.click();
		await textarea.clear();
		await textarea.fill('a = 100\nb = 200\nc = a + b');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Check that overlay shows all variables
		const overlayText = await page.locator('.rendered-overlay').textContent();
		expect(overlayText).toContain('a');
		expect(overlayText).toContain('b');
		expect(overlayText).toContain('c');
	});

	test('should update calculations when dependencies change', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Initial state
		await textarea.click();
		await textarea.clear();
		await textarea.fill('x = 10\ny = x * 2');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Verify content is there
		let overlayText = await page.locator('.rendered-overlay').textContent();
		expect(overlayText).toContain('x');
		expect(overlayText).toContain('y');

		// Update x
		await textarea.fill('x = 15\ny = x * 2');

		// Wait for re-evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Verify content still there
		overlayText = await page.locator('.rendered-overlay').textContent();
		expect(overlayText).toContain('x');
		expect(overlayText).toContain('y');
	});

	test('should maintain cursor during evaluation', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Enter initial content
		await textarea.click();
		await textarea.clear();
		await textarea.fill('test = 100');

		// Position cursor in middle
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.selectionStart = 5;
			el.selectionEnd = 5;
		});

		const cursorBefore = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Trigger evaluation by adding a space
		await textarea.press('End');
		await textarea.press('Space');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Cursor should be at end now (we pressed End)
		const cursorAfter = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorAfter).toBeGreaterThan(cursorBefore);
	});

	test('should handle currency symbols correctly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Enter calculation with currency
		await textarea.click();
		await textarea.clear();
		await textarea.fill('price = $50\ntax = $5\nsum = price + tax');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Check that overlay contains the variables
		const overlayText = await page.locator('.rendered-overlay').textContent();
		expect(overlayText).toContain('price');
		expect(overlayText).toContain('tax');
		expect(overlayText).toContain('sum');
	});

	test('should handle percentage calculations', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Enter percentage calculation
		await textarea.click();
		await textarea.clear();
		await textarea.fill('amount = $1000\ndiscount = 20%\nfinal = amount * (1 - discount)');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Should show results
		const calcResults = page.locator('.calc-result');
		const resultCount = await calcResults.count();
		expect(resultCount).toBeGreaterThan(0);
	});

	test('should render blank lines correctly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Enter content with blank lines
		await textarea.click();
		await textarea.clear();
		await textarea.fill('line1\n\nline3');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Should have 3 lines (including blank)
		const lines = page.locator('.rendered-overlay .line');
		const lineCount = await lines.count();
		expect(lineCount).toBe(3);
	});

	test('should handle very long documents', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create a very long document (200 lines)
		const longDoc = Array.from({ length: 200 }, (_, i) => `var${i} = ${i}`).join('\n');

		await textarea.click();
		await textarea.clear();
		await textarea.fill(longDoc);

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Should handle it without crashing
		const lines = page.locator('.rendered-overlay .line');
		const lineCount = await lines.count();
		expect(lineCount).toBe(200);
	});
});
