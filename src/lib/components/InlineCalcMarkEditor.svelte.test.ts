import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import InlineCalcMarkEditor from './InlineCalcMarkEditor.svelte';

// Mock the fetch API
globalThis.fetch = vi.fn();

describe('InlineCalcMarkEditor - State Reactivity', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should update DOM when blocks state changes after API call', async () => {
		// Mock API response with classifications
		(globalThis.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				classifications: [
					{ lineType: 'MARKDOWN', line: '# Test' },
					{ lineType: 'MARKDOWN', line: 'This is markdown.' },
					{ lineType: 'BLANK', line: '' },
					{ lineType: 'CALCULATION', line: 'price = $100' },
					{ lineType: 'CALCULATION', line: 'tax = 10%' },
					{ lineType: 'CALCULATION', line: 'total = price * (1 + tax)' },
					{ lineType: 'BLANK', line: '' },
					{ lineType: 'MARKDOWN', line: '## Done' },
					{ lineType: 'MARKDOWN', line: "That's it!" }
				],
				tokensByLine: {},
				diagnostics: {},
				evaluationResults: [],
				variableContext: {}
			})
		});

		const { container } = render(InlineCalcMarkEditor);

		// Wait for API call
		await new Promise(resolve => setTimeout(resolve, 100));

		// Check if the paragraph shows correct block count
		const blockCountText = container.querySelector('p')?.textContent;
		console.log('Block count text:', blockCountText);

		// Check editable blocks (new document has more content)
		const blocks = container.querySelectorAll('.editable-block');
		console.log('Editable blocks in DOM:', blocks.length);
		expect(blocks.length).toBeGreaterThan(3); // Should have multiple blocks
	});

	it('should render blocks from initial document', () => {
		const simpleDoc = `# Test
price = $100`;

		const { container } = render(InlineCalcMarkEditor, {
			props: { initialDocument: simpleDoc }
		});

		// Should have at least one block initially
		const blocks = container.querySelectorAll('.editable-block');
		expect(blocks.length).toBeGreaterThan(0);
	});

	it('should pass tokens to calculation blocks after API call', async () => {
		// Mock API response with tokens
		(globalThis.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				classifications: [
					{ lineType: 'CALCULATION', line: 'price = $100' }
				],
				tokensByLine: {
					1: [
						{ type: 'IDENTIFIER', start: 0, end: 5, literal: 'price', value: 'price', originalText: 'price' },
						{ type: 'ASSIGN', start: 6, end: 7, literal: '=', value: '=', originalText: '=' },
						{ type: 'CURRENCY', start: 8, end: 12, literal: '$100', value: '100', originalText: '$100' }
					]
				},
				diagnostics: {},
				evaluationResults: [],
				variableContext: {}
			})
		});

		const { container } = render(InlineCalcMarkEditor, {
			props: { initialDocument: 'price = $100' }
		});

		// Wait for API call
		await new Promise(resolve => setTimeout(resolve, 100));

		// Check if tokens are rendered
		const identifierTokens = container.querySelectorAll('.token-identifier');
		const currencyTokens = container.querySelectorAll('.token-currency');

		console.log('Identifier tokens found:', identifierTokens.length);
		console.log('Currency tokens found:', currencyTokens.length);

		expect(identifierTokens.length).toBe(1);
		expect(currencyTokens.length).toBe(1);
	});
});
