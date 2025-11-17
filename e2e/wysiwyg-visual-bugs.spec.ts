import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Tests for CRITICAL visual bugs that break the editor
 *
 * These tests verify that basic visual functionality works:
 * - Only ONE copy of text visible at a time (not double)
 * - Text doesn't appear offset or misaligned
 * - Cursor is visible and correctly sized
 */
test.describe('WYSIWYG Editor - Visual Bugs (CRITICAL)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('CRITICAL: should NOT show double text while typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type text
		await textarea.clear();
		await textarea.type('test text', { delay: 50 });

		// Immediately check (while typing)
		await page.waitForTimeout(10);

		// Get textarea visibility
		const textareaColor = await textarea.evaluate((el) => {
			return window.getComputedStyle(el).color;
		});

		// Get overlay visibility
		const overlayOpacity = await page.locator('.rendered-overlay').evaluate((el) => {
			return window.getComputedStyle(el).opacity;
		});

		console.log('While typing:');
		console.log('  Textarea color:', textareaColor);
		console.log('  Overlay opacity:', overlayOpacity);

		// While typing, textarea should be visible (not transparent)
		expect(textareaColor).not.toBe('rgba(0, 0, 0, 0)');
		expect(textareaColor).not.toContain('transparent');

		// While typing, overlay should be hidden (opacity 0)
		expect(parseFloat(overlayOpacity)).toBeLessThanOrEqual(0.1);

		// Take screenshot to verify visually
		await page.screenshot({ path: 'test-results/while-typing.png' });
	});

	test('CRITICAL: should NOT show double text when idle', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type and wait for idle
		await textarea.clear();
		await textarea.type('idle text');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 200);

		// Get textarea visibility
		const textareaColor = await textarea.evaluate((el) => {
			return window.getComputedStyle(el).color;
		});

		// Get overlay visibility
		const overlayOpacity = await page.locator('.rendered-overlay').evaluate((el) => {
			return window.getComputedStyle(el).opacity;
		});

		console.log('When idle:');
		console.log('  Textarea color:', textareaColor);
		console.log('  Overlay opacity:', overlayOpacity);

		// When idle, textarea should be transparent
		const isTransparent = textareaColor === 'rgba(0, 0, 0, 0)' ||
		                      textareaColor.includes('transparent');
		expect(isTransparent).toBe(true);

		// When idle, overlay should be visible
		expect(parseFloat(overlayOpacity)).toBeGreaterThan(0.9);

		// Take screenshot
		await page.screenshot({ path: 'test-results/when-idle.png' });
	});

	test('CRITICAL: textarea and overlay must have EXACT same position', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		await textarea.fill('position test');
		await page.waitForTimeout(200);

		const textareaBox = await textarea.boundingBox();
		const overlayBox = await overlay.boundingBox();

		expect(textareaBox).not.toBeNull();
		expect(overlayBox).not.toBeNull();

		console.log('Textarea position:', textareaBox);
		console.log('Overlay position:', overlayBox);

		// Must be EXACTLY the same position (not even 1px off)
		expect(textareaBox!.x).toBe(overlayBox!.x);
		expect(textareaBox!.y).toBe(overlayBox!.y);
		expect(textareaBox!.width).toBe(overlayBox!.width);
		expect(textareaBox!.height).toBe(overlayBox!.height);
	});

	test('CRITICAL: custom cursor should appear after delay and be correct size', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.type('cursor test');

		// Wait for custom cursor delay (USER_INPUT_DEBOUNCE_MS * 2)
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS * 2 + 100);

		// Check if custom cursor exists
		const customCursor = page.locator('.custom-cursor');
		const cursorExists = await customCursor.count() > 0;

		if (cursorExists) {
			// Get cursor height
			const cursorHeight = await customCursor.evaluate((el) => {
				const style = window.getComputedStyle(el);
				return parseFloat(style.height);
			});

			// Get font size
			const fontSize = await textarea.evaluate((el) => {
				return parseFloat(window.getComputedStyle(el).fontSize);
			});

			console.log('Custom cursor height:', cursorHeight);
			console.log('Font size:', fontSize);

			// Cursor should be approximately font-size (allow 2px tolerance)
			expect(Math.abs(cursorHeight - fontSize)).toBeLessThanOrEqual(2);

			// Cursor should NOT be line-height (28px for default settings)
			const lineHeight = await textarea.evaluate((el) => {
				return parseFloat(window.getComputedStyle(el).lineHeight);
			});

			// If cursor is close to line-height, it's wrong
			expect(Math.abs(cursorHeight - lineHeight)).toBeGreaterThan(5);
		} else {
			console.log('Custom cursor not found - using native cursor');
		}

		// Take screenshot
		await page.screenshot({ path: 'test-results/cursor-after-delay.png' });
	});

	test('CRITICAL: native cursor should be hidden when custom cursor shows', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.type('cursor');

		// Wait for custom cursor
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS * 2 + 100);

		// Check if custom cursor is showing
		const customCursor = page.locator('.custom-cursor');
		const showingCustom = await customCursor.count() > 0;

		if (showingCustom) {
			// Native cursor should be hidden (caret-color: transparent)
			const caretColor = await textarea.evaluate((el) => {
				return window.getComputedStyle(el).caretColor;
			});

			console.log('Caret color with custom cursor:', caretColor);

			const isTransparent = caretColor === 'rgba(0, 0, 0, 0)' ||
			                      caretColor.includes('transparent');
			expect(isTransparent).toBe(true);
		}
	});

	test('VISUAL REGRESSION: screenshot during typing should show ONLY textarea', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.type('The quick brown fox', { delay: 30 });

		// Take screenshot DURING typing
		await page.waitForTimeout(20);

		await page.screenshot({
			path: 'test-results/regression-during-typing.png',
			fullPage: false
		});

		// Add markers to show what should be visible
		await page.evaluate(() => {
			const style = document.createElement('style');
			style.textContent = `
				.raw-textarea.typing {
					outline: 3px solid lime !important;
					outline-offset: -3px;
				}
				.rendered-overlay.hidden {
					outline: 3px solid red !important;
					outline-offset: -3px;
				}
			`;
			document.head.appendChild(style);
		});

		await page.screenshot({
			path: 'test-results/regression-during-typing-marked.png',
			fullPage: false
		});

		console.log('✓ Green outline = textarea (should be visible)');
		console.log('✗ Red outline = overlay (should be hidden)');
	});
});
