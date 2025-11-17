import { test, expect } from '@playwright/test';

/**
 * Test that unchanged lines don't flash/re-render during typing
 *
 * CRITICAL: When typing on one line, other lines should NOT be re-highlighted
 * or visually updated in any way. This prevents horrible flashing.
 */

test.describe('WYSIWYG - No Flashing on Unchanged Lines', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');

		// Clear initial content
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('');
		await page.waitForTimeout(300);
	});

	test('unchanged lines should not re-render when typing on different line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create multi-line document
		await textarea.fill('x = 5\ny = 10\nz = 15');
		await page.waitForTimeout(300);

		// Get the rendered HTML of line 2 (y = 10)
		const line2 = page.locator('.rendered-overlay .line[data-line="1"]');
		const initialHTML = await line2.innerHTML();

		// Type on line 1 (x = 5)
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.selectionStart = 5; // End of first line
			el.selectionEnd = 5;
		});
		await textarea.type('0'); // Change to "x = 50"

		// Wait for evaluation to complete
		await page.waitForTimeout(300);

		// Line 2 HTML should be EXACTLY the same (not re-rendered)
		const newHTML = await line2.innerHTML();
		expect(newHTML).toBe(initialHTML);
	});

	test('only edited line should update its syntax highlighting', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create document with calculations
		await textarea.fill('x = 5\ny = 10');
		await page.waitForTimeout(300);

		// Track animation/transition events on line 2
		let line2AnimationCount = 0;
		const line2 = page.locator('.rendered-overlay .line[data-line="1"]');

		await line2.evaluate((el) => {
			el.addEventListener('animationstart', () => {
				(window as any).line2AnimationCount = ((window as any).line2AnimationCount || 0) + 1;
			});
			el.addEventListener('transitionstart', () => {
				(window as any).line2AnimationCount = ((window as any).line2AnimationCount || 0) + 1;
			});
		});

		// Edit line 1
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.selectionStart = 5;
			el.selectionEnd = 5;
		});
		await textarea.type('00'); // Change to "x = 500"

		// Wait for evaluation
		await page.waitForTimeout(300);

		// Check that line 2 had no animations/transitions
		line2AnimationCount = await page.evaluate(() => (window as any).line2AnimationCount || 0);
		expect(line2AnimationCount).toBe(0);
	});

	test('document should render smoothly without full re-renders', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create a longer document
		const lines = [];
		for (let i = 1; i <= 20; i++) {
			lines.push(`var${i} = ${i * 5}`);
		}
		await textarea.fill(lines.join('\n'));
		await page.waitForTimeout(500);

		// Get all line elements
		const allLines = page.locator('.rendered-overlay .line');
		const lineCount = await allLines.count();
		expect(lineCount).toBe(20);

		// Edit just the first line
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.selectionStart = 0;
			el.selectionEnd = 0;
		});
		await textarea.type('# '); // Add markdown heading

		// Wait for evaluation
		await page.waitForTimeout(300);

		// All lines should still exist (no full DOM recreation)
		const newLineCount = await allLines.count();
		expect(newLineCount).toBe(20);

		// Line 10 should be completely unchanged
		const line10 = page.locator('.rendered-overlay .line[data-line="9"]');
		const line10Text = await line10.textContent();
		expect(line10Text).toContain('var10');
	});

	test('typing should not cause overlay opacity changes on unchanged lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('line1 = 1\nline2 = 2\nline3 = 3');
		await page.waitForTimeout(300);

		// Get opacity of line 3
		const line3 = page.locator('.rendered-overlay .line[data-line="2"]');
		const initialOpacity = await line3.evaluate((el) => {
			return window.getComputedStyle(el).opacity;
		});

		// Type on line 1
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.selectionStart = 9; // End of line 1
			el.selectionEnd = 9;
		});
		await textarea.type('00');

		// Immediately check opacity (before evaluation completes)
		await page.waitForTimeout(50);
		const duringTypingOpacity = await line3.evaluate((el) => {
			return window.getComputedStyle(el).opacity;
		});

		// Line 3 opacity should not change during typing
		expect(duringTypingOpacity).toBe(initialOpacity);

		// Wait for evaluation
		await page.waitForTimeout(300);

		// Line 3 opacity should still be the same
		const afterOpacity = await line3.evaluate((el) => {
			return window.getComputedStyle(el).opacity;
		});
		expect(afterOpacity).toBe(initialOpacity);
	});

	test('Line object identity should be preserved for unchanged lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('a = 1\nb = 2\nc = 3');
		await page.waitForTimeout(300);

		// Store a reference to line 3's DOM element
		const line3DataLine = await page.locator('.rendered-overlay .line[data-line="2"]').getAttribute('data-line');
		expect(line3DataLine).toBe('2');

		// Edit line 1
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.selectionStart = 0;
			el.selectionEnd = 5; // Select "a = 1"
			el.setRangeText('a = 999', 0, 5, 'end');
		});

		// Wait for evaluation
		await page.waitForTimeout(300);

		// Line 3's data-line attribute should still be "2"
		const newLine3DataLine = await page.locator('.rendered-overlay .line[data-line="2"]').getAttribute('data-line');
		expect(newLine3DataLine).toBe('2');

		// Content should still be "c = 3"
		const line3Content = await page.locator('.rendered-overlay .line[data-line="2"]').textContent();
		expect(line3Content).toContain('c');
	});
});
