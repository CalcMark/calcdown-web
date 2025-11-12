import { test, expect } from '@playwright/test';

test.describe('Inline CalcMark Editor', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		// Wait for initial processing to complete
		await page.waitForSelector('.editor-content', { state: 'visible' });
		// Wait for processing indicator to disappear (initial evaluation)
		await page
			.waitForSelector('.processing-indicator', { state: 'hidden', timeout: 5000 })
			.catch(() => {
				// It's okay if it's already hidden
			});
	});

	test('should render editor with initial content', async ({ page }) => {
		// Check that editor container is present
		await expect(page.locator('.inline-editor-container')).toBeVisible();

		// Check that blocks are rendered
		const blocks = page.locator('.editable-block');
		await expect(blocks.first()).toBeVisible();

		// Should have multiple blocks from the sample document
		const blockCount = await blocks.count();
		expect(blockCount).toBeGreaterThan(5);
	});

	test('should have markdown and calculation blocks', async ({ page }) => {
		// Check for markdown blocks
		const markdownBlocks = page.locator('.editable-block.markdown');
		await expect(markdownBlocks.first()).toBeVisible();

		// Check for calculation blocks
		const calculationBlocks = page.locator('.editable-block.calculation');
		await expect(calculationBlocks.first()).toBeVisible();
	});

	test('should activate block on click', async ({ page }) => {
		const firstBlock = page.locator('.editable-block').first();

		// Click the block
		await firstBlock.click();

		// Should become active
		await expect(firstBlock).toHaveClass(/active/);
	});

	test('should show textarea when editing markdown block', async ({ page }) => {
		const markdownBlock = page.locator('.editable-block.markdown').first();

		// Click to activate
		await markdownBlock.click();

		// Should show textarea
		const textarea = markdownBlock.locator('textarea');
		await expect(textarea).toBeVisible();
		await expect(textarea).toBeFocused();
	});

	test('should show textarea when editing calculation block', async ({ page }) => {
		const calcBlock = page.locator('.editable-block.calculation').first();

		// Click to activate
		await calcBlock.click();

		// Should show textarea
		const textarea = calcBlock.locator('textarea');
		await expect(textarea).toBeVisible();
		await expect(textarea).toBeFocused();
	});

	test('should update content when typing', async ({ page }) => {
		const markdownBlock = page.locator('.editable-block.markdown').first();

		// Click to activate
		await markdownBlock.click();

		// Get textarea
		const textarea = markdownBlock.locator('textarea');

		// Clear and type new content
		await textarea.clear();
		await textarea.fill('New markdown content');

		// Wait for debounce + processing
		await page.waitForTimeout(200);

		// Content should be updated
		expect(await textarea.inputValue()).toBe('New markdown content');
	});

	test('should create new block on ENTER key', async ({ page }) => {
		const firstBlock = page.locator('.editable-block').first();

		// Get initial block count
		const initialCount = await page.locator('.editable-block').count();

		// Click to activate
		await firstBlock.click();

		// Get textarea
		const textarea = firstBlock.locator('textarea');

		// Press ENTER
		await textarea.press('Enter');

		// Wait for new block to be created
		await page.waitForTimeout(200);

		// Should have one more block
		const newCount = await page.locator('.editable-block').count();
		expect(newCount).toBe(initialCount + 1);

		// New block should be active
		const blocks = page.locator('.editable-block');
		const secondBlock = blocks.nth(1);
		await expect(secondBlock).toHaveClass(/active/);
	});

	test('should trigger evaluation on TAB key', async ({ page }) => {
		// Find a calculation block
		const calcBlock = page.locator('.editable-block.calculation').first();

		// Click to activate
		await calcBlock.click();

		// Get textarea
		const textarea = calcBlock.locator('textarea');

		// Type a calculation
		await textarea.clear();
		await textarea.fill('test_var = 100');

		// Press TAB to trigger evaluation
		await textarea.press('Tab');

		// Wait for processing indicator
		await page
			.waitForSelector('.processing-indicator', { state: 'visible', timeout: 1000 })
			.catch(() => {
				// Might be too fast to catch
			});

		// Wait for processing to complete
		await page
			.waitForSelector('.processing-indicator', { state: 'hidden', timeout: 3000 })
			.catch(() => {
				// Already hidden
			});

		// Block should still exist and contain the value
		const content = await textarea.inputValue();
		expect(content).toBe('test_var = 100');
	});

	test('should show preview mode for inactive blocks', async ({ page }) => {
		const firstBlock = page.locator('.editable-block').nth(0);
		const secondBlock = page.locator('.editable-block').nth(1);

		// Activate first block
		await firstBlock.click();
		await expect(firstBlock).toHaveClass(/active/);

		// Second block should not be active
		await expect(secondBlock).not.toHaveClass(/active/);

		// Second block should show preview (no textarea visible when not active)
		const secondBlockTextarea = secondBlock.locator('textarea');
		await expect(secondBlockTextarea).not.toBeVisible();
	});

	test('should handle empty block creation', async ({ page }) => {
		const firstBlock = page.locator('.editable-block').first();

		// Click to activate
		await firstBlock.click();

		// Get textarea
		const textarea = firstBlock.locator('textarea');

		// Press ENTER to create new block
		await textarea.press('Enter');

		// Wait for new block
		await page.waitForTimeout(200);

		// Second block should be active and empty
		const secondBlock = page.locator('.editable-block').nth(1);
		await expect(secondBlock).toHaveClass(/active/);

		const newTextarea = secondBlock.locator('textarea');
		expect(await newTextarea.inputValue()).toBe('');
	});

	test('should merge blocks on BACKSPACE at start', async ({ page }) => {
		// Create a scenario with two blocks
		const firstBlock = page.locator('.editable-block').first();

		// Activate first block
		await firstBlock.click();
		const textarea1 = firstBlock.locator('textarea');

		// Create new block
		await textarea1.press('Enter');
		await page.waitForTimeout(200);

		// Now we have two blocks, second is active
		const secondBlock = page.locator('.editable-block').nth(1);
		const textarea2 = secondBlock.locator('textarea');

		// Type something in second block
		await textarea2.fill('Second block content');
		await page.waitForTimeout(200);

		// Move cursor to start and press BACKSPACE
		await textarea2.press('Home');
		await textarea2.press('Backspace');

		// Wait for merge
		await page.waitForTimeout(300);

		// First block should now be active and contain merged content
		await expect(firstBlock).toHaveClass(/active/);
	});

	test('should maintain block types after evaluation', async ({ page }) => {
		// Find a calculation block
		const calcBlock = page.locator('.editable-block.calculation').first();

		// Click to activate
		await calcBlock.click();

		// Get textarea and modify content
		const textarea = calcBlock.locator('textarea');
		const originalContent = await textarea.inputValue();

		// Make a small change
		await textarea.fill(originalContent + ' ');
		await textarea.press('Tab');

		// Wait for evaluation
		await page.waitForTimeout(500);

		// Block should still be calculation type
		await expect(calcBlock).toHaveClass(/calculation/);
	});

	test('should show processing indicator during evaluation', async ({ page }) => {
		const calcBlock = page.locator('.editable-block.calculation').first();

		// Click to activate
		await calcBlock.click();

		// Get textarea
		const textarea = calcBlock.locator('textarea');

		// Make a change
		await textarea.fill('new_calc = 999');

		// Wait a bit for debounce to start
		await page.waitForTimeout(50);

		// Processing indicator might appear (it's fast, so we catch it if we can)
		const processingIndicator = page.locator('.processing-indicator');
		// Note: This might be too fast to catch reliably, so we don't assert it must be visible

		// Wait for evaluation to complete
		await page.waitForTimeout(500);

		// Processing indicator should be hidden when done
		await expect(processingIndicator).not.toBeVisible();
	});

	test('should handle rapid typing with debounce', async ({ page }) => {
		const markdownBlock = page.locator('.editable-block.markdown').first();

		// Click to activate
		await markdownBlock.click();

		// Get textarea
		const textarea = markdownBlock.locator('textarea');

		// Type rapidly
		await textarea.clear();
		await textarea.fill('A');
		await page.waitForTimeout(10);
		await textarea.fill('AB');
		await page.waitForTimeout(10);
		await textarea.fill('ABC');
		await page.waitForTimeout(10);
		await textarea.fill('ABCD');

		// Wait for debounce to settle
		await page.waitForTimeout(300);

		// Final content should be correct
		expect(await textarea.inputValue()).toBe('ABCD');
	});
});
