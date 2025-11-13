import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CalculationLine from './CalculationLine.svelte';

describe('CalculationLine - Diagnostic Passing', () => {
	it('should pass diagnostics to CalcToken for error tokens', () => {
		const lineNumber = 1;
		const tokens = [
			{
				type: 'IDENTIFIER',
				value: 'undefined_calc',
				start: 0,
				end: 14,
				originalText: 'undefined_calc'
			},
			{ type: 'ASSIGN', value: '=', start: 15, end: 16, originalText: '=' },
			{ type: 'IDENTIFIER', value: 'missing_var', start: 17, end: 28, originalText: 'missing_var' },
			{ type: 'PLUS', value: '+', start: 29, end: 30, originalText: '+' },
			{ type: 'NUMBER', value: '100', start: 31, end: 34, originalText: '100' }
		];

		const diagnostics = [
			{
				severity: 'error' as const,
				message: 'undefined variable: missing_var',
				range: {
					start: { line: 1, column: 18 }, // Points to 'missing_var' (1-indexed)
					end: { line: 1, column: 29 }
				}
			}
		];

		const lineText = 'undefined_calc = missing_var + 100';

		const { container } = render(CalculationLine, {
			lineNumber,
			tokens,
			diagnostics,
			evaluationResult: null,
			lineText,
			variableContext: {}
		});

		// Find all CalcToken instances
		const tokenElements = container.querySelectorAll('.token-identifier');

		console.log('Found token elements:', tokenElements.length);

		// Log each token
		tokenElements.forEach((el, idx) => {
			const text = el.textContent;
			const classes = el.className;
			console.log(`Token ${idx}: "${text}" - classes: ${classes}`);
		});

		// Find the 'missing_var' token (should be the second identifier)
		const missingVarToken = Array.from(tokenElements).find(
			(el) => el.textContent === 'missing_var'
		);

		expect(missingVarToken).toBeTruthy();
		console.log('missing_var classes:', missingVarToken?.className);

		// This should pass - the token should have the has-error class
		expect(missingVarToken?.classList.contains('has-error')).toBe(true);
	});

	it('should debug diagnostic range matching logic', () => {
		// Token: missing_var at positions 17-28 (0-indexed rune positions)
		const token = {
			type: 'IDENTIFIER',
			value: 'missing_var',
			start: 17,
			end: 28,
			originalText: 'missing_var'
		};

		// Diagnostic: column 18-29 (1-indexed)
		const diagnostic = {
			severity: 'error' as const,
			message: 'undefined variable: missing_var',
			range: {
				start: { line: 1, column: 18 },
				end: { line: 1, column: 29 }
			}
		};

		// Current logic in CalculationLine:
		const tokenColumn = token.start + 1; // 17 + 1 = 18
		const tokenEndColumn = token.end + 1; // 28 + 1 = 29

		console.log('Token start (0-indexed):', token.start);
		console.log('Token end (0-indexed):', token.end);
		console.log('Token column (1-indexed):', tokenColumn);
		console.log('Token end column (1-indexed):', tokenEndColumn);
		console.log('Diagnostic start column:', diagnostic.range.start.column);
		console.log('Diagnostic end column:', diagnostic.range.end.column);

		// Current filter logic:
		const matches =
			tokenColumn <= diagnostic.range.end.column && tokenEndColumn >= diagnostic.range.start.column;

		console.log('Does it match?', matches);
		console.log(
			'  tokenColumn (18) <= diagnostic.range.end.column (29)?',
			tokenColumn <= diagnostic.range.end.column
		);
		console.log(
			'  tokenEndColumn (29) >= diagnostic.range.start.column (18)?',
			tokenEndColumn >= diagnostic.range.start.column
		);

		// This should match
		expect(matches).toBe(true);
	});
});
