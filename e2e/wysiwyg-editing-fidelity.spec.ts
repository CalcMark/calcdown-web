import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * CRITICAL fuzzing tests for editing fidelity
 *
 * These tests ensure that what the user types is EXACTLY what appears in the editor.
 * ANY deviation is a critical bug. The editor must maintain 100% fidelity between
 * user input and displayed text at all times.
 */

/**
 * Helper to generate random printable ASCII characters
 */
function randomChar(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,;:!?-_=+*/$#@()[]{}<>';
	return chars[Math.floor(Math.random() * chars.length)];
}

/**
 * Helper to generate random delay simulating human typing
 */
function randomDelay(min = 30, max = 150): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

test.describe('WYSIWYG Editor - Editing Fidelity (CRITICAL)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('typing comma in middle of number should insert at correct position', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('bonus = $500');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor after "$500" (at end of line)
		await textarea.click();
		await textarea.press('End');

		// Type comma
		await textarea.type(',', { delay: randomDelay() });
		await page.waitForTimeout(50);

		// Check textarea value immediately after comma
		let textValue = await textarea.inputValue();
		expect(textValue).toBe('bonus = $500,');

		// Type '000'
		await textarea.type('000', { delay: randomDelay() });
		await page.waitForTimeout(50);

		// Check final value - should be exactly "$500,000" with NO extra spaces
		textValue = await textarea.inputValue();
		expect(textValue).toBe('bonus = $500,000');

		// Verify cursor is at the end
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(textValue.length);
	});

	test('typing punctuation mid-expression should maintain exact fidelity', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('result = 100 + 200');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor after "100"
		const initialValue = await textarea.inputValue();
		const pos = initialValue.indexOf('100') + 3;
		await textarea.evaluate((el: HTMLTextAreaElement, position) => {
			el.setSelectionRange(position, position);
			el.focus();
		}, pos);
		await page.waitForTimeout(100);

		// Type ".5"
		await textarea.type('.5', { delay: randomDelay() });
		await page.waitForTimeout(50);

		// Check value
		let textValue = await textarea.inputValue();
		expect(textValue).toBe('result = 100.5 + 200');

		// Verify cursor position
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(pos + 2); // Should be after "100.5"
	});

	test('rapid character insertion should never drop or reorder characters', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();

		// Type a calculation rapidly with random delays
		const textToType = 'price = $1,234.56';
		let expectedText = '';

		for (const char of textToType) {
			await textarea.type(char, { delay: randomDelay(10, 50) });
			expectedText += char;

			// Verify after EVERY character
			const currentValue = await textarea.inputValue();
			expect(currentValue).toBe(expectedText);
		}

		// Final verification
		const finalValue = await textarea.inputValue();
		expect(finalValue).toBe(textToType);
	});

	test('inserting characters mid-line should not corrupt surrounding text', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('total = value');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Position cursor after "total"
		const initialValue = await textarea.inputValue();
		const pos = initialValue.indexOf('total') + 5;
		await textarea.evaluate((el: HTMLTextAreaElement, position) => {
			el.setSelectionRange(position, position);
			el.focus();
		}, pos);
		await page.waitForTimeout(100);

		// Type "_final"
		await textarea.type('_final', { delay: randomDelay() });
		await page.waitForTimeout(50);

		// Verify exact text
		const textValue = await textarea.inputValue();
		expect(textValue).toBe('total_final = value');

		// Verify no phantom characters
		expect(textValue).not.toContain('  '); // No double spaces
		expect(textValue.length).toBe('total_final = value'.length);
	});

	test('fuzz test: random edits should maintain exact character sequence', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();

		// Build up text with random insertions
		let expectedText = '';
		const operations = [
			{ type: 'append', text: 'salary' },
			{ type: 'append', text: ' = ' },
			{ type: 'append', text: '$' },
			{ type: 'append', text: '50' },
			{ type: 'append', text: ',' },
			{ type: 'append', text: '000' },
		];

		for (const op of operations) {
			await textarea.type(op.text, { delay: randomDelay() });
			expectedText += op.text;

			// Wait a bit to simulate human typing
			await page.waitForTimeout(randomDelay(20, 100));

			// Verify exact match after each operation
			const currentValue = await textarea.inputValue();
			if (currentValue !== expectedText) {
				console.error(`Mismatch after typing "${op.text}"`);
				console.error(`Expected: "${expectedText}"`);
				console.error(`Got:      "${currentValue}"`);
			}
			expect(currentValue).toBe(expectedText);
		}

		// Final check
		const finalValue = await textarea.inputValue();
		expect(finalValue).toBe('salary = $50,000');
		expect(finalValue).not.toContain('  '); // No phantom spaces
	});

	test('cursor position MUST update after EVERY single character', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();

		// Type text character by character, verifying cursor position after EACH keystroke
		// This is the expected behavior for any text editor
		const text = 'x = 100';
		for (let i = 0; i < text.length; i++) {
			await textarea.type(text[i], { delay: randomDelay() });

			// Cursor MUST be at the correct position immediately
			const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
			expect(cursorPos).toBe(i + 1);
		}
	});

	test('typing after evaluation should not insert at wrong position', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('amount = $100');

		// Wait for evaluation to complete
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Position cursor at end
		await textarea.click();
		await textarea.press('End');

		// Type comma
		await textarea.type(',', { delay: randomDelay() });
		await page.waitForTimeout(50);

		let textValue = await textarea.inputValue();
		expect(textValue).toBe('amount = $100,');

		// Type more digits
		await textarea.type('00', { delay: randomDelay() });
		await page.waitForTimeout(50);

		textValue = await textarea.inputValue();
		expect(textValue).toBe('amount = $100,00');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Type one more digit
		await textarea.type('0', { delay: randomDelay() });
		await page.waitForTimeout(50);

		// Should be exactly "$100,000"
		textValue = await textarea.inputValue();
		expect(textValue).toBe('amount = $100,000');
		expect(textValue).not.toContain(' ,'); // No space before comma
		expect(textValue).not.toContain(', '); // No space after comma
	});

	test('no phantom characters should ever appear', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();

		// Type a known sequence
		const sequence = 'a=1+2';
		await textarea.type(sequence, { delay: randomDelay() });
		await page.waitForTimeout(50);

		const textValue = await textarea.inputValue();

		// Should match exactly
		expect(textValue).toBe(sequence);

		// Should not contain any unexpected characters
		expect(textValue.length).toBe(sequence.length);

		// Check each character
		for (let i = 0; i < sequence.length; i++) {
			expect(textValue[i]).toBe(sequence[i]);
		}
	});
});
