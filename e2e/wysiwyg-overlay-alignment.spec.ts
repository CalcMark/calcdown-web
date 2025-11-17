import { test, expect } from '@playwright/test';

/**
 * Test overlay alignment between textarea and rendered overlay
 *
 * The textarea (invisible, editable) and overlay (visible, rendered) must be
 * perfectly aligned so cursor position matches visual text position.
 */

test.describe('WYSIWYG Overlay Alignment', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		// Wait for initial load
		await page.waitForTimeout(500);
	});

	test('textarea and overlay should have identical positioning', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Get computed styles
		const textareaBox = await textarea.boundingBox();
		const overlayBox = await overlay.boundingBox();

		expect(textareaBox).not.toBeNull();
		expect(overlayBox).not.toBeNull();

		// Positions should be identical
		expect(textareaBox!.x).toBe(overlayBox!.x);
		expect(textareaBox!.y).toBe(overlayBox!.y);
		expect(textareaBox!.width).toBe(overlayBox!.width);
		expect(textareaBox!.height).toBe(overlayBox!.height);
	});

	test('textarea and overlay should have matching padding', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		const textareaPadding = await textarea.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return {
				top: style.paddingTop,
				right: style.paddingRight,
				bottom: style.paddingBottom,
				left: style.paddingLeft
			};
		});

		const overlayPadding = await overlay.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return {
				top: style.paddingTop,
				right: style.paddingRight,
				bottom: style.paddingBottom,
				left: style.paddingLeft
			};
		});

		expect(textareaPadding).toEqual(overlayPadding);
	});

	test('textarea and overlay should have matching font properties', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		const textareaFont = await textarea.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return {
				fontFamily: style.fontFamily,
				fontSize: style.fontSize,
				lineHeight: style.lineHeight,
				letterSpacing: style.letterSpacing
			};
		});

		const overlayFont = await overlay.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return {
				fontFamily: style.fontFamily,
				fontSize: style.fontSize,
				lineHeight: style.lineHeight,
				letterSpacing: style.letterSpacing
			};
		});

		expect(textareaFont).toEqual(overlayFont);
	});

	test('first line in overlay should align with first line in textarea', async ({ page }) => {
		// Type some text
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('# Budget Calculator\n\n## Income\n\nmonthly_salary = $5000');

		// Wait for rendering
		await page.waitForTimeout(500);

		// Get first line element from overlay
		const firstLine = page.locator('.rendered-overlay .line').first();
		const firstLineBox = await firstLine.boundingBox();

		// Get textarea position
		const textareaBox = await textarea.boundingBox();

		expect(firstLineBox).not.toBeNull();
		expect(textareaBox).not.toBeNull();

		// First line should be at same x as textarea (accounting for padding)
		const textareaPaddingLeft = await textarea.evaluate((el) => {
			return parseInt(window.getComputedStyle(el).paddingLeft, 10);
		});

		const expectedX = textareaBox!.x + textareaPaddingLeft;

		// Allow 1px tolerance for rounding
		expect(Math.abs(firstLineBox!.x - expectedX)).toBeLessThanOrEqual(1);
	});

	test('markdown heading should not add extra vertical space', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('# Heading\nRegular text');

		await page.waitForTimeout(500);

		// Get line elements
		const lines = page.locator('.rendered-overlay .line');
		const firstLine = lines.nth(0);
		const secondLine = lines.nth(1);

		const firstBox = await firstLine.boundingBox();
		const secondBox = await secondLine.boundingBox();

		expect(firstBox).not.toBeNull();
		expect(secondBox).not.toBeNull();

		// Calculate expected line height
		const lineHeightPx = await textarea.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return parseFloat(style.lineHeight);
		});

		// Second line should be exactly one line-height below first
		const expectedY = firstBox!.y + lineHeightPx;

		// Allow 2px tolerance for rounding
		expect(Math.abs(secondBox!.y - expectedY)).toBeLessThanOrEqual(2);
	});

	test('cursor should appear at correct position when clicking', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('x = 5\ny = 10\ntotal = x + y');

		await page.waitForTimeout(500);

		// Click on second line
		const secondLine = page.locator('.rendered-overlay .line').nth(1);
		const secondLineBox = await secondLine.boundingBox();

		expect(secondLineBox).not.toBeNull();

		// Click in middle of second line
		await page.mouse.click(
			secondLineBox!.x + secondLineBox!.width / 2,
			secondLineBox!.y + secondLineBox!.height / 2
		);

		// Wait for cursor update
		await page.waitForTimeout(200);

		// Get cursor position from textarea
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => {
			return el.selectionStart;
		});

		// Should be on second line (after "x = 5\n" which is 6 characters)
		expect(cursorPos).toBeGreaterThanOrEqual(6);
		expect(cursorPos).toBeLessThan(13); // Before third line
	});

	test('no horizontal offset between textarea and overlay text', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('monthly_salary = $5000');

		await page.waitForTimeout(500);

		// Measure horizontal position of first character
		const line = page.locator('.rendered-overlay .line').first();
		const lineBox = await line.boundingBox();
		const textareaBox = await textarea.boundingBox();

		expect(lineBox).not.toBeNull();
		expect(textareaBox).not.toBeNull();

		// X positions should match exactly (both have same padding)
		expect(lineBox!.x).toBe(textareaBox!.x);
	});
});
