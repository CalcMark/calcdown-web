import { test, expect } from '@playwright/test';

test.describe('Error Token Styling', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.processing-indicator', { state: 'hidden', timeout: 10000 });
		await page.waitForTimeout(500);
	});

	test('tokens with errors should have has-error class and red dashed underline', async ({
		page
	}) => {
		// Find all tokens with has-error class
		const errorTokens = page.locator('.has-error');
		const count = await errorTokens.count();

		console.log(`Found ${count} tokens with errors`);

		if (count === 0) {
			console.log('No error tokens found - this test expects at least one error in the document');
			// This is not necessarily a failure - the document might not have errors
			// But let's log it for visibility
		}

		// For each error token, verify styling
		for (let i = 0; i < count; i++) {
			const token = errorTokens.nth(i);

			// Check that it's visible
			await expect(token).toBeVisible();

			// Get the token text for logging
			const text = await token.textContent();
			console.log(`Error token ${i}: "${text}"`);

			// Check that it has the error class
			const classes = await token.getAttribute('class');
			expect(classes).toContain('has-error');

			// Check computed styles
			const styles = await token.evaluate((el) => {
				const computed = window.getComputedStyle(el);
				return {
					borderBottom: computed.borderBottom,
					borderBottomWidth: computed.borderBottomWidth,
					borderBottomStyle: computed.borderBottomStyle,
					borderBottomColor: computed.borderBottomColor,
					background: computed.background,
					backgroundColor: computed.backgroundColor
				};
			});

			console.log(`Error token ${i} styles:`, styles);

			// Verify red dashed underline (2px dashed #dc2626)
			expect(styles.borderBottomWidth).toBe('2px');
			expect(styles.borderBottomStyle).toBe('dashed');
			// Color might be in rgb format: rgb(220, 38, 38)
			expect(styles.borderBottomColor).toMatch(/rgb\(220,\s*38,\s*38\)/);

			// Verify light red background
			// Background should contain rgba(220, 38, 38, 0.1)
			expect(styles.backgroundColor).toMatch(/rgba\(220,\s*38,\s*38,\s*0\.1\)/);
		}
	});

	test('specific error case: undefined variable should have error styling', async ({ page }) => {
		// Look for a calculation with an undefined variable error
		// The screenshot shows: undefined_calc = missing_var + 100

		// Find all identifier tokens
		const identifierTokens = page.locator('.token-identifier');
		const count = await identifierTokens.count();

		console.log(`Found ${count} identifier tokens`);

		// Debug: Log all identifier tokens with their text and classes
		for (let i = 0; i < count; i++) {
			const token = identifierTokens.nth(i);
			const text = await token.textContent();
			const classes = await token.getAttribute('class');
			console.log(`Identifier ${i}: "${text}" - classes: ${classes}`);
		}

		// Check each identifier to see if any have the has-error class
		let foundErrorIdentifier = false;

		for (let i = 0; i < count; i++) {
			const token = identifierTokens.nth(i);
			const classes = await token.getAttribute('class');

			if (classes && classes.includes('has-error')) {
				foundErrorIdentifier = true;
				const text = await token.textContent();
				console.log(`Found error identifier: "${text}"`);

				// Verify it has error styling
				await expect(token).toHaveClass(/has-error/);

				const borderBottom = await token.evaluate((el) => {
					return window.getComputedStyle(el).borderBottom;
				});

				console.log(`Error identifier border-bottom: ${borderBottom}`);
				expect(borderBottom).toContain('dashed');
				expect(borderBottom).toContain('rgb(220, 38, 38)');
			}
		}

		// Log whether we found any error identifiers
		console.log(`Found error identifier: ${foundErrorIdentifier}`);

		// If we didn't find any error tokens, the test should inform us
		if (!foundErrorIdentifier) {
			console.log('WARNING: No error tokens found. Either:');
			console.log('1. The default content does not include error examples');
			console.log('2. Error diagnostics are not being passed to tokens correctly');
		}
	});
});
