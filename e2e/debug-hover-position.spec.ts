import { test, expect } from '@playwright/test';

test('debug hover overlay position', async ({ page }) => {
	await page.goto('/wysiwyg');
	await page.waitForTimeout(1000);

	// First, let's check what line we're actually looking at
	const lineContent = await page.locator('[data-line="6"]').first().textContent();
	console.log('Line 6 content:', lineContent);

	// Get measurements BEFORE hover
	const lineInfo = await page.locator('[data-line="6"]').first().evaluate((el) => {
		const rect = el.getBoundingClientRect();
		return {
			top: rect.top,
			left: rect.left,
			height: rect.height,
			className: el.className
		};
	});

	console.log('Line element (data-line="6") BEFORE hover:', lineInfo);

	// Get container position
	const containerInfo = await page.locator('.wysiwyg-container').evaluate((el) => {
		const rect = el.getBoundingClientRect();
		return {
			top: rect.top,
			left: rect.left
		};
	});

	console.log('Container (.wysiwyg-container):', containerInfo);

	// Calculate expected position
	const expectedTop = lineInfo.top - containerInfo.top;
	console.log('Expected hover overlay top (lineTop - containerTop):', expectedTop + 'px');

	// Now actually HOVER using Playwright's hover action
	await page.locator('[data-line="6"]').first().hover({ force: true });
	await page.waitForTimeout(500);

	// Check measurements AFTER hover
	const lineInfoAfter = await page.locator('[data-line="6"]').first().evaluate((el) => {
		const rect = el.getBoundingClientRect();
		return {
			top: rect.top,
			left: rect.left
		};
	});
	console.log('Line element (data-line="6") AFTER hover:', lineInfoAfter);

	// Check if hover overlay exists
	const hoverOverlay = page.locator('.hover-overlay');
	const hoverExists = await hoverOverlay.count();

	console.log('Hover overlay exists?', hoverExists > 0);

	if (hoverExists > 0) {
		const hoverInfo = await hoverOverlay.evaluate((el) => {
			const style = window.getComputedStyle(el);
			const rect = el.getBoundingClientRect();
			const parent = el.parentElement;
			const parentRect = parent?.getBoundingClientRect();
			return {
				topStyle: style.top,
				topRect: rect.top,
				display: style.display,
				visibility: style.visibility,
				position: style.position,
				parentClass: parent?.className,
				parentTop: parentRect?.top
			};
		});

		console.log('Hover overlay info:', hoverInfo);
		console.log('DIFFERENCE from expected:', parseFloat(hoverInfo.topStyle) - expectedTop);

		// Also check the context that triggered this
		const contextInfo = await page.evaluate(() => {
			// @ts-ignore
			const debugInfo = window.__hoverDebug;
			return debugInfo;
		});
		console.log('Context debug info:', contextInfo);
	}

	// Take screenshot for visual verification
	await page.screenshot({ path: 'test-results/hover-debug.png', fullPage: true });
});
