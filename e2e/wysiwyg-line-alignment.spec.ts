import { test, expect } from '@playwright/test';

/**
 * Tests for line alignment between textarea and overlay
 *
 * Verifies that lines in the textarea and corresponding lines in the overlay
 * are positioned at the same vertical position (same top offset).
 */
test.describe('WYSIWYG Editor - Line Alignment', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test/simple');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('textarea and overlay should have identical dimensions', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		const textareaBox = await textarea.boundingBox();
		const overlayBox = await overlay.boundingBox();

		expect(textareaBox).not.toBeNull();
		expect(overlayBox).not.toBeNull();

		// Should be in exact same position
		expect(textareaBox!.x).toBe(overlayBox!.x);
		expect(textareaBox!.y).toBe(overlayBox!.y);
		expect(textareaBox!.width).toBe(overlayBox!.width);
		expect(textareaBox!.height).toBe(overlayBox!.height);
	});

	test('textarea and overlay should have identical padding', async ({ page }) => {
		const styles = await page.evaluate(() => {
			const ta = document.querySelector('.raw-textarea');
			const ov = document.querySelector('.rendered-overlay');

			if (!ta || !ov) return null;

			const taStyle = window.getComputedStyle(ta);
			const ovStyle = window.getComputedStyle(ov);

			return {
				textarea: {
					padding: taStyle.padding,
					paddingTop: taStyle.paddingTop,
					paddingLeft: taStyle.paddingLeft,
					margin: taStyle.margin,
					border: taStyle.border
				},
				overlay: {
					padding: ovStyle.padding,
					paddingTop: ovStyle.paddingTop,
					paddingLeft: ovStyle.paddingLeft,
					margin: ovStyle.margin,
					border: ovStyle.border
				}
			};
		});

		expect(styles).not.toBeNull();
		expect(styles!.textarea.paddingTop).toBe(styles!.overlay.paddingTop);
		expect(styles!.textarea.paddingLeft).toBe(styles!.overlay.paddingLeft);
	});

	test('textarea and overlay should have identical font settings', async ({ page }) => {
		const styles = await page.evaluate(() => {
			const ta = document.querySelector('.raw-textarea');
			const ov = document.querySelector('.rendered-overlay');

			if (!ta || !ov) return null;

			const taStyle = window.getComputedStyle(ta);
			const ovStyle = window.getComputedStyle(ov);

			return {
				textarea: {
					fontFamily: taStyle.fontFamily,
					fontSize: taStyle.fontSize,
					lineHeight: taStyle.lineHeight,
					fontWeight: taStyle.fontWeight,
					letterSpacing: taStyle.letterSpacing
				},
				overlay: {
					fontFamily: ovStyle.fontFamily,
					fontSize: ovStyle.fontSize,
					lineHeight: ovStyle.lineHeight,
					fontWeight: ovStyle.fontWeight,
					letterSpacing: ovStyle.letterSpacing
				}
			};
		});

		expect(styles).not.toBeNull();
		expect(styles!.textarea.fontSize).toBe(styles!.overlay.fontSize);
		expect(styles!.textarea.lineHeight).toBe(styles!.overlay.lineHeight);
	});

	test('first line of textarea and overlay should align vertically', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Set simple content
		await textarea.fill('line1\nline2\nline3');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Get first line position from overlay
		const firstLineBox = await page.locator('.rendered-overlay .line').first().boundingBox();

		// Get textarea position
		const textareaBox = await textarea.boundingBox();

		expect(firstLineBox).not.toBeNull();
		expect(textareaBox).not.toBeNull();

		// First line should start at same Y position as textarea (plus padding)
		const paddingTop = await page.evaluate(() => {
			const ta = document.querySelector('.raw-textarea');
			if (!ta) return 0;
			return parseFloat(window.getComputedStyle(ta).paddingTop);
		});

		const expectedY = textareaBox!.y + paddingTop;

		// Allow 2px tolerance for sub-pixel rendering
		expect(Math.abs(firstLineBox!.y - expectedY)).toBeLessThanOrEqual(2);
	});

	test('VISUAL: add debug borders to check alignment', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Add content
		await textarea.fill('monthly_salary = $5000\nbonus = $500\ntotal = monthly_salary + bonus');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 500);

		// Add debug borders via CSS
		await page.evaluate(() => {
			const style = document.createElement('style');
			style.textContent = `
				.raw-textarea {
					outline: 2px solid red !important;
				}
				.rendered-overlay {
					outline: 2px solid blue !important;
				}
				.rendered-overlay .line {
					background: rgba(255, 255, 0, 0.1) !important;
					outline: 1px dotted green !important;
				}
			`;
			document.head.appendChild(style);
		});

		await page.waitForTimeout(100);

		// Take screenshot with debug borders
		await page.screenshot({
			path: 'test-results/line-alignment-debug.png',
			fullPage: false
		});

		console.log('✓ Screenshot saved to test-results/line-alignment-debug.png');
		console.log('  Red outline = textarea');
		console.log('  Blue outline = overlay');
		console.log('  Green dotted = individual overlay lines');
		console.log('  Yellow background = overlay line content area');
	});

	test('cursor position should align with overlay text', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('test = 100');
		await page.waitForTimeout(200);

		// Position cursor at start
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(0, 0);
			el.focus();
		});

		await page.waitForTimeout(100);

		// Add visual indicator for cursor position
		await page.evaluate(() => {
			const style = document.createElement('style');
			style.textContent = `
				.raw-textarea {
					caret-color: red !important;
				}
				.rendered-overlay .line {
					background: rgba(0, 255, 0, 0.1) !important;
				}
			`;
			document.head.appendChild(style);
		});

		// Take screenshot showing cursor (red) against overlay (green background)
		await page.screenshot({
			path: 'test-results/cursor-overlay-alignment.png',
			clip: (await textarea.boundingBox()) || undefined
		});

		console.log('✓ Cursor alignment screenshot saved');
		console.log('  Red cursor should align with green overlay text');
	});
});
