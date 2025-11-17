import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * CRITICAL BUG: Rapid delete corrupts text
 *
 * User reported: "I wanted to change `monthly_salary = $5000` to `my_salary = $5000`,
 * so I put my cursor between 'r' and 'y' then pressed 'delete' key quickly.
 * Some correct characters deleted until I stopped but *so did the 'y' appearing to
 * the right of my cursor*, leaving `mo_salary = $5000`, which is clearly not what I expected."
 *
 * Expected: Pressing Backspace between 'r' and 'y' should delete characters BEFORE cursor:
 *   "monthly" → "monthl" → "month" → "mont" → "mon" → "mo"
 *   Result: "mo_salary"
 *
 * BUT: The 'y' after cursor was ALSO deleted, suggesting text corruption or cursor jumping
 *
 * Key question: Which delete key?
 * - Backspace (⌫): Deletes BEFORE cursor
 * - Delete (⌦): Deletes AFTER cursor
 *
 * User said "delete key" but based on context (deleting "nthly"), likely Backspace
 */
test.describe('WYSIWYG Editor - Delete Corruption Bug', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('Rapid Backspace between r and y should NOT delete y', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('monthly_salary = $5000');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor between 'r' and 'y' in "monthly"
		// "monthly" starts at position 0, 'r' is at position 5, cursor after 'r' is position 6
		const cursorPos = 6; // After "monthl", before "y"
		await textarea.evaluate(
			(el: HTMLTextAreaElement, pos) => {
				el.setSelectionRange(pos, pos);
				el.focus();
			},
			cursorPos
		);

		await page.waitForTimeout(100);

		// Verify cursor position
		let actualCursor = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(actualCursor).toBe(cursorPos);

		// Press Backspace rapidly 4 times to delete "nthl"
		// Expected: Should result in "mo" before cursor, "y_salary = $5000" after cursor
		// Expected result: "moy_salary = $5000"
		//
		// BUT USER REPORTED: Got "mo_salary = $5000" - the 'y' was ALSO deleted!
		await textarea.press('Backspace');
		await page.waitForTimeout(30);
		await textarea.press('Backspace');
		await page.waitForTimeout(30);
		await textarea.press('Backspace');
		await page.waitForTimeout(30);
		await textarea.press('Backspace');
		await page.waitForTimeout(50);

		const resultText = await textarea.inputValue();

		console.log('Result after 4 rapid Backspaces:', resultText);

		// EXPECTED: The 'y' MUST still be there
		// This test documents the CORRECT behavior
		// If this test FAILS, it means the bug is reproduced
		expect(resultText).toBe('moy_salary = $5000');

		// Verify 'y' was NOT deleted
		expect(resultText).toContain('y_salary');

		// Cursor should be at position 2 (after "mo")
		actualCursor = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(actualCursor).toBe(2);
	});

	test('Single Backspace between r and y should delete only l', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('monthly_salary = $5000');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor after 'l' (position 6) - between 'l' and 'y'
		// "monthly" = m(0) o(1) n(2) t(3) h(4) l(5) y(6)
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(6, 6);
			el.focus();
		});

		await page.waitForTimeout(100);

		// Press Backspace once - should delete 'l'
		await textarea.press('Backspace');
		await page.waitForTimeout(50);

		const resultText = await textarea.inputValue();

		// Should have "monthy_salary" - deleted 'l', kept 'y'
		expect(resultText).toBe('monthy_salary = $5000');
		expect(resultText).toContain('y_salary');
	});

	test('Document each keystroke to find where corruption happens', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('monthly_salary = $5000');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor between 'r' and 'y'
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(6, 6); // After "monthl", before "y"
			el.focus();
		});

		await page.waitForTimeout(100);

		// Document state before any deletes
		let text = await textarea.inputValue();
		let cursor = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		console.log('Initial state:');
		console.log('  Text:', text);
		console.log('  Cursor:', cursor);
		console.log('  Char before cursor:', text[cursor - 1]);
		console.log('  Char at cursor:', text[cursor]);

		// Press Backspace 1 - should delete 'l'
		await textarea.press('Backspace');
		await page.waitForTimeout(30);

		text = await textarea.inputValue();
		cursor = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		console.log('\nAfter Backspace 1:');
		console.log('  Text:', text);
		console.log('  Cursor:', cursor);
		console.log('  Expected:', 'monthy_salary = $5000');
		expect(text).toBe('monthy_salary = $5000'); // Deleted 'l'
		expect(text[cursor]).toBe('y'); // Cursor should be before 'y'

		// Press Backspace 2 - should delete 'h'
		await textarea.press('Backspace');
		await page.waitForTimeout(30);

		text = await textarea.inputValue();
		cursor = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		console.log('\nAfter Backspace 2:');
		console.log('  Text:', text);
		console.log('  Cursor:', cursor);
		console.log('  Expected:', 'monty_salary = $5000');
		expect(text).toBe('monty_salary = $5000'); // Deleted 'h'
		expect(text[cursor]).toBe('y'); // Cursor should still be before 'y'

		// Press Backspace 3 - should delete 't'
		await textarea.press('Backspace');
		await page.waitForTimeout(30);

		text = await textarea.inputValue();
		cursor = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		console.log('\nAfter Backspace 3:');
		console.log('  Text:', text);
		console.log('  Cursor:', cursor);
		console.log('  Expected:', 'mony_salary = $5000');
		expect(text).toBe('mony_salary = $5000'); // Deleted 't'
		expect(text[cursor]).toBe('y'); // Cursor should still be before 'y'

		// Press Backspace 4 - should delete 'n'
		await textarea.press('Backspace');
		await page.waitForTimeout(50);

		text = await textarea.inputValue();
		cursor = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		console.log('\nAfter Backspace 4:');
		console.log('  Text:', text);
		console.log('  Cursor:', cursor);
		console.log('  Expected:', 'moy_salary = $5000');
		expect(text).toBe('moy_salary = $5000'); // Deleted 'n'

		// CRITICAL: The 'y' MUST NOT be deleted at ANY point
		expect(text).toContain('y_salary');
	});

	test('Verify Backspace never deletes characters AFTER cursor', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('ABCDEFGH');
		await page.waitForTimeout(100);

		// Position cursor between 'D' and 'E' (position 4)
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(4, 4);
			el.focus();
		});

		await page.waitForTimeout(100);

		// Verify initial state
		let text = await textarea.inputValue();
		expect(text).toBe('ABCDEFGH');

		// Press Backspace - should delete 'D'
		await textarea.press('Backspace');
		await page.waitForTimeout(30);

		text = await textarea.inputValue();
		expect(text).toBe('ABCEFGH');

		// 'E', 'F', 'G', 'H' MUST still be there
		expect(text).toContain('EFGH');

		// Press Backspace again - should delete 'C'
		await textarea.press('Backspace');
		await page.waitForTimeout(30);

		text = await textarea.inputValue();
		expect(text).toBe('ABEFGH');

		// 'E', 'F', 'G', 'H' MUST still be there
		expect(text).toContain('EFGH');
	});

	test('Rapid Backspace with evaluation in between', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('monthly_salary = $5000');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor after 'l' in "monthly"
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(6, 6);
			el.focus();
		});

		await page.waitForTimeout(100);

		// Press Backspace twice rapidly
		await textarea.press('Backspace');
		await page.waitForTimeout(30);
		await textarea.press('Backspace');
		await page.waitForTimeout(30);

		let text = await textarea.inputValue();
		console.log('After 2 Backspaces (before evaluation):', text);
		expect(text).toBe('monty_salary = $5000'); // Deleted 'l' and 'h'

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Press Backspace again AFTER evaluation - should delete 't'
		await textarea.press('Backspace');
		await page.waitForTimeout(50);

		text = await textarea.inputValue();
		console.log('After Backspace (after evaluation):', text);
		expect(text).toBe('mony_salary = $5000'); // Deleted 't'

		// 'y' MUST still be there
		expect(text).toContain('y_salary');
	});
});
