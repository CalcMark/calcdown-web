import { test, expect } from '@playwright/test';

/**
 * Tests for cursor visibility
 *
 * These tests verify that the cursor is visible in the editor,
 * especially after clicking to position the cursor.
 */
test.describe('WYSIWYG Editor - Cursor Visibility', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('cursor should be visible in idle state', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Click to focus
		await textarea.click();
		await page.waitForTimeout(200); // Wait for idle state

		// Check that caret-color is visible (not transparent)
		const caretColor = await textarea.evaluate((el) => {
			return window.getComputedStyle(el).caretColor;
		});

		// Should not be transparent
		expect(caretColor).not.toBe('transparent');
		expect(caretColor).not.toBe('rgba(0, 0, 0, 0)');
	});

	test('cursor should be visible while typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.click();
		await textarea.type('test', { delay: 50 });

		// Check immediately during typing
		await page.waitForTimeout(10);

		const caretColor = await textarea.evaluate((el) => {
			return window.getComputedStyle(el).caretColor;
		});

		expect(caretColor).not.toBe('transparent');
		expect(caretColor).not.toBe('rgba(0, 0, 0, 0)');
	});

	test('cursor should move when clicking different positions', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Set some content
		await textarea.fill('line1\nline2\nline3');
		await page.waitForTimeout(200);

		// Click at the beginning
		await textarea.click({ position: { x: 10, y: 10 } });
		const pos1 = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Click further down
		await textarea.click({ position: { x: 10, y: 50 } });
		const pos2 = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);

		// Cursor position should have changed
		expect(pos2).not.toBe(pos1);
		expect(pos2).toBeGreaterThan(pos1);
	});

	test('cursor should be visible after clicking to position cursor', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Set content
		await textarea.fill('result = 100 + 200');
		await page.waitForTimeout(200);

		// Click in the middle of the text
		const box = await textarea.boundingBox();
		if (box) {
			await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
		}

		// Wait a moment for cursor to update
		await page.waitForTimeout(50);

		// Cursor should be visible
		const caretColor = await textarea.evaluate((el) => {
			return window.getComputedStyle(el).caretColor;
		});

		expect(caretColor).not.toBe('transparent');
	});

	test('cursor should be visible when navigating with arrow keys', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('abcdef');
		await page.waitForTimeout(200);

		// Focus and position at start
		await textarea.click();
		await textarea.press('Home');

		// Navigate with arrow keys
		await textarea.press('ArrowRight');
		await textarea.press('ArrowRight');
		await textarea.press('ArrowRight');

		// Cursor should be visible
		const caretColor = await textarea.evaluate((el) => {
			return window.getComputedStyle(el).caretColor;
		});

		expect(caretColor).not.toBe('transparent');

		// And cursor position should be at position 3
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBe(3);
	});

	test('cursor should remain visible after typing stops', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.type('hello world', { delay: 50 });

		// Wait for idle state (150ms typing timeout + buffer)
		await page.waitForTimeout(200);

		// Cursor should still be visible
		const caretColor = await textarea.evaluate((el) => {
			return window.getComputedStyle(el).caretColor;
		});

		expect(caretColor).not.toBe('transparent');
	});

	test('cursor should be visible when clicking between words', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.fill('monthly_salary = $5000');
		await page.waitForTimeout(200);

		// Get textarea position
		const box = await textarea.boundingBox();
		expect(box).not.toBeNull();

		// Click in the middle of the first word
		if (box) {
			await page.mouse.click(box.x + 50, box.y + 10);
		}

		await page.waitForTimeout(50);

		// Check cursor position moved
		const cursorPos = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(cursorPos).toBeGreaterThan(0);
		expect(cursorPos).toBeLessThan(23); // Full text length

		// Cursor should be visible
		const caretColor = await textarea.evaluate((el) => {
			return window.getComputedStyle(el).caretColor;
		});

		expect(caretColor).not.toBe('transparent');
	});

	test('cursor should be visible in empty textarea', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await page.waitForTimeout(200);

		await textarea.click();

		// Cursor should be visible even with no content
		const caretColor = await textarea.evaluate((el) => {
			return window.getComputedStyle(el).caretColor;
		});

		expect(caretColor).not.toBe('transparent');
	});
});
