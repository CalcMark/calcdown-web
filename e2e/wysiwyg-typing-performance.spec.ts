import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Test that syntax highlighting and calculations remain visible while typing
 * and only update after the user stops typing (debounce completes)
 */
test.describe('WYSIWYG Editor - Typing Performance', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 }).catch(() => {});
	});

	test('should preserve syntax highlighting while typing on existing lines', async ({ page }) => {
		const overlay = page.locator('.rendered-overlay');

		// Wait for initial evaluation to complete so we have syntax highlighting
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 2000);

		// Initial state: the sample document should have syntax highlighting
		// Line 3: "monthly_salary = $5000" should be highlighted
		const line3 = overlay.locator('.line[data-line="3"]');
		await expect(line3).toBeVisible();

		// Check that line 3 has syntax highlighting (contains token spans)
		const initialHtml = await line3.innerHTML();
		console.log('[TEST] Initial line 3 HTML:', initialHtml);

		// Verify it has tokens (highlighted spans with cm- classes)
		expect(initialHtml).toContain('cm-');

		// Now click on the overlay to focus it (since textarea has pointer-events: none)
		await overlay.click();
		await page.waitForTimeout(100);

		// Move to end of line 3 using keyboard navigation
		// First, go to line 3 by pressing down arrow
		for (let i = 0; i < 3; i++) {
			await page.keyboard.press('ArrowDown');
		}
		// Go to end of line
		await page.keyboard.press('End');

		// Now type some text WITHOUT stopping (continuous typing)
		const textToType = ' + 100';
		for (const char of textToType) {
			await page.keyboard.type(char);
			await page.waitForTimeout(50); // Small delay between keystrokes
		}

		// While typing, check that syntax highlighting is STILL present on line 3
		// (it should NOT have been cleared)
		const htmlWhileTyping = await line3.innerHTML();
		console.log('[TEST] Line 3 HTML while typing:', htmlWhileTyping);

		// The line should STILL have token classes (syntax highlighting preserved)
		expect(htmlWhileTyping).toContain('cm-');

		// Now wait for debounce to complete
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// After evaluation, it should STILL have syntax highlighting
		const htmlAfterEval = await line3.innerHTML();
		console.log('[TEST] Line 3 HTML after evaluation:', htmlAfterEval);
		expect(htmlAfterEval).toContain('cm-');
	});

	test('should preserve gutter results while typing', async ({ page }) => {
		const gutter = page.locator('.gutter');

		// Wait for initial evaluation to complete so we have gutter results
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 2000);

		// Line 3 should have a calculation result in the gutter
		const gutterLine3 = gutter.locator('.gutter-line[data-line="3"]');
		await expect(gutterLine3).toBeVisible();

		// Check initial gutter content
		const initialGutterResult = gutterLine3.locator('.gutter-result');
		await expect(initialGutterResult).toBeVisible();
		const initialResultText = await initialGutterResult.textContent();
		console.log('[TEST] Initial gutter result:', initialResultText);

		// Click on overlay to focus
		const overlay = page.locator('.rendered-overlay');
		await overlay.click();
		await page.waitForTimeout(100);

		// Navigate to line 3 and select "5000"
		for (let i = 0; i < 3; i++) {
			await page.keyboard.press('ArrowDown');
		}
		// Go to end and delete "5000", then type "6000"
		await page.keyboard.press('End');
		for (let i = 0; i < 4; i++) {
			await page.keyboard.press('Backspace');
		}
		await page.keyboard.type('6000');

		// While typing, the gutter result should STILL be visible (not cleared)
		const gutterWhileTyping = await gutterLine3.locator('.gutter-result').isVisible().catch(() => false);
		console.log('[TEST] Gutter visible while typing:', gutterWhileTyping);
		expect(gutterWhileTyping).toBe(true);

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// After evaluation, gutter should still be visible
		const finalGutterResult = gutterLine3.locator('.gutter-result');
		await expect(finalGutterResult).toBeVisible();
		const finalResultText = await finalGutterResult.textContent();
		console.log('[TEST] Final gutter result:', finalResultText);

		// The key point: gutter stayed visible throughout typing
		// The value might or might not have changed depending on what was edited
		expect(finalResultText).toBeTruthy();
	});
});
