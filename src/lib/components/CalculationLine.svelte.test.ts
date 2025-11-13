import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CalculationLine from './CalculationLine.svelte';

describe('CalculationLine', () => {
	it('should render plain text when no tokens provided', () => {
		const { container } = render(CalculationLine, {
			props: {
				lineNumber: 1,
				lineText: 'price = $100',
				tokens: [],
				diagnostics: [],
				evaluationResult: null,
				variableContext: {}
			}
		});

		const line = container.querySelector('.calculation-line');
		expect(line).toBeTruthy();
		expect(line?.textContent).toBe('price = $100');
	});

	it('should render tokens with syntax highlighting', () => {
		const { container } = render(CalculationLine, {
			props: {
				lineNumber: 1,
				lineText: 'price = $100',
				tokens: [
					{ type: 'IDENTIFIER', start: 0, end: 5, literal: 'price', value: 'price', originalText: 'price' },
					{ type: 'ASSIGN', start: 6, end: 7, literal: '=', value: '=', originalText: '=' },
					{ type: 'CURRENCY', start: 8, end: 12, literal: '$100', value: '100', originalText: '$100' }
				],
				diagnostics: [],
				evaluationResult: null,
				variableContext: {}
			}
		});

		// Should have token elements with specific classes
		const identifierTokens = container.querySelectorAll('.token-identifier');
		const operatorTokens = container.querySelectorAll('.token-operator');
		const currencyTokens = container.querySelectorAll('.token-currency');

		expect(identifierTokens.length).toBe(1);
		expect(operatorTokens.length).toBe(1);
		expect(currencyTokens.length).toBe(1);
	});

	it('should render without tokens when empty array', () => {
		const { container } = render(CalculationLine, {
			props: {
				lineNumber: 1,
				lineText: 'x = 10',
				tokens: [],
				diagnostics: [],
				evaluationResult: null,
				variableContext: {}
			}
		});

		const tokens = container.querySelectorAll('.calc-token');
		expect(tokens.length).toBe(0);
		expect(container.textContent).toContain('x = 10');
	});
});
