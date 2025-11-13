import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

test.describe('Markdown ENTER Behavior', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.editable-block');
	});

	test('should add newline in middle of markdown block and keep focus', async ({ page }) => {
		// Find first markdown block
		const markdownBlocks = page.locator('.editable-block.markdown');
		const firstMarkdown = markdownBlocks.first();

		// Click to activate
		await firstMarkdown.click();

		// Get the textarea
		const textarea = firstMarkdown.locator('textarea');
		await expect(textarea).toBeVisible();
		await expect(textarea).toBeFocused();

		// Get original content
		const originalContent = await textarea.inputValue();
		expect(originalContent.length).toBeGreaterThan(0);

		// Move to middle of content and press ENTER
		await textarea.press('Home');
		await textarea.press('ArrowRight');
		await textarea.press('ArrowRight');
		await textarea.press('ArrowRight');
		await textarea.press('Enter');

		// DON'T wait for debounce - test immediate behavior
		// The user wants to type immediately after pressing ENTER
		// Type some text immediately
		await page.keyboard.type('TYPED_TEXT');

		// Give a tiny buffer for the typing to register
		await page.waitForTimeout(50);

		// Now check that the typed text appears right after the newline position
		// Since we typed at position 3 + ENTER + text, the content should be:
		// "# C\nTYPED_TEXT..."
		const newContent = await page.locator('textarea:focus').inputValue();

		// The text should contain both a newline and our typed text
		expect(newContent).toContain('\n');
		expect(newContent).toContain('TYPED_TEXT');

		// The typed text should appear right after "# C\n", not at the end
		expect(newContent.indexOf('TYPED_TEXT')).toBeLessThan(20);
	});

	test('should add newline at end of markdown block and keep focus', async ({ page }) => {
		// Find first markdown block
		const markdownBlocks = page.locator('.editable-block.markdown');
		const firstMarkdown = markdownBlocks.first();

		// Click to activate
		await firstMarkdown.click();

		const textarea = firstMarkdown.locator('textarea');
		await expect(textarea).toBeVisible();
		await expect(textarea).toBeFocused();

		const originalContent = await textarea.inputValue();

		// Move to END and press ENTER
		await textarea.press('End');
		await textarea.press('Enter');

		// Wait for debounce + buffer to ensure evaluation completes
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 10);

		// Should STILL be focused
		await expect(textarea).toBeFocused();

		// Content should have newline at end
		const newContent = await textarea.inputValue();
		expect(newContent).toContain('\n');
		expect(newContent.endsWith('\n')).toBe(true);

		// Should be able to type on new line
		await page.keyboard.type('continued');
		await page.waitForTimeout(50);

		const finalContent = await textarea.inputValue();
		expect(finalContent).toContain('continued');
	});

	test('should add multiple newlines in markdown block', async ({ page }) => {
		const markdownBlocks = page.locator('.editable-block.markdown');
		const firstMarkdown = markdownBlocks.first();

		await firstMarkdown.click();
		const textarea = firstMarkdown.locator('textarea');
		await expect(textarea).toBeFocused();

		// Press ENTER multiple times
		await textarea.press('End');
		await textarea.press('Enter');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 10);

		await expect(textarea).toBeFocused();

		await textarea.press('Enter');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 10);

		await expect(textarea).toBeFocused();

		await textarea.press('Enter');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 10);

		await expect(textarea).toBeFocused();

		// Should have multiple newlines
		const content = await textarea.inputValue();
		const newlineCount = (content.match(/\n/g) || []).length;
		expect(newlineCount).toBeGreaterThanOrEqual(3);
	});

	test('should preserve ENTER keypress - not lose it', async ({ page }) => {
		const markdownBlocks = page.locator('.editable-block.markdown');
		const firstMarkdown = markdownBlocks.first();

		await firstMarkdown.click();
		const textarea = firstMarkdown.locator('textarea');

		const originalContent = await textarea.inputValue();
		const originalLineCount = originalContent.split('\n').length;

		// Press ENTER at end
		await textarea.press('End');
		await textarea.press('Enter');

		// Wait for debounce + buffer to ensure evaluation completes
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 10);

		// The newline must be preserved in the content
		const newContent = await textarea.inputValue();
		const newLineCount = newContent.split('\n').length;

		// We should have at least one more line
		expect(newLineCount).toBeGreaterThan(originalLineCount);
	});
});
