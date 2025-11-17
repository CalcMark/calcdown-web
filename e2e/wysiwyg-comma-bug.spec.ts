import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * CRITICAL: Reproduce the exact bug reported by user
 *
 * User typed ',' after '$500' and cursor stayed at insertion point.
 * Then typed '000' and got '$500, 000' with phantom space.
 */
test.describe('WYSIWYG Editor - Comma Insertion Bug', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('exact repro: typing comma then digits after evaluation', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type initial content
		await textarea.clear();
		await textarea.type('bonus = $500');

		// Wait for evaluation to complete
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		// Verify initial value
		let textValue = await textarea.inputValue();
		expect(textValue).toBe('bonus = $500');

		// Method 1: Click at end of line
		await textarea.click();
		// Click specifically after the '0' in '$500'
		const lineElement = page.locator('.line').first();
		const box = await lineElement.boundingBox();
		if (box) {
			// Click near the end of the line
			await page.mouse.click(box.x + box.width - 10, box.y + box.height / 2);
		}

		await page.waitForTimeout(200);

		// Now type comma - verify IMMEDIATELY
		await textarea.press(',');
		await page.waitForTimeout(50);

		textValue = await textarea.inputValue();
		console.log(`After comma: "${textValue}"`);
		expect(textValue).toBe('bonus = $500,');

		// Verify cursor position
		let cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe('bonus = $500,'.length);

		// Type '0' - verify IMMEDIATELY
		await textarea.press('0');
		await page.waitForTimeout(50);

		textValue = await textarea.inputValue();
		console.log(`After first zero: "${textValue}"`);
		expect(textValue).toBe('bonus = $500,0');

		// Verify cursor position
		cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe('bonus = $500,0'.length);

		// Type second '0' - verify IMMEDIATELY
		await textarea.press('0');
		await page.waitForTimeout(50);

		textValue = await textarea.inputValue();
		console.log(`After second zero: "${textValue}"`);
		expect(textValue).toBe('bonus = $500,00');

		// Type third '0' - verify IMMEDIATELY
		await textarea.press('0');
		await page.waitForTimeout(50);

		textValue = await textarea.inputValue();
		console.log(`After third zero: "${textValue}"`);
		expect(textValue).toBe('bonus = $500,000');

		// Final check: NO phantom spaces
		expect(textValue).not.toContain(' ,');
		expect(textValue).not.toContain(', ');
		expect(textValue).toBe('bonus = $500,000');
	});

	test('repro with keyboard navigation instead of mouse', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type initial content
		await textarea.clear();
		await textarea.type('bonus = $500');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		// Use keyboard to go to end
		await textarea.press('End');
		await page.waitForTimeout(100);

		// Type comma
		await textarea.press(',');
		await page.waitForTimeout(50);

		let textValue = await textarea.inputValue();
		expect(textValue).toBe('bonus = $500,');

		// Type zeros one by one with checks
		await textarea.press('0');
		await page.waitForTimeout(50);
		textValue = await textarea.inputValue();
		expect(textValue).toBe('bonus = $500,0');

		await textarea.press('0');
		await page.waitForTimeout(50);
		textValue = await textarea.inputValue();
		expect(textValue).toBe('bonus = $500,00');

		await textarea.press('0');
		await page.waitForTimeout(50);
		textValue = await textarea.inputValue();
		expect(textValue).toBe('bonus = $500,000');
	});

	test('repro: typing through evaluation boundary', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type initial content
		await textarea.clear();
		await textarea.type('bonus = $500');

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Go to end
		await textarea.press('End');
		await page.waitForTimeout(100);

		// Type comma
		await textarea.press(',');

		// DON'T wait - type immediately
		await textarea.press('0');
		await textarea.press('0');

		// NOW wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Type final zero AFTER evaluation
		await textarea.press('0');
		await page.waitForTimeout(50);

		const textValue = await textarea.inputValue();
		expect(textValue).toBe('bonus = $500,000');
	});

	test('repro: rapid typing after click', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.type('bonus = $500');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		// Click to position cursor
		const lineElement = page.locator('.line').first();
		const box = await lineElement.boundingBox();
		if (box) {
			await page.mouse.click(box.x + box.width - 10, box.y + box.height / 2);
		}

		// Type VERY rapidly without waiting
		await textarea.press(',');
		await textarea.press('0');
		await textarea.press('0');
		await textarea.press('0');

		// Check immediately
		await page.waitForTimeout(100);
		const textValue = await textarea.inputValue();

		console.log(`After rapid typing: "${textValue}"`);
		expect(textValue).toBe('bonus = $500,000');
	});
});
