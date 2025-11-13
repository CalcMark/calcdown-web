import { test, expect } from '@playwright/test';

test.describe('ENTER Key Behavior', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.editable-block');
	});

	test('should focus new block immediately after ENTER in calculation', async ({ page }) => {
		// Find first calculation block
		const calcBlocks = page.locator('.editable-block.calculation');
		const firstBlock = calcBlocks.first();

		// Click to activate
		await firstBlock.click();

		// Get the textarea
		const textarea = firstBlock.locator('textarea');
		await expect(textarea).toBeVisible();
		await expect(textarea).toBeFocused();

		const originalValue = await textarea.inputValue();

		// Move to end and press ENTER
		await textarea.press('End');
		await textarea.press('Enter');

		// Wait a bit for new block to be created
		await page.waitForTimeout(200);

		// A textarea should be focused (new block - may be markdown or calculation depending on classification)
		const focusedElement = page.locator(':focus');
		await expect(focusedElement).toBeFocused();

		// The focused textarea should be empty (new block)
		const focusedValue = await focusedElement.inputValue();
		expect(focusedValue).toBe('');

		// And should be different from the original
		expect(focusedValue).not.toBe(originalValue);
	});

	test('should stay in edit mode when ENTER pressed in markdown block', async ({ page }) => {
		// Find first markdown block
		const markdownBlocks = page.locator('.editable-block.markdown');
		const firstMarkdown = markdownBlocks.first();

		// Click to activate
		await firstMarkdown.click();

		// Get the textarea
		const textarea = firstMarkdown.locator('textarea');
		await expect(textarea).toBeVisible();

		const originalValue = await textarea.inputValue();

		// Move to end and press ENTER
		await textarea.press('End');
		await textarea.press('Enter');

		// Wait a moment
		await page.waitForTimeout(100);

		// Should still be focused on a textarea
		const focusedElement = page.locator(':focus');
		await expect(focusedElement).toHaveAttribute('placeholder', 'Type markdown or calculations...');

		// Content should have a newline
		const newValue = await focusedElement.inputValue();
		expect(newValue).toContain('\n');
		expect(newValue.length).toBeGreaterThan(originalValue.length);
	});

	test('should be able to type immediately after ENTER creates new calculation', async ({ page }) => {
		// Find first calculation block
		const calcBlocks = page.locator('.editable-block.calculation');
		const firstBlock = calcBlocks.first();

		// Click and activate
		await firstBlock.click();
		const textarea = firstBlock.locator('textarea');
		await expect(textarea).toBeFocused();

		// Press ENTER to create new block
		await textarea.press('End');
		await textarea.press('Enter');

		// Wait for new block
		await page.waitForTimeout(200);

		// Type immediately (should work if new block is focused)
		await page.keyboard.type('y = 20');

		// Wait for typing to complete
		await page.waitForTimeout(100);

		// The currently focused textarea should contain what we just typed
		const focusedTextarea = page.locator(':focus');
		const content = await focusedTextarea.inputValue();
		expect(content).toBe('y = 20');
	});
});
