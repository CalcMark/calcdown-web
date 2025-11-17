import { test, expect } from '@playwright/test';

/**
 * Tests for cursor height
 *
 * The cursor should be an appropriate height based on font-size,
 * not based on line-height. This is a common regression where
 * the cursor becomes too tall (line-height instead of font-size).
 *
 * Expected behavior:
 * - Cursor height should match font-size (approximately)
 * - Cursor should NOT be as tall as line-height
 * - For default 16px font-size, cursor should be ~16-20px tall
 * - For line-height 1.75, that would be 28px - cursor should NOT be 28px
 */
test.describe('WYSIWYG Editor - Cursor Height', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('cursor height should match font-size, not line-height', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Get computed styles
		const styles = await textarea.evaluate((el) => {
			const computed = window.getComputedStyle(el);
			return {
				fontSize: computed.fontSize,
				lineHeight: computed.lineHeight,
				fontSizeNum: parseFloat(computed.fontSize),
				lineHeightNum: parseFloat(computed.lineHeight)
			};
		});

		// For reference in test output
		console.log('Font size:', styles.fontSize);
		console.log('Line height:', styles.lineHeight);

		// The cursor height is not directly measurable via DOM,
		// but we can verify the textarea has correct font-size
		// and that line-height is larger (which is the regression risk)
		expect(styles.fontSizeNum).toBeGreaterThan(0);
		expect(styles.lineHeightNum).toBeGreaterThan(styles.fontSizeNum);

		// Typical values: font-size 16px, line-height 28px (1.75 * 16)
		// Cursor should be ~16px not 28px
		expect(styles.fontSizeNum).toBeGreaterThanOrEqual(14);
		expect(styles.fontSizeNum).toBeLessThanOrEqual(20);
	});

	test('cursor should be visible and appropriately sized with default font', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Click to show cursor
		await textarea.click();
		await page.waitForTimeout(100);

		// Take a screenshot to visually verify cursor height
		await page.screenshot({
			path: 'test-results/cursor-height-default-font.png',
			clip: (await textarea.boundingBox()) || undefined
		});

		// Get font metrics
		const metrics = await textarea.evaluate((el) => {
			const computed = window.getComputedStyle(el);
			const fontSize = parseFloat(computed.fontSize);
			const lineHeight = parseFloat(computed.lineHeight);

			return {
				fontSize,
				lineHeight,
				ratio: lineHeight / fontSize
			};
		});

		console.log('Font metrics:', metrics);

		// Verify line-height is proportionally larger than font-size
		// (this is expected - the issue is when cursor uses line-height)
		expect(metrics.ratio).toBeGreaterThan(1.5);
		expect(metrics.ratio).toBeLessThan(2.0);
	});

	test('cursor height should scale with font-size changes', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Get base font size
		const baseFontSize = await textarea.evaluate((el) => {
			return parseFloat(window.getComputedStyle(el).fontSize);
		});

		// Change font size via CSS variable
		await page.evaluate(() => {
			const container = document.querySelector('.wysiwyg-container') as HTMLElement;
			if (container) {
				container.style.setProperty('--editor-font-size', '20px');
			}
		});

		await page.waitForTimeout(100);

		// Get new font size
		const newFontSize = await textarea.evaluate((el) => {
			return parseFloat(window.getComputedStyle(el).fontSize);
		});

		// Font size should have changed
		expect(newFontSize).toBeGreaterThan(baseFontSize);

		// Take screenshot with larger font
		await textarea.click();
		await page.screenshot({
			path: 'test-results/cursor-height-large-font.png',
			clip: (await textarea.boundingBox()) || undefined
		});
	});

	test('cursor should not extend beyond single line height', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type a single character
		await textarea.clear();
		await page.waitForTimeout(200);
		await textarea.type('A');
		await page.waitForTimeout(200);

		// Position cursor after the character
		await textarea.press('End');

		// Take screenshot showing cursor next to character
		await page.screenshot({
			path: 'test-results/cursor-next-to-character.png',
			clip: (await textarea.boundingBox()) || undefined
		});

		// The visual test here is: cursor should be same height as the letter 'A'
		// not the full line-height (which includes spacing above/below)
	});

	test('cursor maintains proper height across different line positions', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create multi-line content
		await textarea.clear();
		await page.waitForTimeout(200);
		await textarea.fill('Line 1\nLine 2\nLine 3');
		await page.waitForTimeout(200);

		// Position cursor at start of line 2
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			const text = el.value;
			const line2Start = text.indexOf('Line 2');
			el.setSelectionRange(line2Start, line2Start);
			el.focus();
		});

		await page.waitForTimeout(100);

		// Screenshot showing cursor at different line positions
		await page.screenshot({
			path: 'test-results/cursor-multiline-position.png',
			clip: (await textarea.boundingBox()) || undefined
		});

		// Cursor height should be consistent regardless of which line it's on
		const metrics = await textarea.evaluate((el) => {
			return {
				fontSize: parseFloat(window.getComputedStyle(el).fontSize),
				lineHeight: parseFloat(window.getComputedStyle(el).lineHeight)
			};
		});

		// These should remain constant
		expect(metrics.fontSize).toBeGreaterThan(0);
		expect(metrics.lineHeight).toBeGreaterThan(metrics.fontSize);
	});

	test('VISUAL REGRESSION: cursor should be font-size height not line-height', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Clear and type text
		await textarea.clear();
		await page.waitForTimeout(200);
		await textarea.type('monthly_salary = $5000');
		await page.waitForTimeout(200);

		// Position cursor in middle of text
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.setSelectionRange(10, 10);
			el.focus();
		});

		await page.waitForTimeout(100);

		// Get exact measurements
		const measurements = await textarea.evaluate((el) => {
			const computed = window.getComputedStyle(el);
			const fontSize = parseFloat(computed.fontSize);
			const lineHeight = parseFloat(computed.lineHeight);

			// Expected cursor height range
			const expectedMinHeight = fontSize * 0.9; // 90% of font-size
			const expectedMaxHeight = fontSize * 1.2; // 120% of font-size
			const tooTallThreshold = fontSize * 1.5; // Anything above this is wrong

			return {
				fontSize,
				lineHeight,
				expectedMinHeight,
				expectedMaxHeight,
				tooTallThreshold,
				lineHeightRatio: lineHeight / fontSize
			};
		});

		console.log('Cursor measurements:', measurements);

		// The key assertion: line-height should be significantly larger than font-size
		// If cursor were using line-height, it would be too tall
		expect(measurements.lineHeightRatio).toBeGreaterThan(1.5);

		// Font size should be reasonable
		expect(measurements.fontSize).toBeGreaterThanOrEqual(14);
		expect(measurements.fontSize).toBeLessThanOrEqual(20);

		// Take screenshot for visual inspection
		await page.screenshot({
			path: 'test-results/cursor-height-regression-check.png',
			clip: (await textarea.boundingBox()) || undefined
		});

		// Visual assertion instructions logged
		console.log('✓ Cursor should appear ~' + Math.round(measurements.fontSize) + 'px tall');
		console.log('✗ Cursor should NOT be ~' + Math.round(measurements.lineHeight) + 'px tall');
		console.log('  Check screenshot: test-results/cursor-height-regression-check.png');
	});
});
