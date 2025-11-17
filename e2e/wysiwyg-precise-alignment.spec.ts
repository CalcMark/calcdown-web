import { test, expect } from '@playwright/test';

/**
 * Test precise alignment between textarea and overlay
 *
 * CRITICAL: Textarea and overlay MUST have identical dimensions at character level.
 * Any padding, margin, or line-height difference causes cursor drift.
 */

test.describe('WYSIWYG Precise Alignment', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');

		// Clear any initial content
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('');
		await page.waitForTimeout(300);
	});

	test('token spans should have zero padding and margin', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('x = 5');
		await page.waitForTimeout(500);

		// Get all token spans
		const tokenSpans = page.locator('.rendered-overlay .calculation span');
		const count = await tokenSpans.count();

		// Check each token span for zero padding/margin
		for (let i = 0; i < count; i++) {
			const span = tokenSpans.nth(i);
			const styles = await span.evaluate((el) => {
				const computed = window.getComputedStyle(el);
				return {
					paddingTop: computed.paddingTop,
					paddingBottom: computed.paddingBottom,
					paddingLeft: computed.paddingLeft,
					paddingRight: computed.paddingRight,
					marginTop: computed.marginTop,
					marginBottom: computed.marginBottom,
					lineHeight: computed.lineHeight
				};
			});

			// All padding and margin should be 0
			expect(styles.paddingTop).toBe('0px');
			expect(styles.paddingBottom).toBe('0px');
			expect(styles.paddingLeft).toBe('0px');
			expect(styles.paddingRight).toBe('0px');
			expect(styles.marginTop).toBe('0px');
			expect(styles.marginBottom).toBe('0px');
		}
	});

	test('calculation span should have zero padding that affects line height', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('monthly_salary = $5000');
		await page.waitForTimeout(500);

		const calcSpan = page.locator('.rendered-overlay .calculation').first();
		const styles = await calcSpan.evaluate((el) => {
			const computed = window.getComputedStyle(el);
			return {
				paddingTop: computed.paddingTop,
				paddingBottom: computed.paddingBottom,
				marginTop: computed.marginTop,
				marginBottom: computed.marginBottom
			};
		});

		// Vertical padding/margin must be zero to not affect line height
		expect(styles.paddingTop).toBe('0px');
		expect(styles.paddingBottom).toBe('0px');
		expect(styles.marginTop).toBe('0px');
		expect(styles.marginBottom).toBe('0px');
	});

	test('each line should have identical height before and after syntax highlighting', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type content
		await textarea.fill('x = 5');

		// Measure line height immediately (before highlighting)
		await page.waitForTimeout(50); // Very short wait

		const line = page.locator('.rendered-overlay .line').first();
		const heightBefore = await line.evaluate((el) => el.getBoundingClientRect().height);

		// Wait for syntax highlighting
		await page.waitForTimeout(500);

		const heightAfter = await line.evaluate((el) => el.getBoundingClientRect().height);

		// Heights should be identical
		expect(heightBefore).toBe(heightAfter);
	});

	test('overlay text should align perfectly with textarea text', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('monthly_salary = $5000\nrent = $1500');
		await page.waitForTimeout(500);

		// Get textarea bounding box
		const textareaBox = await textarea.boundingBox();
		expect(textareaBox).not.toBeNull();

		// Get first line in overlay
		const firstLine = page.locator('.rendered-overlay .line').first();
		const firstLineBox = await firstLine.boundingBox();
		expect(firstLineBox).not.toBeNull();

		// Get textarea padding
		const textareaPadding = await textarea.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return {
				left: parseFloat(style.paddingLeft),
				top: parseFloat(style.paddingTop)
			};
		});

		// First character should be at exact same position
		expect(firstLineBox!.x).toBe(textareaBox!.x + textareaPadding.left);
		expect(firstLineBox!.y).toBe(textareaBox!.y + textareaPadding.top);
	});

	test('line height should be consistent across plain text, markdown, and calculations', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('Plain text\n# Markdown heading\nx = 5');
		await page.waitForTimeout(500);

		// Get all three line heights
		const lines = page.locator('.rendered-overlay .line');

		const height1 = await lines.nth(0).evaluate((el) => el.getBoundingClientRect().height);
		const height2 = await lines.nth(1).evaluate((el) => el.getBoundingClientRect().height);
		const height3 = await lines.nth(2).evaluate((el) => el.getBoundingClientRect().height);

		// All lines should have same height (determined by line-height CSS)
		expect(height1).toBe(height2);
		expect(height2).toBe(height3);
	});

	test('markdown elements should not add extra vertical space', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('# Heading\nRegular text');
		await page.waitForTimeout(500);

		// Check that h1 inside markdown line has zero margin
		const h1 = page.locator('.rendered-overlay h1, .rendered-overlay strong, .rendered-overlay em').first();

		if (await h1.count() > 0) {
			const styles = await h1.evaluate((el) => {
				const computed = window.getComputedStyle(el);
				return {
					marginTop: computed.marginTop,
					marginBottom: computed.marginBottom,
					paddingTop: computed.paddingTop,
					paddingBottom: computed.paddingBottom
				};
			});

			expect(styles.marginTop).toBe('0px');
			expect(styles.marginBottom).toBe('0px');
		}
	});

	test('cursor position should match clicked position in overlay', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		const text = 'monthly_salary = $5000';
		await textarea.fill(text);
		await page.waitForTimeout(500);

		// Get overlay line
		const line = page.locator('.rendered-overlay .line').first();
		const lineBox = await line.boundingBox();
		expect(lineBox).not.toBeNull();

		// Click in middle of line
		await page.mouse.click(
			lineBox!.x + lineBox!.width / 2,
			lineBox!.y + lineBox!.height / 2
		);

		await page.waitForTimeout(200);

		// Get cursor position from textarea
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => {
			return el.selectionStart;
		});

		// Should be somewhere in middle of text (not 0 or end)
		expect(cursorPos).toBeGreaterThan(5);
		expect(cursorPos).toBeLessThan(text.length);
	});

	test('gutter should align perfectly with overlay lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('x = 5\ny = 10\ntotal = x + y');
		await page.waitForTimeout(500);

		// Get first overlay line
		const overlayLine = page.locator('.rendered-overlay .line').first();
		const overlayBox = await overlayLine.boundingBox();

		// Get first gutter line
		const gutterLine = page.locator('.gutter .gutter-line').first();
		const gutterBox = await gutterLine.boundingBox();

		expect(overlayBox).not.toBeNull();
		expect(gutterBox).not.toBeNull();

		// Y positions should match (accounting for line-height centering)
		expect(overlayBox!.y).toBe(gutterBox!.y);
		expect(overlayBox!.height).toBe(gutterBox!.height);
	});
});
