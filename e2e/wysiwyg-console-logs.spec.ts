import { test, expect } from '@playwright/test';

/**
 * Simple test that loads the page and captures console logs showing diagnostic mapping
 */
test.describe('WYSIWYG Editor - Console Logs', () => {
	test('should capture diagnostic mapping logs from console', async ({ page }) => {
		const consoleLogs: string[] = [];

		// Capture console.log messages
		page.on('console', (msg) => {
			if (msg.type() === 'log') {
				consoleLogs.push(msg.text());
			}
		});

		await page.goto('/edit');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });

		// Wait for initial evaluation and diagnostic mapping
		await page.waitForTimeout(3000);

		console.log('\n=== BROWSER CONSOLE LOGS ===');
		consoleLogs.forEach((log) => {
			console.log(log);
		});
		console.log('============================\n');

		// Filter for diagnostic mapping logs
		const diagnosticLogs = consoleLogs.filter((log) =>
			log.includes('[WYSIWYG] Diagnostic mapping')
		);

		console.log('\n=== DIAGNOSTIC MAPPING LOGS ===');
		diagnosticLogs.forEach((log) => {
			console.log(log);
		});
		console.log('================================\n');

		// Get the document content to understand which lines have what content
		const textarea = page.locator('.raw-textarea');
		const content = await textarea.inputValue();
		const contentLines = content.split('\n');

		console.log('\n=== DOCUMENT CONTENT ===');
		contentLines.forEach((line, index) => {
			console.log(`Line ${index}: "${line}"`);
		});
		console.log('========================\n');

		// Just ensure we got some logs
		expect(consoleLogs.length).toBeGreaterThan(0);
	});
});
