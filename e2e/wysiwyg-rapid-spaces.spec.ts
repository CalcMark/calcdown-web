import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Test for rapid consecutive space typing - ensures no characters are dropped
 * during fast typing when evaluation loop kicks in
 *
 * Reproduces the issue where typing spaces quickly causes a character to be missed
 * when the screen is redrawing after the debounce timer fires.
 */
test.describe('WYSIWYG Editor - Rapid Space Typing', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 }).catch(() => {});
		// Wait for initial evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 2000);
	});

	test('rapid consecutive spaces should not be dropped during evaluation', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Focus and navigate to line 3
		await textarea.focus();
		await page.waitForTimeout(100);

		// Go to line 0
		for (let i = 0; i < 20; i++) {
			await page.keyboard.press('ArrowUp');
		}
		await page.waitForTimeout(100);

		// Navigate to line 3
		for (let i = 0; i < 3; i++) {
			await page.keyboard.press('ArrowDown');
		}

		// Go to end of line 3
		await page.keyboard.press('End');

		// Type 10 consecutive spaces VERY quickly (faster than debounce)
		// This simulates the user typing spaces at ~100ms intervals
		const spacesToType = 10;
		for (let i = 0; i < spacesToType; i++) {
			await page.keyboard.press('Space');
			// Very fast typing - 80ms between keypresses
			// This ensures that evaluation will kick in DURING the typing sequence
			await page.waitForTimeout(80);
		}

		// Wait a bit for any in-flight evaluations to complete
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Now count the spaces in the textarea
		const textValue = await textarea.evaluate((el: HTMLTextAreaElement) => el.value);
		const lines = textValue.split('\n');
		const line3 = lines[3];

		// Count trailing spaces on line 3
		const match = line3.match(/\s+$/);
		const trailingSpaces = match ? match[0].length : 0;

		console.log('[TEST] Line 3 content:', JSON.stringify(line3));
		console.log('[TEST] Trailing spaces:', trailingSpaces);
		console.log('[TEST] Expected spaces:', spacesToType);

		// CRITICAL: All 10 spaces must be present - no dropped characters!
		expect(trailingSpaces).toBe(spacesToType);
	});

	test('rapid mixed typing (spaces and letters) should not drop characters', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.focus();
		await page.waitForTimeout(100);

		// Go to line 0
		for (let i = 0; i < 20; i++) {
			await page.keyboard.press('ArrowUp');
		}
		await page.waitForTimeout(100);

		// Navigate to line 3
		for (let i = 0; i < 3; i++) {
			await page.keyboard.press('ArrowDown');
		}

		// Go to end of line 3
		await page.keyboard.press('End');

		// Type a mix of spaces and letters quickly
		const textToType = 'a b c d e f g h i j';
		const expectedLength = textToType.length;

		// Record position before typing
		const positionBefore = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		for (const char of textToType) {
			if (char === ' ') {
				await page.keyboard.press('Space');
			} else {
				await page.keyboard.type(char);
			}
			// Fast typing - 70ms between keypresses
			await page.waitForTimeout(70);
		}

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Check cursor advanced by exactly the expected number of characters
		const positionAfter = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		const charactersAdded = positionAfter - positionBefore;

		console.log('[TEST] Characters typed:', expectedLength);
		console.log('[TEST] Position before:', positionBefore);
		console.log('[TEST] Position after:', positionAfter);
		console.log('[TEST] Characters added:', charactersAdded);

		// No characters should be dropped
		expect(charactersAdded).toBe(expectedLength);

		// Verify the exact text was inserted
		const textValue = await textarea.evaluate((el: HTMLTextAreaElement) => el.value);
		expect(textValue).toContain(textToType);
	});

	test('typing during evaluation debounce period should not lose characters', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.focus();
		await page.waitForTimeout(100);

		// Go to line 3
		for (let i = 0; i < 20; i++) {
			await page.keyboard.press('ArrowUp');
		}
		for (let i = 0; i < 3; i++) {
			await page.keyboard.press('ArrowDown');
		}
		await page.keyboard.press('End');

		// Type first character to start the debounce timer
		await page.keyboard.type('x');
		await page.waitForTimeout(50);

		// Now type more characters BEFORE debounce completes
		// This simulates the user continuing to type while evaluation is scheduled
		const additionalText = 'yz123';
		for (const char of additionalText) {
			await page.keyboard.type(char);
			await page.waitForTimeout(40);
		}

		// Wait for debounce + evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// All characters should be present
		const textValue = await textarea.evaluate((el: HTMLTextAreaElement) => el.value);
		const expectedText = 'x' + additionalText;

		console.log('[TEST] Expected text:', expectedText);
		console.log('[TEST] Text value contains expected:', textValue.includes(expectedText));

		expect(textValue).toContain(expectedText);
	});

	test('very rapid typing (50ms intervals) should not drop any characters', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.focus();
		await page.waitForTimeout(100);

		// Navigate to line 3
		for (let i = 0; i < 20; i++) {
			await page.keyboard.press('ArrowUp');
		}
		for (let i = 0; i < 3; i++) {
			await page.keyboard.press('ArrowDown');
		}
		await page.keyboard.press('End');

		// Type 20 characters VERY rapidly (50ms = professional typist speed)
		const rapidText = 'abcdefghijklmnopqrst';
		const positionBefore = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		for (const char of rapidText) {
			await page.keyboard.type(char);
			await page.waitForTimeout(50);
		}

		// Wait for all evaluations to complete
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Verify all characters were added
		const positionAfter = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		const charactersAdded = positionAfter - positionBefore;

		console.log('[TEST] Rapid text:', rapidText);
		console.log('[TEST] Characters added:', charactersAdded);
		console.log('[TEST] Expected:', rapidText.length);

		expect(charactersAdded).toBe(rapidText.length);

		// Double-check the text is actually there
		const textValue = await textarea.evaluate((el: HTMLTextAreaElement) => el.value);
		expect(textValue).toContain(rapidText);
	});
});
