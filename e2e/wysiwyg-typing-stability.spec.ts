import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Helper function to add random human-like typing delays
 * @param min Minimum delay in milliseconds
 * @param max Maximum delay in milliseconds
 * @returns Random delay between min and max
 */
function randomTypingDelay(min = 30, max = 150): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Helper function to add random pause delays (for simulating thinking/pauses)
 * @param min Minimum pause in milliseconds
 * @param max Maximum pause in milliseconds
 * @returns Random pause between min and max
 */
function randomPause(min = 100, max = 300): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Critical tests for typing stability
 *
 * Ensures that normal typing and editing behavior is preserved without
 * visual corruption, line merging, or text displacement.
 */
test.describe('WYSIWYG Editor - Typing Stability (CRITICAL)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('typing mid-word with pauses should not corrupt rendering', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Set up initial content
		await textarea.clear();
		await textarea.fill('monthly_salary = $5000\nbonus = $500');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Click at the end of "bonus"
		await textarea.click();
		await textarea.press('End'); // Go to end of document
		await textarea.press('ArrowUp'); // Go to line 1
		await textarea.press('End'); // Go to end of line 1

		// Type with random pauses (simulating human typing)
		await textarea.press('Backspace');
		await page.waitForTimeout(randomTypingDelay());
		await textarea.press('Backspace');
		await page.waitForTimeout(randomTypingDelay());
		await textarea.press('Backspace');
		await page.waitForTimeout(randomPause());

		await textarea.type('n');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + randomPause(400, 600)); // Wait for evaluation

		await textarea.type('u');
		await page.waitForTimeout(randomTypingDelay());

		await textarea.type('s');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + randomPause(400, 600)); // Wait for evaluation

		// Check that we have exactly 2 lines
		const overlay = page.locator('.rendered-overlay');
		const lines = overlay.locator('.line');
		const lineCount = await lines.count();

		expect(lineCount).toBe(2);

		// Check line contents
		const line0Text = await lines.nth(0).textContent();
		const line1Text = await lines.nth(1).textContent();

		expect(line0Text).toContain('monthly_salary');
		expect(line1Text).toContain('bonus');

		// Lines should NOT be merged
		expect(line0Text).not.toContain('bonus');
	});

	test('typing in middle of identifier should preserve line structure', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('result = 100\ntotal = 200\nfinal = 300');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor in middle of "total" on line 2
		const textValue = await textarea.inputValue();
		const totalPos = textValue.indexOf('total') + 2; // Middle of "total"
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, totalPos);

		// Wait a bit to ensure cursor position is set
		await page.waitForTimeout(100);

		// Type some characters with random delays between characters
		await textarea.type('_new', { delay: randomTypingDelay() });
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + randomPause(800, 1200));

		// Verify we still have 3 lines
		const overlay = page.locator('.rendered-overlay');
		const lines = overlay.locator('.line');
		expect(await lines.count()).toBe(3);

		// Verify content
		const line0Text = await lines.nth(0).textContent();
		const line1Text = await lines.nth(1).textContent();
		const line2Text = await lines.nth(2).textContent();

		expect(line0Text).toContain('result');
		expect(line1Text).toContain('to_newtal'); // Should have inserted text
		expect(line2Text).toContain('final');
	});

	test('rapid typing followed by pause should not merge lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('line1 = 100\nline2 = 200');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor at end of line 1 (after "100")
		const textValue = await textarea.inputValue();
		const endOfLine1 = textValue.indexOf('\n'); // Position just before newline
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, endOfLine1);

		// Wait a bit to ensure cursor position is set
		await page.waitForTimeout(100);

		// Rapid typing with slight variation
		await textarea.type(' + extra', { delay: randomTypingDelay(20, 80) });

		// Pause (trigger evaluation) with random wait time
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + randomPause(800, 1200));

		// Check textarea value first
		const newTextValue = await textarea.inputValue();
		expect(newTextValue).toBe('line1 = 100 + extra\nline2 = 200');

		// Verify still 2 lines in overlay
		const overlay = page.locator('.rendered-overlay');
		const lines = overlay.locator('.line');
		expect(await lines.count()).toBe(2);

		const line0Text = await lines.nth(0).textContent();
		const line1Text = await lines.nth(1).textContent();

		expect(line0Text).toContain('line1');
		expect(line1Text).toContain('line2');
		expect(line1Text).not.toContain('extra'); // Should NOT be merged
	});

	test('editing at start of line should not affect next line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('first = 1\nsecond = 2\nthird = 3');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position at start of line 2 (second = 2)
		const textValue = await textarea.inputValue();
		const secondPos = textValue.indexOf('second');
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, secondPos);

		// Wait a bit to ensure cursor position is set
		await page.waitForTimeout(100);

		// Type with random delays between characters (but within the type call)
		await textarea.type('new_', { delay: randomTypingDelay() });
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + randomPause(800, 1200));

		// Verify 3 lines still exist
		const overlay = page.locator('.rendered-overlay');
		const lines = overlay.locator('.line');
		expect(await lines.count()).toBe(3);

		const line1Text = await lines.nth(1).textContent();
		const line2Text = await lines.nth(2).textContent();

		expect(line1Text).toContain('new_second');
		expect(line2Text).toContain('third');
		expect(line2Text).not.toContain('second'); // Should not be merged
	});

	test('typing markdown with pauses should not corrupt layout', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('# Header\n\nSome text');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor at end of "Header" (before first newline)
		const textValue = await textarea.inputValue();
		const endOfHeader = textValue.indexOf('\n'); // Position just before first newline
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, endOfHeader);

		// Wait a bit to ensure cursor position is set
		await page.waitForTimeout(100);

		// Type with random delays between characters (but within the type call)
		await textarea.type(' Extended', { delay: randomTypingDelay() });
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + randomPause(800, 1200));

		// Check textarea value first
		const newTextValue = await textarea.inputValue();
		expect(newTextValue).toBe('# Header Extended\n\nSome text');

		// Verify 3 lines in overlay
		const overlay = page.locator('.rendered-overlay');
		const lines = overlay.locator('.line');
		expect(await lines.count()).toBe(3);

		const line0Text = await lines.nth(0).textContent();
		const line2Text = await lines.nth(2).textContent();

		expect(line0Text).toContain('Header Extended');
		expect(line2Text).toContain('Some text');
		expect(line0Text).not.toContain('Some text'); // Should not merge
	});

	test('deleting characters with pauses should maintain line structure', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('monthly_salary = $5000\nbonus = $500\ntotal = monthly_salary + bonus');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		// Go to middle of "monthly_salary" on line 1
		const textValue = await textarea.inputValue();
		const salaryPos = textValue.indexOf('monthly_salary') + 8; // After "monthly_"
		await textarea.evaluate((el: HTMLTextAreaElement, pos) => {
			el.setSelectionRange(pos, pos);
			el.focus();
		}, salaryPos);

		// Wait a bit to ensure cursor position is set
		await page.waitForTimeout(100);

		// Delete some characters with random pauses
		await textarea.press('Backspace');
		await page.waitForTimeout(randomTypingDelay());
		await textarea.press('Backspace');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + randomPause(800, 1200));

		// Verify still 3 lines
		const overlay = page.locator('.rendered-overlay');
		const lines = overlay.locator('.line');
		expect(await lines.count()).toBe(3);

		const line1Text = await lines.nth(1).textContent();
		const line2Text = await lines.nth(2).textContent();

		expect(line1Text).toContain('bonus');
		expect(line2Text).toContain('total');
		expect(line1Text).not.toContain('total'); // Should not merge
	});

	test('text should never appear to the right of cursor after evaluation', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('test = 100');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position in middle of "test"
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(2, 2); // After "te"
			el.focus();
		});

		// Wait a bit to ensure cursor position is set
		await page.waitForTimeout(100);

		// Type "mp" with random delays
		await textarea.type('m', { delay: randomTypingDelay() });
		await page.waitForTimeout(randomTypingDelay());
		await textarea.type('p', { delay: randomTypingDelay() });

		// Wait for evaluation with random pause
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + randomPause(800, 1200));

		// Get cursor position
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Get text value
		const textValue = await textarea.inputValue();

		// Text before cursor should be "temp"
		const textBeforeCursor = textValue.substring(0, cursorPos);
		expect(textBeforeCursor).toBe('temp');

		// Text after cursor should be "st = 100"
		const textAfterCursor = textValue.substring(cursorPos);
		expect(textAfterCursor).toBe('st = 100');
	});

	test('continuous typing session should maintain stability', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();

		// Simulate a realistic typing session with random delays
		await textarea.type('# Budget\n\n', { delay: randomTypingDelay() });
		await page.waitForTimeout(randomPause(150, 250));

		await textarea.type('monthly', { delay: randomTypingDelay() });
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + randomPause(400, 600));

		await textarea.type('_salary = $5', { delay: randomTypingDelay() });
		await page.waitForTimeout(randomTypingDelay());

		await textarea.type('000', { delay: randomTypingDelay() });
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + randomPause(400, 600));

		await textarea.type('\nbonus', { delay: randomTypingDelay() });
		await page.waitForTimeout(randomPause(150, 250));

		await textarea.type(' = ', { delay: randomTypingDelay() });
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + randomPause(400, 600));

		await textarea.type('$500', { delay: randomTypingDelay() });
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + randomPause(800, 1200));

		// Final verification
		const overlay = page.locator('.rendered-overlay');
		const lines = overlay.locator('.line');
		const lineCount = await lines.count();

		expect(lineCount).toBe(4); // "# Budget", blank, salary, bonus

		const finalText = await textarea.inputValue();
		expect(finalText).toBe('# Budget\n\nmonthly_salary = $5000\nbonus = $500');

		// Verify each line renders correctly
		const line0Text = await lines.nth(0).textContent();
		const line2Text = await lines.nth(2).textContent();
		const line3Text = await lines.nth(3).textContent();

		expect(line0Text).toContain('Budget');
		expect(line2Text).toContain('monthly_salary');
		expect(line3Text).toContain('bonus');
	});
});
