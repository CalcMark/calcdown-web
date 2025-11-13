import { test, expect } from '@playwright/test';

test.describe('Syntax Highlighting', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.processing-indicator', { state: 'hidden', timeout: 10000 });
		await page.waitForTimeout(500);
	});

	test('renders calculation blocks with syntax-highlighted tokens', async ({ page }) => {
		// Verify calculation blocks exist
		const calcBlocks = await page.locator('.editable-block.calculation').count();
		expect(calcBlocks).toBeGreaterThan(0);

		// Get the first calculation block
		const firstCalcBlock = page.locator('.editable-block.calculation').first();

		// Verify the calculation line contains token spans
		const calcLine = firstCalcBlock.locator('.calculation-line');
		await expect(calcLine).toBeVisible();

		// Check for token type spans (these are the actual syntax-highlighted elements)
		const tokenIdentifiers = await calcLine.locator('[class*="token-identifier"]').count();
		const tokenNumbers = await calcLine.locator('[class*="token-number"]').count();
		const tokenOperators = await calcLine.locator('[class*="token-operator"]').count();

		// At least one token type should be present
		const totalTokens = tokenIdentifiers + tokenNumbers + tokenOperators;
		expect(totalTokens).toBeGreaterThan(0);

		console.log(`Token counts: identifiers=${tokenIdentifiers}, numbers=${tokenNumbers}, operators=${tokenOperators}`);
	});

	test('token spans have proper CSS classes', async ({ page }) => {
		const firstCalcBlock = page.locator('.editable-block.calculation').first();
		const calcLine = firstCalcBlock.locator('.calculation-line');

		// Check that token-identifier class exists
		const identifierToken = calcLine.locator('[class*="token-identifier"]').first();
		if (await identifierToken.count() > 0) {
			await expect(identifierToken).toBeVisible();
			const className = await identifierToken.getAttribute('class');
			expect(className).toContain('token-identifier');
			console.log(`✓ Identifier token class: ${className}`);
		}

		// Check that token-number class exists
		const numberToken = calcLine.locator('[class*="token-number"]').first();
		if (await numberToken.count() > 0) {
			await expect(numberToken).toBeVisible();
			const className = await numberToken.getAttribute('class');
			expect(className).toContain('token-number');
			console.log(`✓ Number token class: ${className}`);
		}

		// Check that token-operator class exists
		const operatorToken = calcLine.locator('[class*="token-operator"]').first();
		if (await operatorToken.count() > 0) {
			await expect(operatorToken).toBeVisible();
			const className = await operatorToken.getAttribute('class');
			expect(className).toContain('token-operator');
			console.log(`✓ Operator token class: ${className}`);
		}
	});

	test('tokens are wrapped in tooltip containers', async ({ page }) => {
		const firstCalcBlock = page.locator('.editable-block.calculation').first();
		const calcLine = firstCalcBlock.locator('.calculation-line');

		// Verify tooltip containers exist
		const tooltipContainers = await calcLine.locator('.tooltip-container').count();
		expect(tooltipContainers).toBeGreaterThan(0);

		// Verify each tooltip container has a token span inside
		const firstTooltip = calcLine.locator('.tooltip-container').first();
		const tokenSpan = firstTooltip.locator('[class*="token-"]');
		await expect(tokenSpan).toBeVisible();

		console.log(`✓ Found ${tooltipContainers} tooltip containers with token spans`);
	});

	test('tokens have color styling applied', async ({ page }) => {
		const firstCalcBlock = page.locator('.editable-block.calculation').first();
		const calcLine = firstCalcBlock.locator('.calculation-line');

		// Find a token (any token type)
		const tokenSpan = calcLine.locator('[class*="token-"]').first();
		await expect(tokenSpan).toBeVisible();

		// Get computed color
		const color = await tokenSpan.evaluate((el) => window.getComputedStyle(el).color);

		// Token should have a color (not transparent or default black)
		expect(color).toBeTruthy();
		expect(color).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent

		// Most syntax highlighting uses non-black colors, but we'll just verify it has a color set
		console.log(`✓ Token has color: ${color}`);
	});

	test('verifies complete token structure for first calculation', async ({ page }) => {
		const firstCalcBlock = page.locator('.editable-block.calculation').first();
		const calcLine = firstCalcBlock.locator('.calculation-line');

		// Get all token spans
		const allTokens = calcLine.locator('[class*="token-"]');
		const tokenCount = await allTokens.count();

		expect(tokenCount).toBeGreaterThan(0);

		// Verify each token has text content
		for (let i = 0; i < tokenCount; i++) {
			const token = allTokens.nth(i);
			const text = await token.textContent();
			const className = await token.getAttribute('class');

			expect(text).toBeTruthy();
			expect(className).toMatch(/token-(identifier|number|operator|keyword|assign|unit|comment|string)/);

			console.log(`Token ${i + 1}: "${text}" (${className})`);
		}
	});
});
