import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Tests for textarea and overlay visual synchronization
 *
 * These tests verify that the textarea content and overlay rendering
 * remain visually synchronized during typing, especially during the
 * typing/idle state transitions.
 */
test.describe('WYSIWYG Editor - Textarea/Overlay Sync', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('textarea and overlay should show identical text content', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Clear and type new content
		await textarea.clear();
		await textarea.type('result = 100 + 200');

		// Wait for typing to finish and overlay to update
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Get textarea value
		const textareaValue = await textarea.inputValue();

		// Get overlay text (combining all lines)
		const overlayText = await overlay.evaluate((el) => {
			const lines = el.querySelectorAll('.line');
			return Array.from(lines)
				.map((line) => line.textContent || '')
				.join('\n')
				.trim();
		});

		// Extract just the raw text from overlay (without syntax highlighting)
		const overlayRawText = overlayText.replace(/\s+/g, ' ').trim();
		const textareaRawText = textareaValue.replace(/\s+/g, ' ').trim();

		expect(overlayRawText).toContain('result');
		expect(overlayRawText).toContain('100');
		expect(overlayRawText).toContain('200');
	});

	test('overlay should update to match textarea after typing stops', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();

		// Type in multiple stages
		await textarea.type('first = 10\n');
		await page.waitForTimeout(50); // Brief pause
		await textarea.type('second = 20\n');
		await page.waitForTimeout(50);
		await textarea.type('total = first + second');

		// Wait for idle state (150ms typing timeout + debounce + evaluation)
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Get final textarea content
		const textareaValue = await textarea.inputValue();

		// Count lines in textarea
		const textareaLines = textareaValue.split('\n');

		// Count lines in overlay
		const overlay = page.locator('.rendered-overlay');
		const overlayLineCount = await overlay.locator('.line').count();

		// Should have same number of lines
		expect(overlayLineCount).toBe(textareaLines.length);

		// Check each line has content
		for (let i = 0; i < textareaLines.length; i++) {
			const line = overlay.locator('.line').nth(i);
			const lineText = await line.textContent();

			// Overlay line should contain key parts of textarea line
			const textareaLine = textareaLines[i];
			if (textareaLine.includes('first')) {
				expect(lineText).toContain('first');
			} else if (textareaLine.includes('second')) {
				expect(lineText).toContain('second');
			} else if (textareaLine.includes('total')) {
				expect(lineText).toContain('total');
			}
		}
	});

	test('rapid typing should not cause line count mismatch', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		await textarea.clear();

		// Type very quickly without waiting
		await textarea.type('a = 1\nb = 2\nc = 3\nd = 4\ne = 5', { delay: 10 });

		// Wait for everything to settle
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Get line counts
		const textareaValue = await textarea.inputValue();
		const textareaLineCount = textareaValue.split('\n').length;
		const overlayLineCount = await overlay.locator('.line').count();

		// Should match
		expect(overlayLineCount).toBe(textareaLineCount);
		expect(overlayLineCount).toBe(5);
	});

	test('typing during evaluation should not corrupt overlay', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.type('x = 100');

		// Start evaluation by waiting a bit
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS / 2);

		// Type more DURING evaluation
		await textarea.type('\ny = 200');

		// Wait for everything to finish
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Check final state
		const textareaValue = await textarea.inputValue();
		expect(textareaValue).toBe('x = 100\ny = 200');

		// Overlay should have 2 lines
		const overlay = page.locator('.rendered-overlay');
		const lineCount = await overlay.locator('.line').count();
		expect(lineCount).toBe(2);
	});

	test('textarea CSS classes should toggle correctly during typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();

		// Wait for typing timeout to go back to idle after clear()
		await page.waitForTimeout(200);

		// Check initial state (idle)
		const initialClasses = await textarea.getAttribute('class');
		expect(initialClasses).toContain('idle');

		// Start typing
		await textarea.type('test', { delay: 50 });

		// Check immediately - should be typing
		await page.waitForTimeout(10);
		const typingClasses = await textarea.getAttribute('class');
		expect(typingClasses).toContain('typing');

		// Wait for idle timeout (150ms + buffer)
		await page.waitForTimeout(200);

		// Should be back to idle
		const idleClasses = await textarea.getAttribute('class');
		expect(idleClasses).toContain('idle');
	});

	test('overlay should hide during typing and show when idle', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		await textarea.clear();
		await textarea.type('x = 1');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Overlay should be visible (not hidden) when idle
		const idleHidden = await overlay.evaluate((el) => el.classList.contains('hidden'));
		expect(idleHidden).toBe(false);

		// Start typing
		await textarea.type('\ny = 2', { delay: 50 });

		// Check immediately during typing
		await page.waitForTimeout(10);
		const typingHidden = await overlay.evaluate((el) => el.classList.contains('hidden'));
		expect(typingHidden).toBe(true);

		// Wait for idle
		await page.waitForTimeout(200);

		// Should be visible again
		const backToIdleHidden = await overlay.evaluate((el) => el.classList.contains('hidden'));
		expect(backToIdleHidden).toBe(false);
	});

	test('line breaks should be preserved in both textarea and overlay', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		await textarea.clear();
		await textarea.type('line1\n\nline3\n\n\nline6');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Textarea should have 6 lines (including empty ones)
		const textareaValue = await textarea.inputValue();
		const textareaLineCount = textareaValue.split('\n').length;
		expect(textareaLineCount).toBe(6);

		// Overlay should also have 6 lines
		const overlayLineCount = await overlay.locator('.line').count();
		expect(overlayLineCount).toBe(6);

		// Check that empty lines are actually present in overlay
		const line1 = await overlay.locator('.line').nth(1);
		const line1Text = await line1.textContent();
		expect(line1Text?.trim() || '').toBe(''); // Should be empty

		const line3 = await overlay.locator('.line').nth(3);
		const line3Text = await line3.textContent();
		expect(line3Text?.trim() || '').toBe(''); // Should be empty
	});

	test('scrolling should stay synchronized between textarea and overlay', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Create content that forces scrolling
		await textarea.clear();
		const longContent = Array.from({ length: 30 }, (_, i) => `line${i} = ${i}`).join('\n');
		await textarea.fill(longContent);
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Scroll textarea to middle
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.scrollTop = el.scrollHeight / 2;
		});

		// Get textarea scroll position
		const textareaScrollTop = await textarea.evaluate((el: HTMLTextAreaElement) => el.scrollTop);

		// Get overlay scroll position (it should mirror textarea)
		const overlayScrollTop = await overlay.evaluate((el) => el.scrollTop);

		// Should be synchronized (allowing small browser differences)
		expect(Math.abs(textareaScrollTop - overlayScrollTop)).toBeLessThanOrEqual(2);
	});
});
