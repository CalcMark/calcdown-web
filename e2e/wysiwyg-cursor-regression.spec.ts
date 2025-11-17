import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Regression tests for cursor positioning
 *
 * These tests ensure cursor placement accuracy doesn't regress.
 * Every test should PASS at all times - failures indicate regressions.
 */
test.describe('WYSIWYG Editor - Cursor Positioning Regression Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page
			.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 })
			.catch(() => {});
	});

	test('clicking on first line should place cursor on first line, not several lines below', async ({
		page
	}) => {
		const textarea = page.locator('.raw-textarea');

		// Set up multi-line content
		await textarea.fill('line 1 = 100\nline 2 = 200\nline 3 = 300\nline 4 = 400');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');
		const firstLine = overlay.locator('.line').first();

		// Use page.mouse.click with bounding box to pass through pointer-events: none
		const box = await firstLine.boundingBox();
		expect(box).not.toBeNull();
		await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

		// Get cursor position
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Cursor should be on first line (position 0-12 for "line 1 = 100")
		// NOT on line 3 or 4 (which would be 40+)
		expect(cursorPos).toBeLessThanOrEqual(13);
		expect(cursorPos).toBeGreaterThanOrEqual(0);
	});

	test('clicking on second line should place cursor on second line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('line 1 = 100\nline 2 = 200\nline 3 = 300');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');
		const secondLine = overlay.locator('.line').nth(1);

		const box = await secondLine.boundingBox();
		expect(box).not.toBeNull();
		await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Second line starts at position 13 (after "line 1 = 100\n")
		// and ends at position 25 (after "line 2 = 200")
		expect(cursorPos).toBeGreaterThanOrEqual(13);
		expect(cursorPos).toBeLessThanOrEqual(26);
	});

	test('clicking on third line should place cursor on third line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('line 1 = 100\nline 2 = 200\nline 3 = 300');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');
		const thirdLine = overlay.locator('.line').nth(2);

		const box = await thirdLine.boundingBox();
		expect(box).not.toBeNull();
		await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Third line starts at position 26 (after "line 1 = 100\nline 2 = 200\n")
		// and ends at position 38 (after "line 3 = 300")
		expect(cursorPos).toBeGreaterThanOrEqual(26);
		expect(cursorPos).toBeLessThanOrEqual(39);
	});

	test('clicking on line should NOT jump 2x the distance down', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create 10 lines to make vertical positioning errors obvious
		const lines = Array.from({ length: 10 }, (_, i) => `line_${i + 1} = ${(i + 1) * 100}`).join(
			'\n'
		);
		await textarea.fill(lines);
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		const overlay = page.locator('.rendered-overlay');

		// Click on line 5 (index 4)
		const line5 = overlay.locator('.line').nth(4);
		const box = await line5.boundingBox();
		expect(box).not.toBeNull();
		await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		const textContent = await textarea.inputValue();
		const linesArray = textContent.split('\n');

		// Calculate expected range for line 5
		let expectedStart = 0;
		for (let i = 0; i < 4; i++) {
			expectedStart += linesArray[i].length + 1; // +1 for newline
		}
		const expectedEnd = expectedStart + linesArray[4].length;

		// Cursor should be on line 5, not line 10 (which would indicate 2x jump)
		expect(cursorPos).toBeGreaterThanOrEqual(expectedStart);
		expect(cursorPos).toBeLessThanOrEqual(expectedEnd + 1);

		// Additional check: cursor should NOT be near the end of the document
		const documentLength = textContent.length;
		expect(cursorPos).toBeLessThan(documentLength * 0.7); // Should be in first 70% of document
	});

	test('clicking at specific Y coordinate should map to correct line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('line 1\nline 2\nline 3\nline 4\nline 5');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');
		const overlayBox = await overlay.boundingBox();
		expect(overlayBox).not.toBeNull();

		// Click at Y position corresponding to line 3
		// Line height is 28px, padding is 40px
		// Line 3 is at: 40 (padding) + 28*2 (first 2 lines) + 14 (middle of line 3) = 110px
		const clickX = overlayBox!.x + 50;
		const clickY = overlayBox!.y + 110;

		await page.mouse.click(clickX, clickY);

		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		const textContent = await textarea.inputValue();
		const linesArray = textContent.split('\n');

		// Calculate expected range for line 3 (index 2)
		const line1Len = linesArray[0].length + 1;
		const line2Len = linesArray[1].length + 1;
		const expectedStart = line1Len + line2Len;
		const expectedEnd = expectedStart + linesArray[2].length;

		expect(cursorPos).toBeGreaterThanOrEqual(expectedStart);
		expect(cursorPos).toBeLessThanOrEqual(expectedEnd + 1);
	});

	test('clicking on line with calculation result should position cursor in source text, not in result', async ({
		page
	}) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('result = 100 + 200');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');

		// Click on the line (which now includes "= 300" result)
		const line = overlay.locator('.line').first();
		const box = await line.boundingBox();
		expect(box).not.toBeNull();
		await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Cursor should be within the source text "result = 100 + 200" (0-18)
		// NOT beyond it (calculation result "= 300" is only in overlay)
		expect(cursorPos).toBeGreaterThanOrEqual(0);
		expect(cursorPos).toBeLessThanOrEqual(19);
	});

	test('cursor position should be stable across multiple clicks on same line', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('test = 123');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');
		const line = overlay.locator('.line').first();
		const lineBox = await line.boundingBox();
		expect(lineBox).not.toBeNull();

		// Click at the same position multiple times
		const clickX = lineBox!.x + 50;
		const clickY = lineBox!.y + lineBox!.height / 2;

		const positions: number[] = [];

		for (let i = 0; i < 5; i++) {
			await page.mouse.click(clickX, clickY);
			const pos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
			positions.push(pos);
			await page.waitForTimeout(100);
		}

		// All positions should be the same (or within 1 character)
		const firstPos = positions[0];
		for (const pos of positions) {
			expect(Math.abs(pos - firstPos)).toBeLessThanOrEqual(1);
		}
	});

	test('clicking on different X positions in same line should move cursor horizontally', async ({
		page
	}) => {
		const textarea = page.locator('.raw-textarea');

		// Use a calculation line so it has token spans for better click detection
		await textarea.fill('result = total + bonus + extra');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');
		const line = overlay.locator('.line').first();
		const lineBox = await line.boundingBox();
		expect(lineBox).not.toBeNull();

		const clickY = lineBox!.y + lineBox!.height / 2;

		// Click at 20% across (near "result")
		await page.mouse.click(lineBox!.x + lineBox!.width * 0.2, clickY);
		const pos1 = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Click at 60% across (near "bonus")
		await page.mouse.click(lineBox!.x + lineBox!.width * 0.6, clickY);
		const pos2 = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Second click should be to the right of first click
		expect(pos2).toBeGreaterThan(pos1);

		// Both should be on the same line
		const textContent = await textarea.inputValue();
		expect(pos1).toBeGreaterThanOrEqual(0);
		expect(pos1).toBeLessThanOrEqual(textContent.length);
		expect(pos2).toBeGreaterThanOrEqual(0);
		expect(pos2).toBeLessThanOrEqual(textContent.length);
	});

	test('scrolled document should maintain correct cursor positioning', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create enough lines to require scrolling
		const lines = Array.from({ length: 50 }, (_, i) => `line_${i + 1} = ${(i + 1) * 10}`).join(
			'\n'
		);
		await textarea.fill(lines);
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 2000);

		// Scroll down
		await textarea.evaluate((el) => {
			el.scrollTop = 400;
		});

		await page.waitForTimeout(500);

		const overlay = page.locator('.rendered-overlay');

		// Click on a visible line after scrolling
		const visibleLine = overlay.locator('.line').nth(20);
		const box = await visibleLine.boundingBox();
		expect(box).not.toBeNull();
		await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		const textContent = await textarea.inputValue();
		const linesArray = textContent.split('\n');

		// Calculate expected range for line 21 (index 20)
		let expectedStart = 0;
		for (let i = 0; i < 20; i++) {
			expectedStart += linesArray[i].length + 1;
		}
		const expectedEnd = expectedStart + linesArray[20].length;

		// Cursor should be on the clicked line, accounting for scroll
		expect(cursorPos).toBeGreaterThanOrEqual(expectedStart);
		expect(cursorPos).toBeLessThanOrEqual(expectedEnd + 1);
	});

	test('clicking near token boundaries should place cursor at correct position', async ({
		page
	}) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('result = total + bonus');
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		const overlay = page.locator('.rendered-overlay');

		// Get the identifier token
		const identifierToken = overlay.locator('.token-identifier').first();
		const tokenBox = await identifierToken.boundingBox();
		expect(tokenBox).not.toBeNull();

		// Click just before the token
		await page.mouse.click(tokenBox!.x - 5, tokenBox!.y + tokenBox!.height / 2);
		const posBefore = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Click just after the token
		await page.mouse.click(tokenBox!.x + tokenBox!.width + 5, tokenBox!.y + tokenBox!.height / 2);
		const posAfter = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Position after should be greater than position before
		expect(posAfter).toBeGreaterThan(posBefore);

		// Both positions should be reasonable (within the line)
		expect(posBefore).toBeGreaterThanOrEqual(0);
		expect(posBefore).toBeLessThanOrEqual(23);
		expect(posAfter).toBeGreaterThanOrEqual(0);
		expect(posAfter).toBeLessThanOrEqual(23);
	});
});
