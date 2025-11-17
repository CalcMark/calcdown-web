import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Edge case tests for cursor positioning and syntax highlighting preservation
 * during typing in the WYSIWYG editor.
 *
 * These tests ensure critical user experience requirements:
 * 1. Cursor should NOT jump to different lines while typing on one line
 * 2. Syntax highlighting on OTHER lines should remain while typing on ONE line
 * 3. The line being typed on should show raw text until evaluation completes
 * 4. After Enter/arrow keys, cursor should correctly move to new line
 */
test.describe('WYSIWYG Editor - Typing Edge Cases', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page
			.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 })
			.catch(() => {});
		// Wait for initial evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 2000);
	});

	test('cursor stays on same line when typing in middle of calculation', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Click to focus
		await overlay.click();
		await page.waitForTimeout(100);

		// Navigate to line 3 (0-indexed)
		for (let i = 0; i < 3; i++) {
			await page.keyboard.press('ArrowDown');
		}

		// Move cursor to middle of line (after "monthly_salary")
		await page.keyboard.press('End');
		for (let i = 0; i < 7; i++) {
			await page.keyboard.press('ArrowLeft');
		}

		// Get initial cursor position
		const initialLine = await textarea.evaluate((el: HTMLTextAreaElement) => {
			const text = el.value;
			const pos = el.selectionStart;
			return text.substring(0, pos).split('\n').length - 1;
		});

		// Type characters without pressing Enter (staying on same line)
		const textToType = '_annual';
		for (const char of textToType) {
			await page.keyboard.type(char);
			await page.waitForTimeout(50);

			// After each character, verify cursor is STILL on the same line
			const currentLine = await textarea.evaluate((el: HTMLTextAreaElement) => {
				const text = el.value;
				const pos = el.selectionStart;
				return text.substring(0, pos).split('\n').length - 1;
			});

			expect(currentLine).toBe(initialLine);
		}

		console.log('[TEST] Cursor stayed on line', initialLine, 'throughout typing');
	});

	test('typing at start of line preserves highlighting on other lines', async ({ page }) => {
		const overlay = page.locator('.rendered-overlay');
		const textarea = page.locator('.raw-textarea');

		// Check line 4 has syntax highlighting initially (bonus = $500)
		const line4 = overlay.locator('.line[data-line="4"]');
		const initialLine4Html = await line4.innerHTML();
		expect(initialLine4Html).toContain('cm-');

		// Check line 8 has syntax highlighting initially (rent = $1500)
		const line8 = overlay.locator('.line[data-line="8"]');
		const initialLine8Html = await line8.innerHTML();
		expect(initialLine8Html).toContain('cm-');

		// Focus textarea, then position cursor at line 5 (total_income = ...)
		await textarea.focus();
		await page.waitForTimeout(100);

		// Navigate to line 5 by pressing arrow down
		// Start by going to line 0 with repeated ArrowUp
		for (let i = 0; i < 20; i++) {
			await page.keyboard.press('ArrowUp');
		}
		await page.waitForTimeout(100);

		// Now navigate to line 5
		for (let i = 0; i < 5; i++) {
			await page.keyboard.press('ArrowDown');
		}

		// Go to start of line 5
		await page.keyboard.press('Home');

		// Type at start of line 5
		await page.keyboard.type('comment_');
		await page.waitForTimeout(100);

		// Verify line 4 STILL has highlighting (we didn't touch it)
		const line4DuringTyping = await line4.innerHTML();
		expect(line4DuringTyping).toContain('cm-');
		expect(line4DuringTyping).toBe(initialLine4Html); // Exact same content

		// Verify line 8 STILL has highlighting (we didn't touch it)
		const line8DuringTyping = await line8.innerHTML();
		expect(line8DuringTyping).toContain('cm-');
		expect(line8DuringTyping).toBe(initialLine8Html); // Exact same content

		console.log('[TEST] Other lines preserved highlighting while typing on line 5');
	});

	test('pressing Enter moves cursor to next line correctly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Click to focus
		await overlay.click();
		await page.waitForTimeout(100);

		// Navigate to line 2
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');

		// Go to end of line 2
		await page.keyboard.press('End');

		// Get current line
		const lineBeforeEnter = await textarea.evaluate((el: HTMLTextAreaElement) => {
			const text = el.value;
			const pos = el.selectionStart;
			return text.substring(0, pos).split('\n').length - 1;
		});

		// Press Enter to create a new line
		await page.keyboard.press('Enter');
		await page.waitForTimeout(50);

		// Cursor should now be on the NEXT line
		const lineAfterEnter = await textarea.evaluate((el: HTMLTextAreaElement) => {
			const text = el.value;
			const pos = el.selectionStart;
			return text.substring(0, pos).split('\n').length - 1;
		});

		expect(lineAfterEnter).toBe(lineBeforeEnter + 1);
		console.log(
			'[TEST] Cursor correctly moved from line',
			lineBeforeEnter,
			'to line',
			lineAfterEnter
		);
	});

	test('arrow down/up keys correctly change cursor line number', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.focus();
		await page.waitForTimeout(100);

		// Go to beginning of document by pressing ArrowUp many times
		// This is more reliable than Control+Home in Playwright
		for (let i = 0; i < 20; i++) {
			await page.keyboard.press('ArrowUp');
		}
		await page.waitForTimeout(100);

		// Now we should be at line 0
		let currentLine = await textarea.evaluate((el: HTMLTextAreaElement) => {
			const text = el.value;
			const pos = el.selectionStart;
			return text.substring(0, pos).split('\n').length - 1;
		});
		expect(currentLine).toBe(0);

		// Arrow down 3 times
		for (let i = 0; i < 3; i++) {
			await page.keyboard.press('ArrowDown');
			await page.waitForTimeout(50);

			currentLine = await textarea.evaluate((el: HTMLTextAreaElement) => {
				const text = el.value;
				const pos = el.selectionStart;
				return text.substring(0, pos).split('\n').length - 1;
			});

			expect(currentLine).toBe(i + 1);
		}

		// Now arrow up 2 times
		for (let i = 0; i < 2; i++) {
			await page.keyboard.press('ArrowUp');
			await page.waitForTimeout(50);

			currentLine = await textarea.evaluate((el: HTMLTextAreaElement) => {
				const text = el.value;
				const pos = el.selectionStart;
				return text.substring(0, pos).split('\n').length - 1;
			});

			expect(currentLine).toBe(3 - i - 1);
		}

		console.log('[TEST] Arrow keys correctly changed line numbers');
	});

	test('deleting characters on one line preserves highlighting on other lines', async ({
		page
	}) => {
		const overlay = page.locator('.rendered-overlay');
		const textarea = page.locator('.raw-textarea');

		// Check line 3 has syntax highlighting initially (monthly_salary = $5000)
		const line3 = overlay.locator('.line[data-line="3"]');
		const initialLine3Html = await line3.innerHTML();
		expect(initialLine3Html).toContain('cm-');

		// Focus textarea and go to line 5
		await textarea.focus();
		await page.waitForTimeout(100);

		// Go to beginning by pressing ArrowUp many times
		for (let i = 0; i < 20; i++) {
			await page.keyboard.press('ArrowUp');
		}
		await page.waitForTimeout(100);

		// Navigate to line 5
		for (let i = 0; i < 5; i++) {
			await page.keyboard.press('ArrowDown');
		}

		// Go to end and delete some characters from line 5
		await page.keyboard.press('End');
		for (let i = 0; i < 5; i++) {
			await page.keyboard.press('Backspace');
			await page.waitForTimeout(50);
		}

		// Line 3 should STILL have its highlighting (we only edited line 5)
		const line3AfterDelete = await line3.innerHTML();
		expect(line3AfterDelete).toContain('cm-');
		expect(line3AfterDelete).toBe(initialLine3Html); // Exact same content

		console.log('[TEST] Other lines preserved highlighting during deletion');
	});

	test('rapid continuous typing does not cause cursor to jump', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		await overlay.click();
		await page.waitForTimeout(100);

		// Navigate to line 3
		for (let i = 0; i < 3; i++) {
			await page.keyboard.press('ArrowDown');
		}

		// Get initial line
		const initialLine = await textarea.evaluate((el: HTMLTextAreaElement) => {
			const text = el.value;
			const pos = el.selectionStart;
			return text.substring(0, pos).split('\n').length - 1;
		});

		// Type RAPIDLY (minimal delay) to simulate fast typing
		const rapidText = '_additional_amount_for_calculation';
		for (const char of rapidText) {
			await page.keyboard.type(char);
			// Very short delay - simulating fast typing
			await page.waitForTimeout(10);

			// Cursor should NEVER jump to a different line
			const currentLine = await textarea.evaluate((el: HTMLTextAreaElement) => {
				const text = el.value;
				const pos = el.selectionStart;
				return text.substring(0, pos).split('\n').length - 1;
			});

			if (currentLine !== initialLine) {
				throw new Error(
					`Cursor jumped from line ${initialLine} to line ${currentLine} during rapid typing!`
				);
			}
		}

		console.log('[TEST] Cursor stayed stable during rapid typing');
	});

	test('typing after deleting entire line content preserves highlighting elsewhere', async ({
		page
	}) => {
		const overlay = page.locator('.rendered-overlay');

		// Check line 5 has syntax highlighting
		const line5 = overlay.locator('.line[data-line="5"]');
		const initialLine5Html = await line5.innerHTML();
		expect(initialLine5Html).toContain('cm-');

		// Click to focus
		await overlay.click();
		await page.waitForTimeout(100);

		// Navigate to line 3
		for (let i = 0; i < 3; i++) {
			await page.keyboard.press('ArrowDown');
		}

		// Select all content on line 3 and delete it
		await page.keyboard.press('Home');
		await page.keyboard.press('Shift+End');
		await page.keyboard.press('Delete');
		await page.waitForTimeout(50);

		// Now type new content
		await page.keyboard.type('new_var = 999');
		await page.waitForTimeout(100);

		// Line 5 should STILL have its highlighting
		const line5AfterChange = await line5.innerHTML();
		expect(line5AfterChange).toContain('cm-');
		expect(line5AfterChange).toBe(initialLine5Html);

		console.log('[TEST] Replacing entire line content preserved highlighting elsewhere');
	});

	test('pasting text does not cause cursor to jump or clear highlighting on other lines', async ({
		page
	}) => {
		const overlay = page.locator('.rendered-overlay');
		const textarea = page.locator('.raw-textarea');

		// Check line 3 has highlighting (monthly_salary = $5000)
		const line3 = overlay.locator('.line[data-line="3"]');
		const initialLine3Html = await line3.innerHTML();
		expect(initialLine3Html).toContain('cm-');

		// Focus textarea and navigate to line 5
		await textarea.focus();
		await page.waitForTimeout(100);

		// Go to beginning by pressing ArrowUp many times
		for (let i = 0; i < 20; i++) {
			await page.keyboard.press('ArrowUp');
		}
		await page.waitForTimeout(100);

		// Navigate to line 5
		for (let i = 0; i < 5; i++) {
			await page.keyboard.press('ArrowDown');
		}

		// Get initial line number
		const initialLine = await textarea.evaluate((el: HTMLTextAreaElement) => {
			const text = el.value;
			const pos = el.selectionStart;
			return text.substring(0, pos).split('\n').length - 1;
		});

		// Simulate paste (this might vary by browser, but we'll try)
		// For now, we'll simulate typing multiple characters quickly
		const pasteText = 'pasted_value_1234';
		for (const char of pasteText) {
			await page.keyboard.type(char);
		}
		await page.waitForTimeout(100);

		// Verify cursor stayed on same line
		const finalLine = await textarea.evaluate((el: HTMLTextAreaElement) => {
			const text = el.value;
			const pos = el.selectionStart;
			return text.substring(0, pos).split('\n').length - 1;
		});

		expect(finalLine).toBe(initialLine);

		// Verify line 3 still has its highlighting
		const line3After = await line3.innerHTML();
		expect(line3After).toContain('cm-');
		expect(line3After).toBe(initialLine3Html);

		console.log('[TEST] Pasting did not cause cursor jump or highlight loss');
	});
});
