import { test, expect } from '@playwright/test';

/**
 * WebKit-specific alignment tests
 *
 * Safari/WebKit can have different font rendering and line height calculations
 * compared to Chromium. This test verifies vertical alignment is correct.
 */
test.describe('WYSIWYG Editor - WebKit Vertical Alignment', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		// Wait for initial evaluation
		await page.waitForTimeout(2000);
	});

	test('cursor vertical position should match line height across all lines', async ({
		page,
		browserName
	}) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		// Focus the textarea
		await textarea.focus();
		await page.waitForTimeout(100);

		// Test cursor alignment at different positions in the document
		const testLines = [0, 5, 10, 15, 20];

		for (const targetLine of testLines) {
			// Navigate to the beginning of the document
			await page.keyboard.press('Control+Home'); // Cmd+Home on Mac
			await page.waitForTimeout(50);

			// Navigate to target line
			for (let i = 0; i < targetLine; i++) {
				await page.keyboard.press('ArrowDown');
				await page.waitForTimeout(20);
			}
			await page.keyboard.press('End');
			await page.waitForTimeout(100);

			// Get computed styles for the overlay
			const overlayStyles = await overlay.evaluate((el) => {
				const computed = window.getComputedStyle(el);
				return {
					fontSize: computed.fontSize,
					lineHeight: computed.lineHeight,
					fontFamily: computed.fontFamily
				};
			});

			// Get the actual line element
			const lineElement = overlay.locator(`[data-line="${targetLine}"]`);
			const lineExists = (await lineElement.count()) > 0;

			if (lineExists) {
				const lineRect = await lineElement.boundingBox();
				const cursorIndicator = page.locator('.cursor-indicator');
				const cursorVisible = await cursorIndicator.isVisible();

				if (cursorVisible && lineRect) {
					const cursorRect = await cursorIndicator.boundingBox();

					console.log(`[${browserName}] Line ${targetLine}:`, {
						overlayStyles,
						lineTop: lineRect.y,
						lineHeight: lineRect.height,
						cursorTop: cursorRect?.y,
						cursorHeight: cursorRect?.height,
						verticalOffset: cursorRect ? Math.abs(cursorRect.y - lineRect.y) : null
					});

					if (cursorRect) {
						// The cursor should be vertically aligned with the line
						// Allow small tolerance for sub-pixel rendering differences
						const verticalOffset = Math.abs(cursorRect.y - lineRect.y);
						const tolerance = 3; // 3px tolerance for WebKit rendering differences

						expect(verticalOffset).toBeLessThanOrEqual(tolerance);

						// Cursor height should be close to line height
						// In the code, cursor height = fontSize * 1.2
						const fontSize = parseFloat(overlayStyles.fontSize);
						const expectedCursorHeight = fontSize * 1.2;
						const heightDifference = Math.abs(cursorRect.height - expectedCursorHeight);
						const heightTolerance = 2;

						expect(heightDifference).toBeLessThanOrEqual(heightTolerance);
					}
				}
			}
		}
	});

	test('line elements should have consistent spacing in WebKit', async ({ page, browserName }) => {
		const overlay = page.locator('.rendered-overlay');

		// Get all line elements
		const lineElements = overlay.locator('.line');
		const lineCount = await lineElements.count();

		console.log(`[${browserName}] Total lines: ${lineCount}`);

		// Measure spacing between first 10 lines
		const linePositions: { lineNum: number; top: number; height: number }[] = [];

		for (let i = 0; i < Math.min(10, lineCount); i++) {
			const lineElement = lineElements.nth(i);
			const rect = await lineElement.boundingBox();
			if (rect) {
				linePositions.push({
					lineNum: i,
					top: rect.y,
					height: rect.height
				});
			}
		}

		// Calculate spacing between consecutive lines
		for (let i = 1; i < linePositions.length; i++) {
			const prevLine = linePositions[i - 1];
			const currentLine = linePositions[i];
			const spacing = currentLine.top - (prevLine.top + prevLine.height);

			console.log(`[${browserName}] Spacing between line ${i - 1} and ${i}: ${spacing}px`);

			// Lines should have minimal spacing (typically 0 for line-height-based layout)
			// Allow 2px tolerance for sub-pixel rendering
			expect(Math.abs(spacing)).toBeLessThanOrEqual(2);
		}

		// All line heights should be consistent
		const heights = linePositions.map((l) => l.height);
		const minHeight = Math.min(...heights);
		const maxHeight = Math.max(...heights);
		const heightVariation = maxHeight - minHeight;

		console.log(
			`[${browserName}] Line height variation: ${heightVariation}px (min: ${minHeight}, max: ${maxHeight})`
		);

		// Height variation should be minimal (allow 1px for rounding)
		expect(heightVariation).toBeLessThanOrEqual(1);
	});

	test('computed line height should match CSS specification in WebKit', async ({
		page,
		browserName
	}) => {
		const overlay = page.locator('.rendered-overlay');

		// Get CSS variables and computed styles
		const metrics = await overlay.evaluate((el) => {
			const computed = window.getComputedStyle(el);
			const fontSize = parseFloat(computed.fontSize);
			const lineHeight = parseFloat(computed.lineHeight);
			const lineHeightRatio = lineHeight / fontSize;

			// Try to read CSS variable
			const rootStyles = window.getComputedStyle(document.documentElement);
			const cssLineHeightVar = rootStyles.getPropertyValue('--editor-line-height').trim();

			return {
				fontSize,
				computedLineHeight: lineHeight,
				lineHeightRatio,
				cssLineHeightVariable: cssLineHeightVar,
				fontFamily: computed.fontFamily
			};
		});

		console.log(`[${browserName}] Font metrics:`, metrics);

		// The line height ratio should be close to 1.75 (from CSS)
		const expectedRatio = 1.75;
		const ratioDifference = Math.abs(metrics.lineHeightRatio - expectedRatio);

		expect(ratioDifference).toBeLessThan(0.1); // Allow 10% tolerance for browser differences
	});

	test('textarea and overlay should have identical line heights in WebKit', async ({
		page,
		browserName
	}) => {
		const textarea = page.locator('.raw-textarea');
		const overlay = page.locator('.rendered-overlay');

		const textareaMetrics = await textarea.evaluate((el: HTMLTextAreaElement) => {
			const computed = window.getComputedStyle(el);
			return {
				fontSize: parseFloat(computed.fontSize),
				lineHeight: parseFloat(computed.lineHeight),
				fontFamily: computed.fontFamily
			};
		});

		const overlayMetrics = await overlay.evaluate((el) => {
			const computed = window.getComputedStyle(el);
			return {
				fontSize: parseFloat(computed.fontSize),
				lineHeight: parseFloat(computed.lineHeight),
				fontFamily: computed.fontFamily
			};
		});

		console.log(`[${browserName}] Textarea metrics:`, textareaMetrics);
		console.log(`[${browserName}] Overlay metrics:`, overlayMetrics);

		// Font sizes should match
		expect(textareaMetrics.fontSize).toBe(overlayMetrics.fontSize);

		// Line heights should match
		expect(textareaMetrics.lineHeight).toBe(overlayMetrics.lineHeight);

		// Font families should match
		expect(textareaMetrics.fontFamily).toBe(overlayMetrics.fontFamily);
	});
});
