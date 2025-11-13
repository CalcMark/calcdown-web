import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CalculationBlockEditor from './CalculationBlockEditor.svelte';

describe('CalculationBlockEditor', () => {
	it('should render CalculationLine with tokens in preview mode', () => {
		const block = {
			id: 'test-1',
			type: 'calculation' as const,
			content: 'price = $100',
			lineStart: 1,
			lineEnd: 1,
			tokens: {
				1: [
					{ type: 'IDENTIFIER', start: 0, end: 5, literal: 'price', value: 'price', originalText: 'price' },
					{ type: 'ASSIGN', start: 6, end: 7, literal: '=', value: '=', originalText: '=' },
					{ type: 'CURRENCY', start: 8, end: 12, literal: '$100', value: '100', originalText: '$100' }
				]
			},
			diagnostics: {},
			evaluationResults: []
		};

		const { container } = render(CalculationBlockEditor, {
			props: {
				block,
				isActive: false,
				variableContext: {},
				onContentChange: () => {},
				onEnter: () => {},
				onTab: () => {},
				onBackspaceAtStart: () => {},
				onBlur: () => {}
			}
		});

		// Should render tokens
		const identifierTokens = container.querySelectorAll('.token-identifier');
		const currencyTokens = container.querySelectorAll('.token-currency');

		expect(identifierTokens.length).toBe(1);
		expect(currencyTokens.length).toBe(1);
	});

	it('should render without tokens when block has no token data', () => {
		const block = {
			id: 'test-2',
			type: 'calculation' as const,
			content: 'x = 10',
			lineStart: 1,
			lineEnd: 1
		};

		const { container } = render(CalculationBlockEditor, {
			props: {
				block,
				isActive: false,
				variableContext: {},
				onContentChange: () => {},
				onEnter: () => {},
				onTab: () => {},
				onBackspaceAtStart: () => {},
				onBlur: () => {}
			}
		});

		// Should still render the content as plain text
		expect(container.textContent).toContain('x = 10');
	});
});
