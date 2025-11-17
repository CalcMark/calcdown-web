import { describe, it, expect, beforeEach } from 'vitest';
import { LineContext } from './LineContext.svelte';
import { CalcMarkDocument } from './CalcMarkDocument';

describe('LineContext', () => {
	let document: CalcMarkDocument;
	let lineContext: LineContext;

	beforeEach(() => {
		// Create a document with sample content
		const sampleText = `# Heading
price = $100
quantity = 5
total = price * quantity`;

		document = new CalcMarkDocument(sampleText);

		// Simulate some classifications and tokens
		document.updateClassifications([
			{ lineType: 'MARKDOWN', line: '# Heading' },
			{ lineType: 'CALCULATION', line: 'price = $100' },
			{ lineType: 'CALCULATION', line: 'quantity = 5' },
			{ lineType: 'CALCULATION', line: 'total = price * quantity' }
		]);

		// Add sample tokens to line 1
		document.updateTokens(1, [
			{ type: 'IDENTIFIER', value: 'price', start: 0, end: 5 },
			{ type: 'ASSIGN', value: '=', start: 6, end: 7 },
			{ type: 'CURRENCY', value: '$100', start: 8, end: 12 }
		]);

		lineContext = new LineContext(document);
	});

	describe('hover state management', () => {
		it('should start with no hovered line', () => {
			expect(lineContext.getHoveredLineNumber()).toBe(null);
		});

		it('should set and get hovered line number', () => {
			lineContext.setHoveredLine(2);
			expect(lineContext.getHoveredLineNumber()).toBe(2);
		});

		it('should clear hovered line when set to null', () => {
			lineContext.setHoveredLine(2);
			lineContext.setHoveredLine(null);
			expect(lineContext.getHoveredLineNumber()).toBe(null);
		});

		it('should detect if a specific line is hovered', () => {
			lineContext.setHoveredLine(2);
			expect(lineContext.isLineHovered(2)).toBe(true);
			expect(lineContext.isLineHovered(3)).toBe(false);
		});
	});

	describe('cursor state management', () => {
		it('should start with no cursor line', () => {
			expect(lineContext.getCursorLineNumber()).toBe(null);
		});

		it('should set and get cursor line number', () => {
			lineContext.setCursorLine(1);
			expect(lineContext.getCursorLineNumber()).toBe(1);
		});

		it('should detect if a specific line has cursor', () => {
			lineContext.setCursorLine(1);
			expect(lineContext.isLineCursor(1)).toBe(true);
			expect(lineContext.isLineCursor(2)).toBe(false);
		});
	});

	describe('getCurrentContext', () => {
		it('should return null context when no hover or cursor', () => {
			const context = lineContext.getCurrentContext;
			expect(context.lineNumber).toBe(null);
			expect(context.line).toBe(null);
		});

		it('should return cursor line context when only cursor is set', () => {
			lineContext.setCursorLine(1);
			const context = lineContext.getCurrentContext;

			expect(context.lineNumber).toBe(1);
			expect(context.line).not.toBe(null);
			expect(context.line?.rawContent).toBe('price = $100');
			expect(context.line?.classification).toBe('CALCULATION');
		});

		it('should return hover line context when only hover is set', () => {
			lineContext.setHoveredLine(2);
			const context = lineContext.getCurrentContext;

			expect(context.lineNumber).toBe(2);
			expect(context.line).not.toBe(null);
			expect(context.line?.rawContent).toBe('quantity = 5');
			expect(context.line?.classification).toBe('CALCULATION');
		});

		it('should prioritize hover over cursor when both are set', () => {
			lineContext.setCursorLine(1);
			lineContext.setHoveredLine(2);
			const context = lineContext.getCurrentContext;

			expect(context.lineNumber).toBe(2);
			expect(context.line?.rawContent).toBe('quantity = 5');
		});

		it('should include tokens when available', () => {
			lineContext.setHoveredLine(1);
			const context = lineContext.getCurrentContext;

			expect(context.line?.tokens).toBeDefined();
			expect(context.line?.tokens).toHaveLength(3);
			expect(context.line?.tokens?.[0].type).toBe('IDENTIFIER');
			expect(context.line?.tokens?.[1].type).toBe('ASSIGN');
			expect(context.line?.tokens?.[2].type).toBe('CURRENCY');
		});

		it('should include classification', () => {
			lineContext.setHoveredLine(0);
			const context = lineContext.getCurrentContext;

			expect(context.line?.classification).toBe('MARKDOWN');
		});
	});

	describe('getContextForLine', () => {
		it('should return context for a specific line number', () => {
			const context = lineContext.getContextForLine(3);

			expect(context.lineNumber).toBe(3);
			expect(context.line?.rawContent).toBe('total = price * quantity');
			expect(context.line?.classification).toBe('CALCULATION');
		});

		it('should return null line for invalid line number', () => {
			const context = lineContext.getContextForLine(999);

			expect(context.lineNumber).toBe(999);
			expect(context.line).toBe(null);
		});

		it('should work independently of hover/cursor state', () => {
			lineContext.setHoveredLine(1);
			lineContext.setCursorLine(2);

			const context = lineContext.getContextForLine(3);
			expect(context.lineNumber).toBe(3);
			expect(context.line?.rawContent).toBe('total = price * quantity');
		});
	});

	describe('type safety and structure', () => {
		it('should return proper Line interface with all fields', () => {
			lineContext.setHoveredLine(1);
			const context = lineContext.getCurrentContext;

			// Check that Line interface fields are present
			expect(context.line).toHaveProperty('lineNumber');
			expect(context.line).toHaveProperty('rawContent');
			expect(context.line).toHaveProperty('classification');
			expect(context.line).toHaveProperty('tokens');
		});

		it('should handle lines with diagnostics when added', () => {
			// Add a diagnostic to line 1
			document.updateDiagnostics({
				1: [
					{
						severity: 'error',
						message: 'Test error',
						range: {
							start: { line: 1, column: 0 },
							end: { line: 1, column: 5 }
						}
					}
				]
			});

			lineContext.setHoveredLine(1);
			const context = lineContext.getCurrentContext;

			expect(context.line?.diagnostics).toBeDefined();
			expect(context.line?.diagnostics).toHaveLength(1);
			expect(context.line?.diagnostics?.[0].severity).toBe('error');
			expect(context.line?.diagnostics?.[0].message).toBe('Test error');
		});

		it('should handle lines with calculation results when added', () => {
			// Add evaluation result to line 1
			document.updateEvaluationResults(
				[
					{
						OriginalLine: 2, // 1-indexed from server
						Value: { Value: 100, Symbol: '$' },
						Symbol: '$',
						SourceFormat: '$100'
					}
				],
				{},
				0
			);

			lineContext.setHoveredLine(1);
			const context = lineContext.getCurrentContext;

			expect(context.line?.calculationResult).toBeDefined();
			expect(context.line?.calculationResult?.Value.Value).toBe(100);
			expect(context.line?.calculationResult?.Value.Symbol).toBe('$');
		});
	});
});
