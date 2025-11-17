import { test, expect } from '@playwright/test';
import { USER_INPUT_DEBOUNCE_MS } from '../src/lib/constants';

/**
 * Diagnostic tests to understand what's being rendered
 */
test.describe('WYSIWYG Editor - Diagnostic', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });
		await page.waitForSelector('.evaluating-indicator', { state: 'hidden', timeout: 5000 }).catch(() => {});
	});

	test('should capture and log the HTML structure of rendered lines', async ({ page }) => {
		await page.waitForTimeout(2000); // Wait for initial render

		const overlay = page.locator('.rendered-overlay');
		const innerHTML = await overlay.innerHTML();

		console.log('=== OVERLAY HTML ===');
		console.log(innerHTML);
		console.log('===================');

		const lines = overlay.locator('.line');
		const lineCount = await lines.count();

		console.log(`Found ${lineCount} lines`);

		// Log first 5 lines in detail
		for (let i = 0; i < Math.min(5, lineCount); i++) {
			const line = lines.nth(i);
			const lineHTML = await line.innerHTML();
			const lineText = await line.textContent();
			const lineAttr = await line.getAttribute('data-line');

			console.log(`\nLine ${i} (data-line=${lineAttr}):`);
			console.log(`  Text: "${lineText}"`);
			console.log(`  HTML: ${lineHTML.substring(0, 200)}${lineHTML.length > 200 ? '...' : ''}`);
		}

		// Check textarea content
		const textarea = page.locator('.raw-textarea');
		const textareaValue = await textarea.inputValue();
		console.log('\n=== TEXTAREA CONTENT ===');
		console.log(textareaValue);
		console.log('========================');

		// The test should fail so we see the output
		expect(lineCount).toBeGreaterThan(0);
	});

	test('should show raw content vs rendered content', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		// Type a simple calculation
		await textarea.clear();
		await textarea.fill('result = 100 + 200');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		// Get rendered HTML
		const overlay = page.locator('.rendered-overlay');
		const line = overlay.locator('.line').first();
		const lineHTML = await line.innerHTML();
		const lineText = await line.textContent();

		console.log('Input: "result = 100 + 200"');
		console.log(`Rendered text: "${lineText}"`);
		console.log(`Rendered HTML: ${lineHTML}`);

		// Check for expected elements
		const hasCalculationClass = lineHTML.includes('class="calculation"');
		const hasTokens = lineHTML.includes('token-');
		const hasResult = lineHTML.includes('calc-result');

		console.log(`Has calculation class: ${hasCalculationClass}`);
		console.log(`Has tokens: ${hasTokens}`);
		console.log(`Has result: ${hasResult}`);

		expect(lineText).toContain('result');
	});

	test('should show classification for each line type', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('# Title\n\nSome text\n\ncalc = 100');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		const overlay = page.locator('.rendered-overlay');
		const lines = overlay.locator('.line');

		console.log('\n=== LINE CLASSIFICATIONS ===');
		for (let i = 0; i < await lines.count(); i++) {
			const line = lines.nth(i);
			const html = await line.innerHTML();
			const text = await line.textContent();

			let classification = 'UNKNOWN';
			if (html.includes('class="calculation"')) {
				classification = 'CALCULATION';
			} else if (html.includes('<h1>') || html.includes('<h2>')) {
				classification = 'MARKDOWN (heading)';
			} else if (text.trim() === '') {
				classification = 'BLANK';
			} else if (!html.includes('class="calculation"')) {
				classification = 'MARKDOWN (text)';
			}

			console.log(`Line ${i}: ${classification} - "${text}"`);
			console.log(`  HTML: ${html.substring(0, 100)}${html.length > 100 ? '...' : ''}`);
		}
		console.log('============================\n');

		expect(await lines.count()).toBeGreaterThan(0);
	});

	test('should show token structure for calculation lines', async ({ page }) => {
		const textarea = page.locator('.raw-textarea');

		await textarea.clear();
		await textarea.fill('monthly_salary = $5000');

		await page.waitForTimeout(USER_INPUT_DEBOUNCE_MS + 1500);

		const overlay = page.locator('.rendered-overlay');
		const line = overlay.locator('.line').first();
		const html = await line.innerHTML();
		const text = await line.textContent();

		console.log('\n=== TOKEN ANALYSIS ===');
		console.log(`Full text: "${text}"`);
		console.log(`Full HTML: ${html}`);

		// Count token spans
		const tokenMatches = html.match(/token-\w+/g);
		console.log(`Token classes found: ${tokenMatches ? tokenMatches.join(', ') : 'none'}`);

		// Check for specific elements
		const identifierTokens = await overlay.locator('.token-identifier').count();
		const numberTokens = await overlay.locator('.token-number').count();
		const assignTokens = await overlay.locator('.token-assign').count();

		console.log(`Identifier tokens: ${identifierTokens}`);
		console.log(`Number tokens: ${numberTokens}`);
		console.log(`Assign tokens: ${assignTokens}`);
		console.log('======================\n');

		expect(text).toContain('monthly_salary');
	});

	test('diagnostic indicator should appear on correct line when hovering', async ({ page }) => {
		// Test diagnostic positioning with hover overlay
		// Look for any line with a diagnostic in the default content

		const overlay = page.locator('.rendered-overlay');
		const lines = overlay.locator('.line');

		await page.waitForTimeout(1000);

		const lineCount = await lines.count();
		console.log(`Total lines: ${lineCount}`);

		// Find a line with a diagnostic by checking all lines
		let lineWithDiagnostic = -1;
		let lineWithoutDiagnostic = -1;

		for (let i = 0; i < Math.min(lineCount, 20); i++) {
			const line = lines.nth(i);
			await line.hover();
			await page.waitForTimeout(200);

			const diagnostic = page.locator('.diagnostic-indicator');
			const hasDiagnostic = await diagnostic.isVisible().catch(() => false);

			const text = await line.textContent();
			const lineNum = await line.getAttribute('data-line');

			console.log(`Line ${lineNum}: "${text?.substring(0, 50)}" - diagnostic: ${hasDiagnostic}`);

			if (hasDiagnostic && lineWithDiagnostic === -1) {
				lineWithDiagnostic = i;

				const hoverOverlay = page.locator('.hover-overlay');
				const hoverTop = await hoverOverlay.evaluate((el) => window.getComputedStyle(el).top);
				console.log(`Found diagnostic on line ${lineNum}, hover overlay at: ${hoverTop}`);

				// Take screenshot
				await page.screenshot({ path: `test-results/diagnostic-found-line${lineNum}.png` });
			} else if (!hasDiagnostic && lineWithoutDiagnostic === -1) {
				lineWithoutDiagnostic = i;
			}

			if (lineWithDiagnostic >= 0 && lineWithoutDiagnostic >= 0) {
				break;
			}
		}

		// Basic assertion - we should have found at least one line with a diagnostic
		expect(lineWithDiagnostic).toBeGreaterThanOrEqual(0);
		console.log(`\nTest complete - found diagnostic on line index ${lineWithDiagnostic}`);
	});
});
