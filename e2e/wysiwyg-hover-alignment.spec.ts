import { test, expect } from '@playwright/test';

/**
 * Test that hover overlay aligns with the hovered line
 * This test uses actual DOM measurements, not console logs
 */

test.describe('WYSIWYG Hover Overlay Alignment', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForTimeout(1000);
	});

	test('hover overlay should align with monthly_salary line', async ({ page }) => {
		// Find line 6 specifically in the rendered overlay (not gutter)
		const line = page.locator('.rendered-overlay [data-line="6"]');

		// Wait for it to be visible
		await expect(line).toBeVisible();

		// Verify it has the right content
		const text = await line.textContent();
		expect(text).toContain('monthly_salary');

		// Get the line's position BEFORE hover
		const lineBoxBefore = await line.boundingBox();
		expect(lineBoxBefore).not.toBeNull();

		console.log('Line 6 position before hover:', lineBoxBefore);

		// Trigger hover
		await line.hover();
		await page.waitForTimeout(300);

		// Take screenshot
		await page.screenshot({ path: 'test-results/hover-alignment.png' });

		// Check if hover overlay exists
		const hoverOverlay = page.locator('.hover-overlay');
		await expect(hoverOverlay).toBeVisible({ timeout: 2000 });

		// Get hover overlay's actual rendered position
		const hoverBox = await hoverOverlay.boundingBox();
		expect(hoverBox).not.toBeNull();

		console.log('Hover overlay position:', hoverBox);

		// Get the line's position AFTER hover (should be same)
		const lineBoxAfter = await line.boundingBox();
		expect(lineBoxAfter).not.toBeNull();

		console.log('Line 6 position after hover:', lineBoxAfter);

		// The hover overlay should be at the same Y position as the line
		// Allow 2px tolerance for rounding
		expect(hoverBox!.y).toBeGreaterThanOrEqual(lineBoxAfter!.y - 2);
		expect(hoverBox!.y).toBeLessThanOrEqual(lineBoxAfter!.y + 2);

		// Heights should match
		expect(hoverBox!.height).toBeCloseTo(lineBoxAfter!.height, 0);

		console.log('TEST PASSED: Hover overlay aligns with line');
	});

	test('hover overlay position matches calculated offset', async ({ page }) => {
		// Get container position
		const container = page.locator('.wysiwyg-container');
		const containerBox = await container.boundingBox();
		expect(containerBox).not.toBeNull();

		// Get line position
		const line = page.locator('[data-line="6"]').first();
		await expect(line).toBeVisible();

		const lineBox = await line.boundingBox();
		expect(lineBox).not.toBeNull();

		// Expected top = line.top - container.top
		const expectedTop = lineBox!.y - containerBox!.y;
		console.log('Expected hover top (line.y - container.y):', expectedTop);

		// Hover over the line
		await line.hover({ force: true });
		await page.waitForTimeout(300);

		// Check hover overlay's CSS top property
		const hoverOverlay = page.locator('.hover-overlay');
		await expect(hoverOverlay).toBeVisible();

		const topValue = await hoverOverlay.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return parseFloat(style.top);
		});

		console.log('Actual hover overlay top (from CSS):', topValue);
		console.log('Difference:', topValue - expectedTop);

		// They should match (within 1px for rounding)
		expect(topValue).toBeCloseTo(expectedTop, 0);
	});

	test('hover overlay dotted line is visible and positioned correctly', async ({ page }) => {
		const line = page.locator('[data-line="6"]').first();
		await line.hover({ force: true });
		await page.waitForTimeout(300);

		// Check that hover-line (dotted line) exists
		const hoverLine = page.locator('.hover-line');
		await expect(hoverLine).toBeVisible();

		// Get positions
		const hoverLineBox = await hoverLine.boundingBox();
		const hoverOverlayBox = await page.locator('.hover-overlay').boundingBox();

		expect(hoverLineBox).not.toBeNull();
		expect(hoverOverlayBox).not.toBeNull();

		// Dotted line should be inside the hover overlay
		expect(hoverLineBox!.y).toBeGreaterThanOrEqual(hoverOverlayBox!.y);
		expect(hoverLineBox!.y + hoverLineBox!.height).toBeLessThanOrEqual(
			hoverOverlayBox!.y + hoverOverlayBox!.height
		);

		console.log('Hover line position:', hoverLineBox);
		console.log('Hover overlay position:', hoverOverlayBox);
	});
});
