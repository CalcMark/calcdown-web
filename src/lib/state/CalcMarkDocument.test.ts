import { describe, it, expect } from 'vitest';
import { CalcMarkDocument } from './CalcMarkDocument';
import type { EvaluationResult, Token, Diagnostic } from './CalcMarkDocument';

describe('CalcMarkDocument - Core State Management', () => {
	describe('Initialization', () => {
		it('initializes with empty text', () => {
			const doc = new CalcMarkDocument();
			expect(doc.getRawText()).toBe('');
			expect(doc.getLines()).toHaveLength(0);
		});

		it('initializes with provided text', () => {
			const doc = new CalcMarkDocument('Line 1\nLine 2\nLine 3');
			expect(doc.getRawText()).toBe('Line 1\nLine 2\nLine 3');
			expect(doc.getLines()).toHaveLength(3);
			expect(doc.getLines()[0].rawContent).toBe('Line 1');
			expect(doc.getLines()[1].rawContent).toBe('Line 2');
			expect(doc.getLines()[2].rawContent).toBe('Line 3');
		});

		it('assigns correct line numbers', () => {
			const doc = new CalcMarkDocument('Line 1\nLine 2\nLine 3');
			const lines = doc.getLines();

			expect(lines[0].lineNumber).toBe(0);
			expect(lines[1].lineNumber).toBe(1);
			expect(lines[2].lineNumber).toBe(2);
		});
	});

	describe('Text Updates', () => {
		it('updates raw text and re-parses lines', () => {
			const doc = new CalcMarkDocument('Initial');
			doc.updateRawText('Line 1\nLine 2\nLine 3');

			expect(doc.getRawText()).toBe('Line 1\nLine 2\nLine 3');
			expect(doc.getLines()).toHaveLength(3);
		});

		it('handles empty text update', () => {
			const doc = new CalcMarkDocument('Some text');
			doc.updateRawText('');

			expect(doc.getRawText()).toBe('');
			expect(doc.getLines()).toHaveLength(0);
		});

		it('handles single line', () => {
			const doc = new CalcMarkDocument();
			doc.updateRawText('Single line');

			expect(doc.getLines()).toHaveLength(1);
			expect(doc.getLines()[0].rawContent).toBe('Single line');
		});
	});

	describe('Classification Updates', () => {
		it('updates line classifications from server response', () => {
			const doc = new CalcMarkDocument('# Heading\nx = 5\nSome text');

			const classifications = [
				{ lineType: 'MARKDOWN' as const, line: '# Heading' },
				{ lineType: 'CALCULATION' as const, line: 'x = 5' },
				{ lineType: 'MARKDOWN' as const, line: 'Some text' }
			];

			doc.updateClassifications(classifications);

			const lines = doc.getLines();
			expect(lines[0].classification).toBe('MARKDOWN');
			expect(lines[1].classification).toBe('CALCULATION');
			expect(lines[2].classification).toBe('MARKDOWN');
		});

		it('handles mismatched classification count gracefully', () => {
			const doc = new CalcMarkDocument('Line 1\nLine 2\nLine 3');

			const classifications = [
				{ lineType: 'MARKDOWN' as const, line: 'Line 1' },
				{ lineType: 'CALCULATION' as const, line: 'Line 2' }
				// Missing Line 3
			];

			doc.updateClassifications(classifications);

			const lines = doc.getLines();
			expect(lines[0].classification).toBe('MARKDOWN');
			expect(lines[1].classification).toBe('CALCULATION');
			expect(lines[2].classification).toBeNull(); // Unchanged
		});
	});

	describe('Token Updates', () => {
		it('updates tokens for a specific line', () => {
			const doc = new CalcMarkDocument('x = 5 + 3');

			const tokens: Token[] = [
				{ type: 'IDENTIFIER', value: 'x', start: 0, end: 1 },
				{ type: 'ASSIGN', value: '=', start: 2, end: 3 },
				{ type: 'NUMBER', value: '5', start: 4, end: 5 },
				{ type: 'PLUS', value: '+', start: 6, end: 7 },
				{ type: 'NUMBER', value: '3', start: 8, end: 9 }
			];

			doc.updateTokens(0, tokens);

			const line = doc.getLine(0);
			expect(line?.tokens).toEqual(tokens);
		});

		it('handles tokens for multiple lines', () => {
			const doc = new CalcMarkDocument('x = 5\ny = 10');

			doc.updateTokens(0, [{ type: 'IDENTIFIER', value: 'x', start: 0, end: 1 }]);
			doc.updateTokens(1, [{ type: 'IDENTIFIER', value: 'y', start: 0, end: 1 }]);

			expect(doc.getLine(0)?.tokens).toHaveLength(1);
			expect(doc.getLine(1)?.tokens).toHaveLength(1);
		});
	});

	describe('Diagnostic Updates', () => {
		it('updates diagnostics for multiple lines', () => {
			const doc = new CalcMarkDocument('x = undefined_var\ny = 10');

			const diagnostics: Record<number, Diagnostic[]> = {
				0: [
					{
						severity: 'error',
						message: 'Undefined variable: undefined_var',
						range: {
							start: { line: 0, column: 4 },
							end: { line: 0, column: 17 }
						}
					}
				]
			};

			doc.updateDiagnostics(diagnostics);

			const line0 = doc.getLine(0);
			expect(line0?.diagnostics).toHaveLength(1);
			expect(line0?.diagnostics?.[0].message).toBe('Undefined variable: undefined_var');

			const line1 = doc.getLine(1);
			expect(line1?.diagnostics).toBeUndefined();
		});
	});

	describe('Evaluation Results', () => {
		it('updates calculation results with correct line mapping', () => {
			const doc = new CalcMarkDocument('x = 5\ny = 10\nz = x + y');

			// Server returns 1-indexed line numbers
			const results: EvaluationResult[] = [
				{ OriginalLine: 1, Value: { Value: 5 } },
				{ OriginalLine: 2, Value: { Value: 10 } },
				{ OriginalLine: 3, Value: { Value: 15 } }
			];

			const variableContext = {
				x: results[0],
				y: results[1],
				z: results[2]
			};

			doc.updateEvaluationResults(results, variableContext, 0);

			expect(doc.getLine(0)?.calculationResult?.Value.Value).toBe(5);
			expect(doc.getLine(1)?.calculationResult?.Value.Value).toBe(10);
			expect(doc.getLine(2)?.calculationResult?.Value.Value).toBe(15);
		});

		it('applies offset when updating evaluation results', () => {
			const doc = new CalcMarkDocument('# Header\nLine 1\nx = 5\ny = 10');

			// Server evaluated lines 2-3 (offset = 2) and returns 1-indexed line numbers
			const results: EvaluationResult[] = [
				{ OriginalLine: 1, Value: { Value: 5 } }, // Server's line 1 = doc's line 2
				{ OriginalLine: 2, Value: { Value: 10 } } // Server's line 2 = doc's line 3
			];

			const variableContext = {
				x: results[0],
				y: results[1]
			};

			doc.updateEvaluationResults(results, variableContext, 2);

			// Lines 0-1 should have no results
			expect(doc.getLine(0)?.calculationResult).toBeUndefined();
			expect(doc.getLine(1)?.calculationResult).toBeUndefined();

			// Lines 2-3 should have results
			expect(doc.getLine(2)?.calculationResult?.Value.Value).toBe(5);
			expect(doc.getLine(3)?.calculationResult?.Value.Value).toBe(10);
		});

		it('clears previous results before updating', () => {
			const doc = new CalcMarkDocument('x = 5\ny = 10');

			// First evaluation (server returns 1-indexed)
			doc.updateEvaluationResults(
				[
					{ OriginalLine: 1, Value: { Value: 5 } },
					{ OriginalLine: 2, Value: { Value: 10 } }
				],
				{},
				0
			);

			// Second evaluation (user changed to "x = 100", server returns 1-indexed)
			doc.updateEvaluationResults([{ OriginalLine: 1, Value: { Value: 100 } }], {}, 0);

			expect(doc.getLine(0)?.calculationResult?.Value.Value).toBe(100);
			expect(doc.getLine(1)?.calculationResult).toBeUndefined(); // Cleared
		});

		it('stores variable context', () => {
			const doc = new CalcMarkDocument('x = 5');

			const variableContext = {
				x: { OriginalLine: 1, Value: { Value: 5, Symbol: '$' } }
			};

			doc.updateEvaluationResults([], variableContext, 0);

			expect(doc.getVariableContext()).toEqual(variableContext);
		});
	});

	describe('Viewport Management', () => {
		it('updates viewport range', () => {
			// Create document with 100 lines
			const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`);
			const doc = new CalcMarkDocument(lines.join('\n'));

			doc.updateViewport(10, 30);

			const range = doc.getEvaluationRange();
			// With default buffer of 10: start = 0 (10-10), end = 40 (30+10)
			expect(range.start).toBe(0);
			expect(range.end).toBe(40);
		});

		it('clamps evaluation range to document bounds', () => {
			const lines = Array.from({ length: 20 }, (_, i) => `line ${i}`);
			const doc = new CalcMarkDocument(lines.join('\n'));

			doc.updateViewport(15, 25); // Beyond document end

			const range = doc.getEvaluationRange();
			expect(range.start).toBe(5); // 15 - 10 = 5
			expect(range.end).toBe(19); // Clamped to 19 (20 lines, 0-indexed)
		});

		it('extracts text for evaluation with correct offset', () => {
			const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`);
			const doc = new CalcMarkDocument(lines.join('\n'));

			doc.updateViewport(20, 30);

			const { text, offset } = doc.getTextForEvaluation();

			// With buffer of 10: start = 10, end = 40
			expect(offset).toBe(10);

			const extractedLines = text.split('\n');
			expect(extractedLines).toHaveLength(31); // Lines 10-40 inclusive
			expect(extractedLines[0]).toBe('line 10');
			expect(extractedLines[30]).toBe('line 40');
		});
	});

	describe('Cursor Management', () => {
		it('sets and retrieves cursor position', () => {
			const doc = new CalcMarkDocument('Line 1\nLine 2\nLine 3');

			doc.setCursor(1, 5);
			const cursor = doc.getCursor();

			expect(cursor).toEqual({ line: 1, offset: 5 });
		});

		it('converts line+offset to absolute position', () => {
			const doc = new CalcMarkDocument('Line 1\nLine 2\nLine 3');

			// Line 0, offset 3 = position 3
			expect(doc.getAbsolutePosition(0, 3)).toBe(3);

			// Line 1, offset 0 = position 7 (6 chars + 1 newline from line 0)
			expect(doc.getAbsolutePosition(1, 0)).toBe(7);

			// Line 1, offset 3 = position 10
			expect(doc.getAbsolutePosition(1, 3)).toBe(10);

			// Line 2, offset 2 = position 16 (6+1+6+1+2)
			expect(doc.getAbsolutePosition(2, 2)).toBe(16);
		});

		it('converts absolute position to line+offset', () => {
			const doc = new CalcMarkDocument('Line 1\nLine 2\nLine 3');

			// Position 3 = line 0, offset 3
			expect(doc.getLineFromPosition(3)).toEqual({ line: 0, offset: 3 });

			// Position 7 = line 1, offset 0
			expect(doc.getLineFromPosition(7)).toEqual({ line: 1, offset: 0 });

			// Position 10 = line 1, offset 3
			expect(doc.getLineFromPosition(10)).toEqual({ line: 1, offset: 3 });

			// Position 100 (beyond end) = last line, end offset
			expect(doc.getLineFromPosition(100)).toEqual({ line: 2, offset: 6 });
		});
	});

	describe('Utilities', () => {
		it('returns line count', () => {
			const doc = new CalcMarkDocument('Line 1\nLine 2\nLine 3');
			expect(doc.getLineCount()).toBe(3);
		});

		it('retrieves specific line', () => {
			const doc = new CalcMarkDocument('Line 1\nLine 2\nLine 3');

			expect(doc.getLine(1)?.rawContent).toBe('Line 2');
			expect(doc.getLine(99)).toBeUndefined();
		});

		it('serializes to JSON for debugging', () => {
			const doc = new CalcMarkDocument('Line 1\nLine 2');
			const json = doc.toJSON();

			expect(json).toHaveProperty('rawText');
			expect(json).toHaveProperty('lines');
			expect(json).toHaveProperty('cursor');
			expect(json).toHaveProperty('viewport');
			expect(json).toHaveProperty('evaluationResults');
		});
	});

	describe('Unicode Handling', () => {
		it('converts token positions from runes to UTF-16 for emoji', () => {
			const doc = new CalcMarkDocument('🏠 = $1500');

			// Go WASM reports positions in runes
			// "🏠 = $1500"
			// Rune positions: 🏠(0), space(1), =(2), space(3), $(4), 1(5), 5(6), 0(7), 0(8)
			const tokens: Token[] = [
				{ type: 'IDENTIFIER', value: '🏠', start: 0, end: 1 }, // Rune 0-1
				{ type: 'ASSIGN', value: '=', start: 2, end: 3 }, // Rune 2-3
				{ type: 'CURRENCY', value: '$1500', start: 4, end: 9 } // Rune 4-9
			];

			doc.updateTokens(0, tokens);

			const utf16Tokens = doc.getTokenUtf16Positions(0);

			expect(utf16Tokens).toBeDefined();
			// 🏠 is a surrogate pair (2 UTF-16 code units)
			expect(utf16Tokens![0]).toEqual({
				type: 'IDENTIFIER',
				value: '🏠',
				start: 0, // UTF-16 position
				end: 2 // UTF-16 position (🏠 takes 2 code units)
			});

			expect(utf16Tokens![1]).toEqual({
				type: 'ASSIGN',
				value: '=',
				start: 3, // UTF-16 position (after 🏠 + space)
				end: 4
			});
		});

		it('converts token positions for Chinese characters', () => {
			const doc = new CalcMarkDocument('工资 = $5000');

			// Chinese characters are 1 rune = 1 UTF-16 code unit
			const tokens: Token[] = [
				{ type: 'IDENTIFIER', value: '工资', start: 0, end: 2 },
				{ type: 'ASSIGN', value: '=', start: 3, end: 4 },
				{ type: 'CURRENCY', value: '$5000', start: 5, end: 10 }
			];

			doc.updateTokens(0, tokens);

			const utf16Tokens = doc.getTokenUtf16Positions(0);

			expect(utf16Tokens).toBeDefined();
			expect(utf16Tokens![0]).toEqual({
				type: 'IDENTIFIER',
				value: '工资',
				start: 0,
				end: 2 // Chinese chars: 1 rune = 1 UTF-16 unit
			});
		});

		it('extracts token text correctly with emoji', () => {
			const doc = new CalcMarkDocument('🏠 = $1500');

			const token: Token = {
				type: 'IDENTIFIER',
				value: '🏠',
				start: 0,
				end: 1
			};

			doc.updateTokens(0, [token]);

			const text = doc.getTokenText(0, token);
			expect(text).toBe('🏠');
		});

		it('extracts token text correctly with mixed content', () => {
			const doc = new CalcMarkDocument('rent_🏠 = $1500');

			// "rent_🏠 = $1500"
			// Runes: r(0), e(1), n(2), t(3), _(4), 🏠(5), space(6), =(7)...
			const token: Token = {
				type: 'IDENTIFIER',
				value: 'rent_🏠',
				start: 0,
				end: 6 // Rune position
			};

			doc.updateTokens(0, [token]);

			const text = doc.getTokenText(0, token);
			expect(text).toBe('rent_🏠');
		});

		it('handles Arabic characters correctly', () => {
			const doc = new CalcMarkDocument('السعر = $100');

			// Arabic characters are 1 rune = 1 UTF-16 code unit
			const token: Token = {
				type: 'IDENTIFIER',
				value: 'السعر',
				start: 0,
				end: 5
			};

			doc.updateTokens(0, [token]);

			const text = doc.getTokenText(0, token);
			expect(text).toBe('السعر');
		});
	});

	describe('Integration - Full Workflow', () => {
		it('simulates complete edit → evaluate → render cycle', () => {
			// 1. Initialize with document
			const doc = new CalcMarkDocument(
				'# Budget\n\nincome = $5000\nexpenses = $3000\nleftover = income - expenses'
			);

			expect(doc.getLineCount()).toBe(5);

			// 2. Server classifies lines
			const classifications = [
				{ lineType: 'MARKDOWN' as const, line: '# Budget' },
				{ lineType: 'BLANK' as const, line: '' },
				{ lineType: 'CALCULATION' as const, line: 'income = $5000' },
				{ lineType: 'CALCULATION' as const, line: 'expenses = $3000' },
				{ lineType: 'CALCULATION' as const, line: 'leftover = income - expenses' }
			];

			doc.updateClassifications(classifications);

			// 3. Server tokenizes calculation lines
			doc.updateTokens(2, [
				{ type: 'IDENTIFIER', value: 'income', start: 0, end: 6 },
				{ type: 'ASSIGN', value: '=', start: 7, end: 8 },
				{ type: 'CURRENCY', value: '$5000', start: 9, end: 14 }
			]);

			doc.updateTokens(3, [
				{ type: 'IDENTIFIER', value: 'expenses', start: 0, end: 8 },
				{ type: 'ASSIGN', value: '=', start: 9, end: 10 },
				{ type: 'CURRENCY', value: '$3000', start: 11, end: 16 }
			]);

			// 4. Server evaluates (returns 1-indexed line numbers)
			// Line 2 (income) -> OriginalLine: 3
			// Line 3 (expenses) -> OriginalLine: 4
			// Line 4 (leftover) -> OriginalLine: 5
			const results: EvaluationResult[] = [
				{ OriginalLine: 3, Value: { Value: 5000, Symbol: '$' } },
				{ OriginalLine: 4, Value: { Value: 3000, Symbol: '$' } },
				{ OriginalLine: 5, Value: { Value: 2000, Symbol: '$' } }
			];

			const variableContext = {
				income: results[0],
				expenses: results[1],
				leftover: results[2]
			};

			doc.updateEvaluationResults(results, variableContext, 0);

			// 5. Verify state is correct for rendering
			const line0 = doc.getLine(0);
			expect(line0?.classification).toBe('MARKDOWN');
			expect(line0?.calculationResult).toBeUndefined();

			const line2 = doc.getLine(2);
			expect(line2?.classification).toBe('CALCULATION');
			expect(line2?.tokens).toHaveLength(3);
			expect(line2?.calculationResult?.Value.Value).toBe(5000);

			const line4 = doc.getLine(4);
			expect(line4?.calculationResult?.Value.Value).toBe(2000);

			expect(doc.getVariableContext()).toHaveProperty('leftover');
		});

		it('handles user editing mid-line and re-evaluation', () => {
			// 1. Initial state
			const doc = new CalcMarkDocument('x = 5\ny = 10');

			doc.updateClassifications([
				{ lineType: 'CALCULATION' as const, line: 'x = 5' },
				{ lineType: 'CALCULATION' as const, line: 'y = 10' }
			]);

			doc.updateEvaluationResults(
				[
					{ OriginalLine: 1, Value: { Value: 5 } },
					{ OriginalLine: 2, Value: { Value: 10 } }
				],
				{},
				0
			);

			// 2. User edits: "x = 5" → "x = 50"
			doc.updateRawText('x = 50\ny = 10');
			doc.setCursor(0, 6); // Cursor at end of line 0

			// 3. Re-classification (happens on server)
			doc.updateClassifications([
				{ lineType: 'CALCULATION' as const, line: 'x = 50' },
				{ lineType: 'CALCULATION' as const, line: 'y = 10' }
			]);

			// 4. Re-evaluation (server returns 1-indexed line numbers)
			doc.updateEvaluationResults(
				[
					{ OriginalLine: 1, Value: { Value: 50 } },
					{ OriginalLine: 2, Value: { Value: 10 } }
				],
				{},
				0
			);

			// 5. Verify updated state
			expect(doc.getLine(0)?.rawContent).toBe('x = 50');
			expect(doc.getLine(0)?.calculationResult?.Value.Value).toBe(50);

			// Cursor should still be tracked
			expect(doc.getCursor()).toEqual({ line: 0, offset: 6 });
		});
	});
});
