import { test, expect } from '@playwright/test';

/**
 * Test that the 10px footer remains visible in the wysiwyg test page
 *
 * CRITICAL: The editor component must respect parent container constraints
 * and not push the footer off-screen.
 */

test.describe('WYSIWYG Footer Visibility', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForTimeout(500);
	});

	test('10px red footer should be visible at bottom of viewport', async ({ page }) => {
		const footer = page.locator('.footer');

		// Footer must exist
		await expect(footer).toBeVisible();

		// Get footer dimensions
		const footerBox = await footer.boundingBox();
		expect(footerBox).not.toBeNull();

		// Footer should be exactly 10px tall
		expect(footerBox!.height).toBeCloseTo(10, 1);

		// Footer should be at the bottom of the viewport
		const viewportSize = page.viewportSize();
		expect(viewportSize).not.toBeNull();

		// Footer bottom should be at viewport bottom (within 2px tolerance)
		expect(footerBox!.y + footerBox!.height).toBeCloseTo(viewportSize!.height, 2);

		// Footer should span full width
		expect(footerBox!.width).toBeCloseTo(viewportSize!.width, 2);
	});

	test('footer should remain visible after typing many lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const footer = page.locator('.footer');

		// Type many lines to fill the editor
		const lines = Array.from({ length: 50 }, (_, i) => `line${i} = ${i * 10}`).join('\n');
		await textarea.fill(lines);
		await page.waitForTimeout(300);

		// Footer must still be visible
		await expect(footer).toBeVisible();

		const footerBox = await footer.boundingBox();
		expect(footerBox).not.toBeNull();

		// Footer should still be at viewport bottom
		const viewportSize = page.viewportSize();
		expect(footerBox!.y + footerBox!.height).toBeCloseTo(viewportSize!.height, 2);
	});

	test('footer should remain visible when scrolling editor', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const footer = page.locator('.footer');

		// Create scrollable content
		const lines = Array.from({ length: 60 }, (_, i) => `calculation${i} = ${i}`).join('\n');
		await textarea.fill(lines);
		await page.waitForTimeout(300);

		// Scroll to middle
		await textarea.evaluate((el) => {
			el.scrollTop = el.scrollHeight / 2;
		});
		await page.waitForTimeout(200);

		// Footer must still be visible
		await expect(footer).toBeVisible();

		// Scroll to bottom
		await textarea.evaluate((el) => {
			el.scrollTop = el.scrollHeight;
		});
		await page.waitForTimeout(200);

		// Footer must STILL be visible
		await expect(footer).toBeVisible();

		const footerBox = await footer.boundingBox();
		const viewportSize = page.viewportSize();
		expect(footerBox!.y + footerBox!.height).toBeCloseTo(viewportSize!.height, 2);
	});

	test('page grid layout should be exactly 100vh', async ({ page }) => {
		const pageContainer = page.locator('.page');

		const pageBox = await pageContainer.boundingBox();
		expect(pageBox).not.toBeNull();

		const viewportSize = page.viewportSize();
		expect(viewportSize).not.toBeNull();

		// Page should be exactly viewport height
		expect(pageBox!.height).toBeCloseTo(viewportSize!.height, 2);

		// Page should start at top of viewport
		expect(pageBox!.y).toBeCloseTo(0, 2);
	});

	test('editor container should not overflow its grid row', async ({ page }) => {
		const editorContainer = page.locator('.editor-container');
		const footer = page.locator('.footer');
		const header = page.locator('.header');

		const editorBox = await editorContainer.boundingBox();
		const footerBox = await footer.boundingBox();
		const headerBox = await header.boundingBox();

		expect(editorBox).not.toBeNull();
		expect(footerBox).not.toBeNull();
		expect(headerBox).not.toBeNull();

		// Editor bottom should be above footer top (not overlapping)
		expect(editorBox!.y + editorBox!.height).toBeLessThanOrEqual(footerBox!.y + 1);

		// Editor top should be below header bottom (not overlapping)
		expect(editorBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
	});
});
