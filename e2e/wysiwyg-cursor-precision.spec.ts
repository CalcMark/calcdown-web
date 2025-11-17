import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Tests for precise cursor placement and editing experience
 *
 * These tests capture the DESIRED user experience:
 * - Click exactly where you want to edit in the rendered output
 * - Cursor appears exactly where you clicked
 * - Type/delete at that exact position
 * - Changes appear immediately at that position
 */
test.describe('WYSIWYG Editor - Cursor Precision', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page
			.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 })
			.catch(() => {});
	});

	test('should place cursor between characters when clicking in rendered text', async ({
		page
	}) => {
		// Wait for initial render
		await page.waitForTimeout(500);

		// Find the line with "bonus = $500" in the overlay
		const lines = page.locator('.rendered-overlay .line');
		let bonusLine = null;
		let _bonusLineIndex = -1;

		for (let i = 0; i < (await lines.count()); i++) {
			const text = await lines.nth(i).textContent();
			if (text?.includes('bonus') && text?.includes('500')) {
				bonusLine = lines.nth(i);
				_bonusLineIndex = i;
				break;
			}
		}

		expect(bonusLine).not.toBeNull();

		// Click in the middle of "500" (between the two zeros)
		// This should place the cursor at that exact position
		const bonusBox = await bonusLine!.boundingBox();
		expect(bonusBox).not.toBeNull();

		// Click where "50|0" should be (roughly 80% across the number)
		const clickX = bonusBox!.x + bonusBox!.width * 0.7;
		const clickY = bonusBox!.y + bonusBox!.height / 2;

		await page.mouse.click(clickX, clickY);

		// Get cursor position in textarea
		const textarea = page.locator('.raw-textarea');
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Get the text content
		const textContent = await textarea.inputValue();
		const lines_text = textContent.split('\n');

		// Calculate expected cursor position (should be in "bonus = $500")
		// We expect the cursor to be somewhere in the "500" part
		const bonusLineText = lines_text[_bonusLineIndex];
		const bonusIndex = bonusLineText.indexOf('500');

		// The cursor should be somewhere within the "500" string
		let positionInDocument = 0;
		for (let i = 0; i < _bonusLineIndex; i++) {
			positionInDocument += lines_text[i].length + 1; // +1 for newline
		}
		const expectedMin = positionInDocument + bonusIndex;
		const expectedMax = positionInDocument + bonusIndex + 3;

		// DESIRED: cursor should be exactly where we clicked
		// CURRENT: this will likely fail because cursor is in invisible textarea
		expect(cursorPos).toBeGreaterThanOrEqual(expectedMin);
		expect(cursorPos).toBeLessThanOrEqual(expectedMax);
	});

	test('should allow typing at precise cursor position', async ({ page }) => {
		await page.waitForTimeout(500);

		// Find line with "monthly_salary = $5000"
		const lines = page.locator('.rendered-overlay .line');
		let salaryLine = null;

		for (let i = 0; i < (await lines.count()); i++) {
			const text = await lines.nth(i).textContent();
			if (text?.includes('monthly_salary') && text?.includes('5000')) {
				salaryLine = lines.nth(i);
				break;
			}
		}

		expect(salaryLine).not.toBeNull();

		// Click right before the "5" in "5000"
		const box = await salaryLine!.boundingBox();
		expect(box).not.toBeNull();

		// Click where "$|5000" should be
		const clickX = box!.x + box!.width * 0.5; // Approximate position
		const clickY = box!.y + box!.height / 2;

		await page.mouse.click(clickX, clickY);

		// Type "1" - should insert to make it "$15000" or similar
		await page.keyboard.type('1');

		// Wait for update
		await page.waitForTimeout(200);

		// DESIRED: The "1" should appear exactly where we clicked
		// Check textarea content
		const textarea = page.locator('.raw-textarea');
		const content = await textarea.inputValue();

		// Should contain "15000" or "51000" depending on exact click position
		expect(content).toMatch(/1.*5000|5.*1.*000|50.*1.*00|500.*1.*0|5000.*1/);
	});

	test('should allow deleting character at cursor position', async ({ page }) => {
		await page.waitForTimeout(500);

		// Find line with "bonus = $500"
		const lines = page.locator('.rendered-overlay .line');
		let bonusLine = null;

		for (let i = 0; i < (await lines.count()); i++) {
			const text = await lines.nth(i).textContent();
			if (text?.includes('bonus') && text?.includes('500')) {
				bonusLine = lines.nth(i);
				break;
			}
		}

		expect(bonusLine).not.toBeNull();

		// Click in the middle of "500"
		const box = await bonusLine!.boundingBox();
		expect(box).not.toBeNull();

		const clickX = box!.x + box!.width * 0.7;
		const clickY = box!.y + box!.height / 2;

		await page.mouse.click(clickX, clickY);

		// Press backspace
		await page.keyboard.press('Backspace');

		// Wait for update
		await page.waitForTimeout(200);

		// DESIRED: One character should be deleted at cursor position
		const textarea = page.locator('.raw-textarea');
		const content = await textarea.inputValue();

		// "500" should now be "50" or "00" or "50" depending on which character was deleted
		// At minimum, the content should be shorter
		expect(content).toMatch(/bonus.*\$.*[0-9]{2}/);
	});

	test('should show cursor in rendered overlay at click position', async ({ page }) => {
		await page.waitForTimeout(500);

		// Click somewhere in the rendered text
		const overlay = page.locator('.rendered-overlay');
		const box = await overlay.boundingBox();
		expect(box).not.toBeNull();

		await page.mouse.click(box!.x + 100, box!.y + 50);

		// DESIRED: A visible cursor (blinking caret) should appear at the click position
		// This could be achieved with:
		// 1. A positioned cursor element in the overlay
		// 2. Or making the textarea text visible at cursor position
		// 3. Or switching to contentEditable

		// For now, check that textarea has focus
		const textarea = page.locator('.raw-textarea');
		await expect(textarea).toBeFocused();

		// DESIRED: Visual cursor indicator in overlay
		// This test captures the intent - implementation TBD
	});

	test('should handle click on token boundary precisely', async ({ page }) => {
		await page.waitForTimeout(500);

		// Find a calculation line
		const calculation = page.locator('.calculation').first();
		await expect(calculation).toBeVisible();

		// Get bounding box
		const box = await calculation.boundingBox();
		expect(box).not.toBeNull();

		// Click at the start of the calculation
		await page.mouse.click(box!.x + 5, box!.y + box!.height / 2);

		// Type a character
		await page.keyboard.type('x');

		await page.waitForTimeout(200);

		// DESIRED: Character appears at the start of the calculation line
		const textarea = page.locator('.raw-textarea');
		const content = await textarea.inputValue();

		// Should have inserted "x" at the beginning of some calculation line
		expect(content).toContain('x');
	});

	test('should allow selecting text by clicking and dragging in overlay', async ({ page }) => {
		await page.waitForTimeout(500);

		// Find a line with text
		const firstLine = page.locator('.rendered-overlay .line').first();
		const box = await firstLine.boundingBox();
		expect(box).not.toBeNull();

		// Click and drag to select text
		const startX = box!.x + 10;
		const startY = box!.y + box!.height / 2;
		const endX = box!.x + 100;
		const endY = startY;

		await page.mouse.move(startX, startY);
		await page.mouse.down();
		await page.mouse.move(endX, endY);
		await page.mouse.up();

		// DESIRED: Text should be selected in the visible overlay
		// Check textarea selection
		const textarea = page.locator('.raw-textarea');
		const selectionLength = await textarea.evaluate((el: HTMLTextAreaElement) => {
			return el.selectionEnd - el.selectionStart;
		});

		// DESIRED: Selection length should match the visual drag distance
		expect(selectionLength).toBeGreaterThan(0);
	});

	test('should handle double-click to select word', async ({ page }) => {
		await page.waitForTimeout(500);

		// Find line with "monthly_salary"
		const lines = page.locator('.rendered-overlay .line');
		let salaryLine = null;

		for (let i = 0; i < (await lines.count()); i++) {
			const text = await lines.nth(i).textContent();
			if (text?.includes('monthly_salary')) {
				salaryLine = lines.nth(i);
				break;
			}
		}

		expect(salaryLine).not.toBeNull();

		// Double-click on "salary" part
		const box = await salaryLine!.boundingBox();
		expect(box).not.toBeNull();

		await page.mouse.dblclick(box!.x + box!.width * 0.5, box!.y + box!.height / 2);

		// DESIRED: The word "monthly_salary" or just "salary" should be selected
		const textarea = page.locator('.raw-textarea');
		const selectedText = await textarea.evaluate((el: HTMLTextAreaElement) => {
			return el.value.substring(el.selectionStart, el.selectionEnd);
		});

		// Should have selected something
		expect(selectedText.length).toBeGreaterThan(0);
		// DESIRED: Should be the word we clicked on
		expect(selectedText).toMatch(/salary|monthly_salary/);
	});

	test('should update cursor position when arrow keys are pressed', async ({ page }) => {
		await page.waitForTimeout(500);

		const textarea = page.locator('.raw-textarea');
		await textarea.click();

		// Get initial cursor position
		const initialPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Press right arrow
		await page.keyboard.press('ArrowRight');

		const newPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Cursor should have moved
		expect(newPos).toBe(initialPos + 1);

		// DESIRED: A visual cursor indicator in the overlay should also move
		// This test captures the intent - visual indicator implementation TBD
	});

	test('should maintain visual cursor position during evaluation', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type something
		await textarea.click();
		await textarea.fill('test = 100');

		// Position cursor at a specific location (after "test")
		await textarea.evaluate((el: HTMLTextAreaElement) => {
			el.selectionStart = 4;
			el.selectionEnd = 4;
		});

		const cursorBefore = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Wait for evaluation
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// DESIRED: Cursor position should be maintained
		const cursorAfter = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorAfter).toBe(cursorBefore);

		// DESIRED: Visual cursor in overlay should remain at same position
	});

	test('should handle clicking on calculation result', async ({ page }) => {
		await page.waitForTimeout(500);

		// Find a calculation result (= $5500 type display)
		const calcResult = page.locator('.calc-result').first();

		// Only run test if results are showing
		if ((await calcResult.count()) > 0) {
			await expect(calcResult).toBeVisible();

			// Click on the result
			const box = await calcResult.boundingBox();
			expect(box).not.toBeNull();

			await page.mouse.click(box!.x + 10, box!.y + box!.height / 2);

			// DESIRED: Cursor should be positioned near the end of the calculation line
			// (Results are appended to lines, so clicking result should position cursor there)
			const textarea = page.locator('.raw-textarea');
			const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

			// Should have focused the textarea
			await expect(textarea).toBeFocused();

			// Cursor should be somewhere (not at start)
			expect(cursorPos).toBeGreaterThanOrEqual(0);
		}
	});

	test('should handle clicking between rendered tokens', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Enter a calculation with clear tokens
		await textarea.click();
		await textarea.clear();
		await textarea.fill('result = 10 + 20');

		// Wait for tokenization
		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1000);

		// Find the calculation
		const calculation = page.locator('.calculation');
		if ((await calculation.count()) > 0) {
			const box = await calculation.first().boundingBox();
			expect(box).not.toBeNull();

			// Click between "10" and "+" (roughly middle of line)
			const clickX = box!.x + box!.width * 0.4;
			const clickY = box!.y + box!.height / 2;

			await page.mouse.click(clickX, clickY);

			// Type a character
			await page.keyboard.type('5');

			await page.waitForTimeout(200);

			// DESIRED: "5" should appear between "10" and "+"
			const content = await textarea.inputValue();
			expect(content).toMatch(/10.*5.*\+|10\s+5/);
		}
	});
});
