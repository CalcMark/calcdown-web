import { test, expect } from '@playwright/test';

test.describe('Calculation Block Layout', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.processing-indicator', { state: 'hidden', timeout: 10000 });
		await page.waitForTimeout(500);
	});

	test('calculation line should have only ONE blue left border', async ({ page }) => {
		const firstCalcBlock = page.locator('.editable-block.calculation').first();

		// Get all elements with a left border in the calculation block
		const elementsWithLeftBorder = await firstCalcBlock.evaluate((block) => {
			const allElements = block.querySelectorAll('*');
			const withBorder = [];

			allElements.forEach((el) => {
				const styles = window.getComputedStyle(el);
				const borderLeft = styles.borderLeftWidth;
				const borderColor = styles.borderLeftColor;

				// Check if it has a visible left border (not 0px and not transparent)
				if (
					borderLeft &&
					borderLeft !== '0px' &&
					borderColor &&
					borderColor !== 'rgba(0, 0, 0, 0)'
				) {
					withBorder.push({
						tag: el.tagName,
						classes: el.className,
						borderWidth: borderLeft,
						borderColor: borderColor
					});
				}
			});

			return withBorder;
		});

		console.log('Elements with left border:', elementsWithLeftBorder);

		// Should have exactly ONE element with a blue left border
		expect(elementsWithLeftBorder.length).toBe(1);
	});

	test('consecutive calculation lines should have NO visual gap (appear as one block)', async ({
		page
	}) => {
		// Find the first two consecutive calculation blocks
		const allCalcBlocks = page.locator('.editable-block.calculation');
		const count = await allCalcBlocks.count();

		console.log(`Total calculation blocks: ${count}`);

		if (count < 2) {
			throw new Error('Need at least 2 calculation blocks to test');
		}

		// Check if first two are adjacent in the document
		const areSiblings = await page.evaluate(() => {
			const blocks = document.querySelectorAll('.editable-block.calculation');
			if (blocks.length < 2) return false;
			return blocks[0].nextElementSibling === blocks[1];
		});

		console.log('Are siblings:', areSiblings);

		if (areSiblings) {
			// Get the actual calculation-line elements inside the blocks
			const firstCalcLine = page
				.locator('.editable-block.calculation')
				.nth(0)
				.locator('.calculation-line');
			const secondCalcLine = page
				.locator('.editable-block.calculation')
				.nth(1)
				.locator('.calculation-line');

			const firstBox = await firstCalcLine.boundingBox();
			const secondBox = await secondCalcLine.boundingBox();

			console.log('First calculation-line position:', firstBox);
			console.log('Second calculation-line position:', secondBox);

			if (firstBox && secondBox) {
				const gap = secondBox.y - (firstBox.y + firstBox.height);
				console.log('Visual gap between calculation lines:', gap);

				// Expected: Consecutive calculation lines should have NO gap
				// They should appear as one visual block
				expect(gap).toBe(0);
			}
		}
	});

	test('calculation blocks should have correct rounded corners based on grouping', async ({
		page
	}) => {
		// Find calculation lines and check their border-radius
		const borderRadii = await page.evaluate(() => {
			const calcLines = document.querySelectorAll('.editable-block.calculation .calculation-line');
			const results = [];

			calcLines.forEach((line, index) => {
				const styles = window.getComputedStyle(line);
				results.push({
					index,
					borderTopLeftRadius: styles.borderTopLeftRadius,
					borderBottomLeftRadius: styles.borderBottomLeftRadius,
					borderTopRightRadius: styles.borderTopRightRadius,
					borderBottomRightRadius: styles.borderBottomRightRadius,
					// Get parent to check if it's adjacent to other calculation blocks
					prevIsCalculation:
						line
							.closest('.editable-block')
							?.previousElementSibling?.classList.contains('calculation') || false,
					nextIsCalculation:
						line
							.closest('.editable-block')
							?.nextElementSibling?.classList.contains('calculation') || false
				});
			});

			return results;
		});

		console.log('Border radii for calculation lines:', borderRadii);

		// Find the first group of consecutive calculations
		let firstGroupStart = -1;
		let firstGroupEnd = -1;

		for (let i = 0; i < borderRadii.length; i++) {
			const item = borderRadii[i];
			if (!item.prevIsCalculation) {
				firstGroupStart = i;
				// Find the end of this group
				for (let j = i; j < borderRadii.length; j++) {
					if (!borderRadii[j].nextIsCalculation) {
						firstGroupEnd = j;
						break;
					}
				}
				break;
			}
		}

		if (firstGroupStart !== -1 && firstGroupEnd !== -1) {
			console.log(`First group: ${firstGroupStart} to ${firstGroupEnd}`);

			// First calculation in group should have top-left rounded
			expect(borderRadii[firstGroupStart].borderTopLeftRadius).toBe('4px');

			// Last calculation in group should have bottom-left rounded
			expect(borderRadii[firstGroupEnd].borderBottomLeftRadius).toBe('4px');

			// All should have right side rounded
			expect(borderRadii[firstGroupStart].borderTopRightRadius).toBe('4px');
			expect(borderRadii[firstGroupStart].borderBottomRightRadius).toBe('4px');
		}
	});

	test('single calculation line should not have nested border containers', async ({ page }) => {
		const firstCalcBlock = page.locator('.editable-block.calculation').first();

		// Check the DOM structure for nested divs with borders
		const nestedBorderDivs = await firstCalcBlock.evaluate((block) => {
			const divs = block.querySelectorAll('div');
			const structure = [];

			divs.forEach((div) => {
				const styles = window.getComputedStyle(div);
				const borderLeft = styles.borderLeftWidth;
				const borderColor = styles.borderLeftColor;

				if (borderLeft && borderLeft !== '0px') {
					// Check if this div is nested inside another div with a border
					let parent = div.parentElement;
					let hasParentWithBorder = false;

					while (parent && parent !== block) {
						const parentStyles = window.getComputedStyle(parent);
						const parentBorderLeft = parentStyles.borderLeftWidth;

						if (parentBorderLeft && parentBorderLeft !== '0px') {
							hasParentWithBorder = true;
							break;
						}
						parent = parent.parentElement;
					}

					structure.push({
						classes: div.className,
						borderWidth: borderLeft,
						borderColor: borderColor,
						hasParentWithBorder: hasParentWithBorder
					});
				}
			});

			return structure;
		});

		console.log('Nested border divs:', nestedBorderDivs);

		// No div with a border should be nested inside another div with a border
		const nestedCount = nestedBorderDivs.filter((d) => d.hasParentWithBorder).length;
		expect(nestedCount).toBe(0);
	});
});
