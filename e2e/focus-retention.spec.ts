import { test, expect } from '@playwright/test';

test.describe('Focus Retention', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		// Wait for the editor to be ready
		await page.waitForSelector('.editable-block');
	});

	test('should maintain focus while typing in a calculation block', async ({ page }) => {
		// Find a calculation block (e.g., "discount = 20%")
		const calculationBlocks = page.locator('.editable-block.calculation');
		const firstCalcBlock = calculationBlocks.first();

		// Click on the calculation block to activate it
		await firstCalcBlock.click();

		// Wait for textarea to be visible and focused
		const textarea = firstCalcBlock.locator('textarea');
		await expect(textarea).toBeVisible();
		await expect(textarea).toBeFocused();

		// Get initial content
		const initialContent = await textarea.inputValue();

		// Type a space at the end
		await textarea.press('End'); // Move to end
		await textarea.type(' ');

		// Verify textarea still has focus after typing
		await expect(textarea).toBeFocused();

		// Verify content was actually updated
		const newContent = await textarea.inputValue();
		expect(newContent).toBe(initialContent + ' ');

		// Type more characters to ensure focus is maintained
		await textarea.type('test');

		// Focus should still be on the textarea
		await expect(textarea).toBeFocused();

		// Content should have all the typed text
		const finalContent = await textarea.inputValue();
		expect(finalContent).toBe(initialContent + ' test');
	});

	test('should maintain focus while typing in a markdown block', async ({ page }) => {
		// Find a markdown block (e.g., the header or first paragraph)
		const markdownBlocks = page.locator('.editable-block.markdown');
		const firstMarkdownBlock = markdownBlocks.first();

		// Click on the markdown block to activate it
		await firstMarkdownBlock.click();

		// Wait for textarea to be visible and focused
		const textarea = firstMarkdownBlock.locator('textarea');
		await expect(textarea).toBeVisible();
		await expect(textarea).toBeFocused();

		// Get initial content
		const initialContent = await textarea.inputValue();

		// Type at the end
		await textarea.press('End');
		await textarea.type(' extra');

		// Verify textarea still has focus after typing
		await expect(textarea).toBeFocused();

		// Verify content was actually updated
		const newContent = await textarea.inputValue();
		expect(newContent).toBe(initialContent + ' extra');
	});

	test('should not lose focus during rapid typing', async ({ page }) => {
		const calculationBlocks = page.locator('.editable-block.calculation');
		const firstCalcBlock = calculationBlocks.first();

		await firstCalcBlock.click();
		const textarea = firstCalcBlock.locator('textarea');
		await expect(textarea).toBeFocused();

		// Rapid typing - this is where focus loss would be most noticeable
		const textToType = 'quick brown fox';
		await textarea.press('End');

		for (const char of textToType) {
			await textarea.type(char, { delay: 50 }); // 50ms between keystrokes
			// After each character, focus should still be on textarea
			await expect(textarea).toBeFocused();
		}

		// Final verification
		const content = await textarea.inputValue();
		expect(content).toContain(textToType);
		await expect(textarea).toBeFocused();
	});

	test('should maintain cursor position while typing', async ({ page }) => {
		const calculationBlocks = page.locator('.editable-block.calculation');
		const firstCalcBlock = calculationBlocks.first();

		await firstCalcBlock.click();
		const textarea = firstCalcBlock.locator('textarea');

		// Clear the existing content first
		await textarea.fill('');

		// Type something at the beginning
		await textarea.type('x = ');

		// Verify focus is maintained
		await expect(textarea).toBeFocused();

		// The cursor should be after what we just typed
		// We can verify by continuing to type and checking the result
		await textarea.type('100');

		// Focus should still be maintained
		await expect(textarea).toBeFocused();

		const content = await textarea.inputValue();
		expect(content).toBe('x = 100');
	});
});
