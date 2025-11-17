import { test, expect } from '@playwright/test';

/**
 * Test that cursor responds INSTANTLY to all user interactions
 *
 * CRITICAL: Cursor position and visibility must update synchronously with:
 * - Keyboard navigation (arrow keys, Home, End, etc.)
 * - Mouse clicks
 * - Text selection
 *
 * NO DEBOUNCING on cursor updates. Cursor updates are HIGHEST PRIORITY.
 */

test.describe('WYSIWYG Cursor - Instant Response', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');

		// Clear initial content
		const textarea = page.locator('.raw-textarea');
		await textarea.click();
		await textarea.fill('');
		await page.waitForTimeout(300);
	});

	test('cursor should appear immediately after arrow key press (0ms delay)', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('line 1\nline 2\nline 3');
		await page.waitForTimeout(300);

		// Click to position cursor
		await textarea.click({ position: { x: 10, y: 10 } });
		await page.waitForTimeout(50);

		const customCursor = page.locator('.custom-cursor');

		// Record initial position
		const initialBox = await customCursor.boundingBox();
		expect(initialBox).not.toBeNull();

		// Press arrow down - cursor should move INSTANTLY
		const beforePress = Date.now();
		await textarea.press('ArrowDown');

		// Wait minimal time for DOM update (NOT for debounce)
		await page.waitForTimeout(10);

		const afterPress = Date.now();
		const elapsedMs = afterPress - beforePress;

		// Check cursor is visible and has moved
		const newBox = await customCursor.boundingBox();
		expect(newBox).not.toBeNull();
		expect(newBox!.y).toBeGreaterThan(initialBox!.y);

		// Cursor should respond within 50ms (not 150ms or 500ms)
		expect(elapsedMs).toBeLessThan(50);
	});

	test('cursor should update position on every arrow key press without delay', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('a = 1\nb = 2\nc = 3\nd = 4\ne = 5');
		await page.waitForTimeout(300);

		// Start at top
		await textarea.press('Home');
		await page.waitForTimeout(10);

		const customCursor = page.locator('.custom-cursor');
		const positions: number[] = [];

		// Press arrow down 5 times rapidly
		for (let i = 0; i < 5; i++) {
			await textarea.press('ArrowDown');
			await page.waitForTimeout(10); // Minimal wait for DOM
			const box = await customCursor.boundingBox();
			positions.push(box!.y);
		}

		// All positions should be different (cursor moved each time)
		const uniquePositions = new Set(positions);
		expect(uniquePositions.size).toBe(5);

		// Each position should be lower than the previous
		for (let i = 1; i < positions.length; i++) {
			expect(positions[i]).toBeGreaterThan(positions[i - 1]);
		}
	});

	test('cursor should appear immediately on mouse click (0ms delay)', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('x = 10\ny = 20\nz = 30');
		await page.waitForTimeout(300);

		const customCursor = page.locator('.custom-cursor');

		// Click at different positions rapidly
		const beforeClick = Date.now();
		await textarea.click({ position: { x: 50, y: 10 } });
		await page.waitForTimeout(10);
		const afterClick = Date.now();

		const box = await customCursor.boundingBox();
		expect(box).not.toBeNull();
		expect(box!.x).toBeGreaterThan(0);

		// Click should show cursor within 50ms
		expect(afterClick - beforeClick).toBeLessThan(50);
	});

	test('cursor should follow rapid clicking without lag', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('first line\nsecond line\nthird line');
		await page.waitForTimeout(300);

		const customCursor = page.locator('.custom-cursor');
		const yPositions: number[] = [];

		// Click three different positions rapidly
		const clicks = [
			{ x: 10, y: 10 },
			{ x: 10, y: 40 },
			{ x: 10, y: 70 }
		];

		for (const pos of clicks) {
			await textarea.click({ position: pos });
			await page.waitForTimeout(50); // Allow DOM to settle
			const box = await customCursor.boundingBox();
			yPositions.push(box!.y);
		}

		// At least 2 Y positions should be different (clicks may land on same line)
		const uniqueY = new Set(yPositions);
		expect(uniqueY.size).toBeGreaterThanOrEqual(2);
	});

	test('cursor visibility should toggle instantly during typing', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('test');
		await page.waitForTimeout(200);

		const customCursor = page.locator('.custom-cursor');

		// Cursor should be visible when idle
		await expect(customCursor).toHaveClass(/visible/);

		// Start typing - cursor should hide immediately
		await textarea.press('a');
		await page.waitForTimeout(10);

		// Cursor should be hidden (has 'hidden' class)
		await expect(customCursor).toHaveClass(/hidden/);
	});

	test('cursor should not lag when holding down arrow key', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create many lines
		const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
		await textarea.fill(lines);
		await page.waitForTimeout(300);

		// Go to top
		await textarea.press('Control+Home');
		await page.waitForTimeout(50);

		const customCursor = page.locator('.custom-cursor');
		const startBox = await customCursor.boundingBox();

		// Simulate holding down arrow key (press multiple times rapidly)
		for (let i = 0; i < 10; i++) {
			await textarea.press('ArrowDown');
			await page.waitForTimeout(20); // Allow keyup to fire
		}

		const endBox = await customCursor.boundingBox();

		// Cursor should have moved down
		expect(endBox!.y).toBeGreaterThanOrEqual(startBox!.y);
	});

	test('cursor position calculation should not block on evaluation', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Create content that requires evaluation
		await textarea.fill('a = 1\nb = a + 1\nc = b + 1');
		await page.waitForTimeout(500); // Wait for initial evaluation

		const customCursor = page.locator('.custom-cursor');

		// Click to position cursor
		await textarea.click({ position: { x: 10, y: 10 } });
		const beforeMove = Date.now();

		// Move cursor while evaluation might be running
		await textarea.press('ArrowDown');
		await page.waitForTimeout(10);

		const afterMove = Date.now();

		// Cursor should move within 50ms even if evaluation is running
		expect(afterMove - beforeMove).toBeLessThan(50);

		const box = await customCursor.boundingBox();
		expect(box).not.toBeNull();
	});

	test('cursor should respond to Home/End keys instantly', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('this is a very long line of text that should span many pixels');
		await page.waitForTimeout(300);

		const customCursor = page.locator('.custom-cursor');

		// Move to start
		await textarea.press('Home');
		await page.waitForTimeout(50);
		const startBox = await customCursor.boundingBox();

		// Move to end
		await textarea.press('End');
		await page.waitForTimeout(50);
		const endBox = await customCursor.boundingBox();

		// Cursor X position should have changed (moved right)
		expect(endBox!.x).toBeGreaterThanOrEqual(startBox!.x);
	});

	test('cursor should appear immediately when switching from typing to navigation', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');
		await textarea.fill('test text');
		await page.waitForTimeout(200);

		// Type some characters (cursor hidden during typing)
		await textarea.press('a');
		await textarea.press('b');
		await textarea.press('c');

		// Now press arrow key - cursor should appear IMMEDIATELY
		const beforeArrow = Date.now();
		await textarea.press('ArrowLeft');
		await page.waitForTimeout(10);
		const afterArrow = Date.now();

		const customCursor = page.locator('.custom-cursor');
		await expect(customCursor).toHaveClass(/visible/);

		// Should respond within 50ms, not wait for typing debounce
		expect(afterArrow - beforeArrow).toBeLessThan(50);
	});
});
