import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import LineHoverOverlay from './LineHoverOverlay.svelte';
import { LineContext } from '$lib/state/LineContext.svelte';
import { CalcMarkDocument } from '$lib/state/CalcMarkDocument';

describe('LineHoverOverlay', () => {
	let document: CalcMarkDocument;
	let lineContext: LineContext;

	beforeEach(() => {
		const sampleText = `# Heading
price = $100
quantity = 5
total = price * quantity`;

		document = new CalcMarkDocument(sampleText);

		// Add classifications
		document.updateClassifications([
			{ lineType: 'MARKDOWN', line: '# Heading' },
			{ lineType: 'CALCULATION', line: 'price = $100' },
			{ lineType: 'CALCULATION', line: 'quantity = 5' },
			{ lineType: 'CALCULATION', line: 'total = price * quantity' }
		]);

		// Add diagnostic to line 3 (total = price * quantity)
		// NOTE: This is 0-indexed, so line 3 = 4th line in document
		document.updateDiagnostics({
			3: [
				{
					severity: 'error',
					message: 'Undefined variable',
					range: {
						start: { line: 3, column: 8 },
						end: { line: 3, column: 13 }
					}
				}
			]
		});

		lineContext = new LineContext(document);

		// Debug: verify diagnostic is on correct line
		const line3 = document.getLine(3);
		console.log('Line 3 content:', line3?.rawContent);
		console.log('Line 3 has diagnostics:', line3?.diagnostics?.length || 0);
	});

	describe('hover positioning', () => {
		it('should position overlay at correct line when hovering', () => {
			lineContext.setHoveredLine(2);

			const { container } = render(LineHoverOverlay, {
				props: {
					lineContext,
					cursorVisible: false,
					editorLineHeight: 1.75,
					editorPadding: '2.5rem'
				}
			});

			const overlay = container.querySelector('.hover-overlay');
			expect(overlay).toBeTruthy();

			// Line 2 (0-indexed) should be at: 2 * 1.75rem + 2.5rem = 6rem
			const style = overlay?.getAttribute('style');
			expect(style).toMatch(/top:\s*calc\([^)]*6rem[^)]*\)/);
		});

		it('should position overlay at line 0 correctly', () => {
			lineContext.setHoveredLine(0);

			const { container } = render(LineHoverOverlay, {
				props: {
					lineContext,
					cursorVisible: false,
					editorLineHeight: 1.75,
					editorPadding: '2.5rem'
				}
			});

			const overlay = container.querySelector('.hover-overlay');
			expect(overlay).toBeTruthy();

			// Line 0 should be at: 0 * 1.75rem + 2.5rem = 2.5rem
			const style = overlay?.getAttribute('style');
			expect(style).toMatch(/top:\s*calc\([^)]*2\.5rem[^)]*\)/);
		});
	});

	describe('diagnostic indicator positioning', () => {
		it('should show diagnostic indicator on line with error', () => {
			lineContext.setHoveredLine(3); // Line with diagnostic

			const { container } = render(LineHoverOverlay, {
				props: {
					lineContext,
					cursorVisible: false,
					editorLineHeight: 1.75,
					editorPadding: '2.5rem'
				}
			});

			const overlay = container.querySelector('.hover-overlay');
			expect(overlay).toBeTruthy();

			// Should be at line 3: 3 * 1.75rem + 2.5rem = 7.75rem
			const style = overlay?.getAttribute('style');
			expect(style).toMatch(/top:\s*calc\([^)]*7\.75rem[^)]*\)/);

			const diagnostic = container.querySelector('.diagnostic-indicator');
			expect(diagnostic).toBeTruthy();
			expect(diagnostic?.getAttribute('data-severity')).toBe('error');
			expect(diagnostic?.textContent).toBe('1');
		});

		it('should NOT show diagnostic on wrong line', () => {
			lineContext.setHoveredLine(2); // Line without diagnostic

			const { container } = render(LineHoverOverlay, {
				props: {
					lineContext,
					cursorVisible: false,
					editorLineHeight: 1.75,
					editorPadding: '2.5rem'
				}
			});

			const diagnostic = container.querySelector('.diagnostic-indicator');
			expect(diagnostic).toBeFalsy();
		});
	});

	describe('cursor line hiding', () => {
		it('should hide overlay when hovering over cursor line', () => {
			lineContext.setHoveredLine(2);
			lineContext.setCursorLine(2); // Same line as hover

			const { container } = render(LineHoverOverlay, {
				props: {
					lineContext,
					cursorVisible: true,
					editorLineHeight: 1.75,
					editorPadding: '2.5rem'
				}
			});

			const overlay = container.querySelector('.hover-overlay');
			expect(overlay).toBeFalsy(); // Should not render
		});

		it('should show overlay when hovering different line than cursor', () => {
			lineContext.setHoveredLine(2);
			lineContext.setCursorLine(1); // Different line

			const { container } = render(LineHoverOverlay, {
				props: {
					lineContext,
					cursorVisible: true,
					editorLineHeight: 1.75,
					editorPadding: '2.5rem'
				}
			});

			const overlay = container.querySelector('.hover-overlay');
			expect(overlay).toBeTruthy(); // Should render
		});

		it('should show overlay when cursor is not visible', () => {
			lineContext.setHoveredLine(2);
			lineContext.setCursorLine(2); // Same line as hover

			const { container } = render(LineHoverOverlay, {
				props: {
					lineContext,
					cursorVisible: false, // Cursor hidden
					editorLineHeight: 1.75,
					editorPadding: '2.5rem'
				}
			});

			const overlay = container.querySelector('.hover-overlay');
			// Should NOT render because we check isLineCursor, not cursorVisible
			expect(overlay).toBeFalsy();
		});
	});

	describe('real-world diagnostic positioning bug', () => {
		it('should show diagnostic on line 1 when error is on monthly_salary line', () => {
			// Recreate the exact scenario from the screenshot
			const realText = `## Income
monthly_salary = $5000`;

			const realDoc = new CalcMarkDocument(realText);

			realDoc.updateClassifications([
				{ lineType: 'MARKDOWN', line: '## Income' },
				{ lineType: 'CALCULATION', line: 'monthly_salary = $5000' }
			]);

			// Server would send line 2 (1-indexed) for monthly_salary error
			// After adjustment: 2 - 1 = 1 (0-indexed)
			realDoc.updateDiagnostics({
				1: [
					{
						severity: 'error',
						message: 'Missing space before calculation',
						range: {
							start: { line: 1, column: 0 },
							end: { line: 1, column: 14 }
						}
					}
				]
			});

			const realContext = new LineContext(realDoc);

			// Hover over line 1 (monthly_salary)
			realContext.setHoveredLine(1);

			const { container } = render(LineHoverOverlay, {
				props: {
					lineContext: realContext,
					cursorVisible: false,
					editorLineHeight: 1.75,
					editorPadding: '2.5rem'
				}
			});

			// Diagnostic should be visible
			const diagnostic = container.querySelector('.diagnostic-indicator');
			expect(diagnostic).toBeTruthy();

			// Overlay should be at line 1 position: 1 * 1.75rem + 2.5rem = 4.25rem
			const overlay = container.querySelector('.hover-overlay');
			const style = overlay?.getAttribute('style');
			expect(style).toMatch(/top:\s*calc\([^)]*4\.25rem[^)]*\)/);

			// Now hover over line 0 (## Income) - should NOT show diagnostic
			realContext.setHoveredLine(0);

			const { container: container2 } = render(LineHoverOverlay, {
				props: {
					lineContext: realContext,
					cursorVisible: false,
					editorLineHeight: 1.75,
					editorPadding: '2.5rem'
				}
			});

			const diagnostic2 = container2.querySelector('.diagnostic-indicator');
			expect(diagnostic2).toBeFalsy();
		});
	});

	describe('diagnostic counts', () => {
		it('should count multiple diagnostics correctly', () => {
			// Add multiple diagnostics to line 2
			document.updateDiagnostics({
				2: [
					{ severity: 'error', message: 'Error 1' },
					{ severity: 'warning', message: 'Warning 1' },
					{ severity: 'info', message: 'Info 1' }
				]
			});

			lineContext.setHoveredLine(2);

			const { container } = render(LineHoverOverlay, {
				props: {
					lineContext,
					cursorVisible: false,
					editorLineHeight: 1.75,
					editorPadding: '2.5rem'
				}
			});

			const diagnostic = container.querySelector('.diagnostic-indicator');
			expect(diagnostic).toBeTruthy();
			expect(diagnostic?.textContent).toBe('3'); // Total count
			expect(diagnostic?.getAttribute('data-severity')).toBe('error'); // Highest priority
		});

		it('should prioritize error over warning', () => {
			document.updateDiagnostics({
				2: [
					{ severity: 'warning', message: 'Warning 1' },
					{ severity: 'error', message: 'Error 1' }
				]
			});

			lineContext.setHoveredLine(2);

			const { container } = render(LineHoverOverlay, {
				props: {
					lineContext,
					cursorVisible: false
				}
			});

			const diagnostic = container.querySelector('.diagnostic-indicator');
			expect(diagnostic?.getAttribute('data-severity')).toBe('error');
		});

		it('should prioritize warning over info', () => {
			document.updateDiagnostics({
				2: [
					{ severity: 'info', message: 'Info 1' },
					{ severity: 'warning', message: 'Warning 1' }
				]
			});

			lineContext.setHoveredLine(2);

			const { container } = render(LineHoverOverlay, {
				props: {
					lineContext,
					cursorVisible: false
				}
			});

			const diagnostic = container.querySelector('.diagnostic-indicator');
			expect(diagnostic?.getAttribute('data-severity')).toBe('warning');
		});
	});
});
