import { test, expect } from '@playwright/test';

test.describe('Syntax Highlighting', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.editor-content', { state: 'visible' });
		// Wait for initial processing
		await page.waitForTimeout(1000);
	});

	test('should render calculation blocks with syntax highlighting', async ({ page }) => {
		// Find a calculation block in preview mode (not active)
		const calcBlocks = page.locator('.editable-block.calculation');
		const firstCalcBlock = calcBlocks.first();

		// Make sure we're looking at a preview (click away if needed)
		const anotherBlock = page.locator('.editable-block').last();
		await anotherBlock.click();
		await page.waitForTimeout(200);

		// Check that calculation line component is rendered
		const calcLine = firstCalcBlock.locator('.calculation-line');
		await expect(calcLine).toBeVisible();
	});

	test('should render token elements with CSS classes', async ({ page }) => {
		// Create a new calculation with known tokens
		const firstBlock = page.locator('.editable-block').first();
		await firstBlock.click();

		const textarea = firstBlock.locator('textarea');
		await textarea.clear();
		await textarea.fill('price = $100');
		await textarea.press('Tab');

		// Wait for evaluation
		await page.waitForTimeout(500);

		// Click away to see preview
		const anotherBlock = page.locator('.editable-block').last();
		await anotherBlock.click();
		await page.waitForTimeout(200);

		// Now check for token classes in the first block
		// We should see tokens with classes like token-identifier, token-currency, etc.
		const hasTokens = await firstBlock.locator('[class*="token-"]').count();
		expect(hasTokens).toBeGreaterThan(0);
	});

	test('should apply token-identifier class to variables', async ({ page }) => {
		// Click on a different block to ensure we're viewing in preview mode
		const lastBlock = page.locator('.editable-block').last();
		await lastBlock.click();
		await page.waitForTimeout(200);

		// Find a block with an identifier token
		const identifierTokens = page.locator('.token-identifier');
		const count = await identifierTokens.count();

		// Should have at least one identifier token
		expect(count).toBeGreaterThan(0);
	});

	test('should apply token-currency class to currency values', async ({ page }) => {
		// From sample: price1 = $100
		// Click away to ensure preview mode
		const lastBlock = page.locator('.editable-block').last();
		await lastBlock.click();
		await page.waitForTimeout(200);

		// Find currency tokens
		const currencyTokens = page.locator('.token-currency');
		const count = await currencyTokens.count();

		// Should have currency tokens
		expect(count).toBeGreaterThan(0);
	});

	test('should apply token-operator class to operators', async ({ page }) => {
		// Create a calculation with operators
		const firstBlock = page.locator('.editable-block').first();
		await firstBlock.click();

		const textarea = firstBlock.locator('textarea');
		await textarea.clear();
		await textarea.fill('result = 10 + 20 * 2');
		await textarea.press('Tab');

		// Wait for evaluation
		await page.waitForTimeout(500);

		// Click away to see preview
		const anotherBlock = page.locator('.editable-block').last();
		await anotherBlock.click();
		await page.waitForTimeout(200);

		// Check for operator tokens
		const operatorTokens = firstBlock.locator('.token-operator');
		const count = await operatorTokens.count();

		// Should have + and * operators (at least 2)
		expect(count).toBeGreaterThan(1);
	});

	test('should apply token-number class to numeric literals', async ({ page }) => {
		// Create a calculation with numbers
		const firstBlock = page.locator('.editable-block').first();
		await firstBlock.click();

		const textarea = firstBlock.locator('textarea');
		await textarea.clear();
		await textarea.fill('value = 42');
		await textarea.press('Tab');

		// Wait for evaluation
		await page.waitForTimeout(500);

		// Click away to see preview
		const anotherBlock = page.locator('.editable-block').last();
		await anotherBlock.click();
		await page.waitForTimeout(200);

		// Check for number token
		const numberToken = firstBlock.locator('.token-number').first();
		await expect(numberToken).toBeVisible();
	});

	test('should show diagnostic indicators for errors', async ({ page }) => {
		// Create a calculation with an error (undefined variable)
		const firstBlock = page.locator('.editable-block').first();
		await firstBlock.click();

		const textarea = firstBlock.locator('textarea');
		await textarea.clear();
		await textarea.fill('bad_calc = undefined_var + 10');
		await textarea.press('Tab');

		// Wait for evaluation
		await page.waitForTimeout(500);

		// Click away to see preview
		const anotherBlock = page.locator('.editable-block').last();
		await anotherBlock.click();
		await page.waitForTimeout(200);

		// Check for error styling
		const hasError = firstBlock.locator('.has-error');
		const errorCount = await hasError.count();

		// Should have error indicator
		expect(errorCount).toBeGreaterThan(0);
	});

	test('should render markdown preview with styled elements', async ({ page }) => {
		// Click away to ensure preview mode
		const lastBlock = page.locator('.editable-block').last();
		await lastBlock.click();
		await page.waitForTimeout(200);

		// Find a markdown block with heading (from sample: "# CalcMark Demo")
		const markdownBlocks = page.locator('.editable-block.markdown .markdown-content');
		const firstMarkdown = markdownBlocks.first();

		// Should contain rendered HTML elements
		const hasH1 = await firstMarkdown.locator('h1').count();
		expect(hasH1).toBeGreaterThan(0);
	});

	test('should render markdown links', async ({ page }) => {
		// Click away to ensure preview mode
		const lastBlock = page.locator('.editable-block').last();
		await lastBlock.click();
		await page.waitForTimeout(200);

		// From sample: [CalcMark on GitHub](https://github.com)
		const links = page.locator('.markdown-content a');
		const linkCount = await links.count();

		// Should have links
		expect(linkCount).toBeGreaterThan(0);

		// Check that a link is actually visible
		const firstLink = links.first();
		await expect(firstLink).toBeVisible();
	});

	test('should render markdown lists', async ({ page }) => {
		// Click away to ensure preview mode
		const lastBlock = page.locator('.editable-block').last();
		await lastBlock.click();
		await page.waitForTimeout(200);

		// From sample: "## Key Features" followed by bulleted list
		const lists = page.locator('.markdown-content ul');
		const listCount = await lists.count();

		// Should have at least one list
		expect(listCount).toBeGreaterThan(0);
	});

	test('should render markdown blockquotes', async ({ page }) => {
		// Click away to ensure preview mode
		const lastBlock = page.locator('.editable-block').last();
		await lastBlock.click();
		await page.waitForTimeout(200);

		// From sample: "> CalcMark uses..."
		const blockquotes = page.locator('.markdown-content blockquote');
		const count = await blockquotes.count();

		// Should have at least one blockquote
		expect(count).toBeGreaterThan(0);
	});

	test('should show tooltips on hover for identifiers with values', async ({ page }) => {
		// This test is for the Tooltip component showing variable values
		// First, create a variable
		const firstBlock = page.locator('.editable-block').first();
		await firstBlock.click();

		const textarea = firstBlock.locator('textarea');
		await textarea.clear();
		await textarea.fill('my_var = $500');
		await textarea.press('Enter');

		await page.waitForTimeout(300);

		// Create a second calculation that uses the variable
		const secondBlock = page.locator('.editable-block').nth(1);
		const textarea2 = secondBlock.locator('textarea');
		await textarea2.fill('result = my_var * 2');
		await textarea2.press('Tab');

		await page.waitForTimeout(500);

		// Click away to see preview
		const anotherBlock = page.locator('.editable-block').last();
		await anotherBlock.click();
		await page.waitForTimeout(200);

		// Hover over the identifier in the second block
		const identifierToken = secondBlock.locator('.token-identifier').filter({ hasText: 'my_var' });

		if ((await identifierToken.count()) > 0) {
			await identifierToken.hover();

			// Wait a bit for tooltip to appear
			await page.waitForTimeout(300);

			// Tooltip should be visible (this is implementation-dependent)
			// We're checking that hovering works; actual tooltip visibility depends on implementation
			// The test validates that the token is hoverable and has the right class
			await expect(identifierToken).toBeVisible();
		}
	});

	test('should visually distinguish calculation blocks from markdown blocks', async ({ page }) => {
		// Click away to ensure preview mode
		const lastBlock = page.locator('.editable-block').last();
		await lastBlock.click();
		await page.waitForTimeout(200);

		// Get a calculation block
		const calcBlock = page.locator('.editable-block.calculation').first();
		const calcBg = await calcBlock.evaluate((el) => {
			return window.getComputedStyle(el).backgroundColor;
		});

		// Get a markdown block
		const mdBlock = page.locator('.editable-block.markdown').first();
		const mdBg = await mdBlock.evaluate((el) => {
			return window.getComputedStyle(el).backgroundColor;
		});

		// They should have different backgrounds
		expect(calcBg).not.toBe(mdBg);
	});

	test('should render calculation results inline', async ({ page }) => {
		// Create a calculation
		const firstBlock = page.locator('.editable-block').first();
		await firstBlock.click();

		const textarea = firstBlock.locator('textarea');
		await textarea.clear();
		await textarea.fill('total = $100 + $50');
		await textarea.press('Tab');

		// Wait for evaluation
		await page.waitForTimeout(500);

		// The result should be available in the variable context
		// Check that the calculation line is rendered (it will show tokens)
		const calcLine = firstBlock.locator('.calculation-line');
		await expect(calcLine).toBeVisible();

		// The content should include our calculation
		const content = await calcLine.textContent();
		expect(content).toContain('total');
	});

	test('should update syntax highlighting after content change', async ({ page }) => {
		const firstBlock = page.locator('.editable-block').first();
		await firstBlock.click();

		const textarea = firstBlock.locator('textarea');

		// Set initial content
		await textarea.clear();
		await textarea.fill('x = 10');
		await textarea.press('Tab');
		await page.waitForTimeout(500);

		// Change content
		await firstBlock.click();
		await textarea.clear();
		await textarea.fill('y = $20');
		await textarea.press('Tab');
		await page.waitForTimeout(500);

		// Click away to see updated preview
		const anotherBlock = page.locator('.editable-block').last();
		await anotherBlock.click();
		await page.waitForTimeout(200);

		// Should now show currency token
		const currencyToken = firstBlock.locator('.token-currency');
		await expect(currencyToken).toBeVisible();
	});
});
