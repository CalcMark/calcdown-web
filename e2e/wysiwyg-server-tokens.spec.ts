import { test, expect } from '@playwright/test';

/**
 * Test to inspect what the server is returning for tokens
 */
test.describe('WYSIWYG Editor - Server Token Inspection', () => {
	test('should log server response for token positions', async ({ page }) => {
		// Intercept the API call to see what the server returns
		let serverResponse: any = null;

		await page.route('**/api/process', async (route) => {
			const response = await route.fetch();
			const json = await response.json();
			serverResponse = json;
			await route.fulfill({ response, json });
		});

		await page.goto('/wysiwyg');
		await page.waitForSelector('.wysiwyg-container', { state: 'visible' });

		// Wait for initial evaluation to complete
		await page.waitForTimeout(3000);

		console.log('\n=== SERVER RESPONSE ===');
		console.log(JSON.stringify(serverResponse, null, 2));
		console.log('=======================\n');

		if (serverResponse && serverResponse.tokensByLine) {
			console.log('\n=== TOKENS BY LINE ===');
			for (const [lineNum, tokens] of Object.entries(serverResponse.tokensByLine)) {
				console.log(`\nLine ${lineNum}:`);
				for (const token of tokens as any[]) {
					console.log(`  Type: ${token.type}, Start: ${token.start}, End: ${token.end}, Value: "${token.value}"`);
				}
			}
			console.log('======================\n');
		}

		expect(serverResponse).not.toBeNull();
	});
});
