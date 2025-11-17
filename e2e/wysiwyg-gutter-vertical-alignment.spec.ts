import { test, expect } from '@playwright/test';

/**
 * Test gutter vertical alignment with editor lines
 *
 * CRITICAL: Gutter lines must align perfectly with their corresponding calculation lines
 * in the editor overlay, regardless of scrolling position.
 *
 * This is achieved by:
 * 1. Matching line-height between gutter and overlay
 * 2. Padding on .gutter parent (not .gutter-content child)
 * 3. Transform translateY on .gutter-content for scroll sync
 */

test.describe('WYSIWYG Gutter Vertical Alignment', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForTimeout(500);
	});

	test('gutter lines should align with editor lines at initial load', async ({ page }) => {
		const overlay = page.locator('.rendered-overlay');
		const gutter = page.locator('.gutter');

		// Get all lines in both overlay and gutter
		const overlayLines = overlay.locator('.line');
		const gutterLines = gutter.locator('.gutter-line');

		const overlayCount = await overlayLines.count();
		const gutterCount = await gutterLines.count();

		// Should have same number of lines
		expect(overlayCount).toBe(gutterCount);

		// Check vertical alignment for first few lines
		for (let i = 0; i < Math.min(5, overlayCount); i++) {
			const overlayBox = await overlayLines.nth(i).boundingBox();
			const gutterBox = await gutterLines.nth(i).boundingBox();

			expect(overlayBox).not.toBeNull();
			expect(gutterBox).not.toBeNull();

			// Y positions should match closely (within 2px tolerance for rounding)
			expect(Math.abs(overlayBox!.y - gutterBox!.y)).toBeLessThan(2);

			// Heights should match closely
			expect(Math.abs(overlayBox!.height - gutterBox!.height)).toBeLessThan(2);
		}
	});

	test('gutter lines should stay aligned during scrolling', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Add many lines to enable scrolling
		const manyLines = Array.from({ length: 50 }, (_, i) => `line${i} = ${i * 10}`).join('\n');
		await textarea.fill(manyLines);
		await page.waitForTimeout(500);

		const overlay = page.locator('.rendered-overlay');
		const gutter = page.locator('.gutter');

		// Scroll to middle
		await textarea.evaluate((el) => {
			el.scrollTop = el.scrollHeight / 2;
		});
		await page.waitForTimeout(200);

		// Check alignment at scroll position
		const overlayLines = overlay.locator('.line');
		const gutterLines = gutter.locator('.gutter-line');

		// Check a few visible lines in the middle
		for (let i = 20; i < 25; i++) {
			const overlayBox = await overlayLines.nth(i).boundingBox();
			const gutterBox = await gutterLines.nth(i).boundingBox();

			if (overlayBox && gutterBox) {
				// Should still be aligned after scrolling
				expect(Math.abs(overlayBox.y - gutterBox.y)).toBeLessThan(2);
			}
		}
	});

	test('gutter transform should match textarea scroll offset', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Add many lines
		const manyLines = Array.from({ length: 50 }, (_, i) => `x${i} = ${i}`).join('\n');
		await textarea.fill(manyLines);
		await page.waitForTimeout(500);

		// Scroll to specific position
		const scrollTop = 300;
		await textarea.evaluate((el, scroll) => {
			el.scrollTop = scroll;
		}, scrollTop);
		await page.waitForTimeout(200);

		// Check that gutter-content has correct transform
		const gutterContent = page.locator('.gutter-content');
		const transform = await gutterContent.evaluate((el) => {
			return window.getComputedStyle(el).transform;
		});

		// Transform should be translateY(-scrollTop)
		// matrix(1, 0, 0, 1, 0, -scrollTop)
		expect(transform).toContain(`matrix(1, 0, 0, 1, 0, -${scrollTop})`);
	});

	test('gutter padding should be on parent, not content', async ({ page }) => {
		const gutter = page.locator('.gutter');
		const gutterContent = page.locator('.gutter-content');

		// Get computed padding
		const gutterPaddingTop = await gutter.evaluate((el) => {
			return window.getComputedStyle(el).paddingTop;
		});

		const contentPaddingTop = await gutterContent.evaluate((el) => {
			return window.getComputedStyle(el).paddingTop;
		});

		// Gutter should have padding (2.5rem = 40px typically)
		const gutterPx = parseFloat(gutterPaddingTop);
		expect(gutterPx).toBeGreaterThan(30);

		// Content should have NO padding
		expect(contentPaddingTop).toBe('0px');
	});

	test('calculation result should appear at same height as calculation line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');
		const gutter = page.locator('.gutter');

		// Clear and add a single calculation
		await textarea.fill('total = 100 + 200');
		await page.waitForTimeout(500);

		// Find the calculation line in overlay
		const calcLine = overlay.locator('.line').first();
		const calcBox = await calcLine.boundingBox();

		// Find the gutter result
		const gutterLine = gutter.locator('.gutter-line').first();
		const gutterBox = await gutterLine.boundingBox();

		expect(calcBox).not.toBeNull();
		expect(gutterBox).not.toBeNull();

		// Result should be at same vertical position as calculation
		expect(Math.abs(calcBox!.y - gutterBox!.y)).toBeLessThan(2);
	});

	test('gutter should not have its own scrollbar', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const gutter = page.locator('.gutter');

		// Add many lines to test overflow
		const manyLines = Array.from({ length: 100 }, (_, i) => `value${i} = ${i}`).join('\n');
		await textarea.fill(manyLines);
		await page.waitForTimeout(500);

		// Check gutter overflow style
		const overflow = await gutter.evaluate((el) => {
			return window.getComputedStyle(el).overflow;
		});

		// Should be hidden, not auto or scroll
		expect(overflow).toBe('hidden');
	});

	test('wrapped lines should maintain gutter alignment', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');
		const gutter = page.locator('.gutter');

		// Create a long calculation that will wrap
		const longCalc =
			'expenses = rent + food + utilities + transportation + entertainment + healthcare + insurance + savings';
		await textarea.fill(longCalc);
		await page.waitForTimeout(500);

		const overlayLine = overlay.locator('.line').first();
		const gutterLine = gutter.locator('.gutter-line').first();

		const overlayBox = await overlayLine.boundingBox();
		const gutterBox = await gutterLine.boundingBox();

		// Top alignment should still match even with wrapped text
		expect(Math.abs(overlayBox!.y - gutterBox!.y)).toBeLessThan(2);

		// Heights should match (gutter line should match overlay line height, including wrap)
		expect(Math.abs(overlayBox!.height - gutterBox!.height)).toBeLessThan(2);
	});
});
