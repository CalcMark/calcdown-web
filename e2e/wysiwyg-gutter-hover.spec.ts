import { test, expect } from '@playwright/test';

/**
 * Test that hovering over GUTTER shows hover line at correct position
 * This is what the user is actually doing when they see the bug
 */

test.describe('WYSIWYG Gutter Hover', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForTimeout(1000);
	});

	test('hovering gutter result should show hover line at correct position', async ({ page }) => {
		// Find a gutter result (the "800" next to food line)
		const gutterResult = page.locator('.gutter-result').filter({ hasText: '800' }).first();

		await expect(gutterResult).toBeVisible();

		// Get the gutter line that contains this result
		const gutterLine = gutterResult.locator('..');
		const gutterLineBox = await gutterLine.boundingBox();
		expect(gutterLineBox).not.toBeNull();

		console.log('Gutter line position:', gutterLineBox);

		// Find the corresponding editor line (should have "food" in it)
		const editorLine = page.locator('.rendered-overlay .line').filter({ hasText: 'food' }).first();
		const editorLineBox = await editorLine.boundingBox();
		expect(editorLineBox).not.toBeNull();

		console.log('Editor line position:', editorLineBox);

		// Hover over the gutter line
		await gutterLine.hover();
		await page.waitForTimeout(300);

		// Take screenshot
		await page.screenshot({ path: 'test-results/gutter-hover.png' });

		// Check hover overlay exists
		const hoverOverlay = page.locator('.hover-overlay');
		await expect(hoverOverlay).toBeVisible({ timeout: 2000 });

		const hoverBox = await hoverOverlay.boundingBox();
		expect(hoverBox).not.toBeNull();

		console.log('Hover overlay position:', hoverBox);

		// The hover overlay should align with the EDITOR line, not the gutter line
		// They should have the same Y position
		expect(hoverBox!.y).toBeCloseTo(editorLineBox!.y, 2);

		// Heights should match
		expect(hoverBox!.height).toBeCloseTo(editorLineBox!.height, 1);
	});

	test('hovering gutter at different scroll positions', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Add more content to enable scrolling
		const lines = Array.from({ length: 30 }, (_, i) => `line${i} = ${i * 100}`).join('\n');
		await textarea.fill(lines);
		await page.waitForTimeout(300);

		// Scroll down
		await textarea.evaluate((el) => {
			el.scrollTop = 200;
		});
		await page.waitForTimeout(200);

		// Find a gutter line that's visible after scroll
		const gutterLine = page.locator('.gutter-line[data-line="10"]');
		await gutterLine.hover({ force: true });
		await page.waitForTimeout(300);

		// Find corresponding editor line
		const editorLine = page.locator('.rendered-overlay [data-line="10"]');
		const editorLineBox = await editorLine.boundingBox();

		// Check hover overlay
		const hoverOverlay = page.locator('.hover-overlay');
		await expect(hoverOverlay).toBeVisible();

		const hoverBox = await hoverOverlay.boundingBox();
		expect(hoverBox).not.toBeNull();

		console.log('After scroll - Editor line:', editorLineBox);
		console.log('After scroll - Hover overlay:', hoverBox);

		// Should still align
		expect(hoverBox!.y).toBeCloseTo(editorLineBox!.y, 2);
	});
});
