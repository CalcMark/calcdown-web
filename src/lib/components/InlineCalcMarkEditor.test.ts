import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import InlineCalcMarkEditor from './InlineCalcMarkEditor.svelte';

// Mock the fetch API
global.fetch = vi.fn();

describe('InlineCalcMarkEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render initial markdown block', async () => {
		const simpleDoc = `# Test\nThis is a test`;

		const { container } = render(InlineCalcMarkEditor, {
			props: { initialDocument: simpleDoc }
		});

		// Should have editable blocks
		const blocks = container.querySelectorAll('.editable-block');
		expect(blocks.length).toBeGreaterThan(0);
	});

	it('should handle calculation blocks after API response', async () => {
		const calcDoc = `price = $100\ntax = 10%\ntotal = price * (1 + tax)`;

		// Mock API response
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				classifications: [
					{ lineType: 'CALCULATION', line: 'price = $100' },
					{ lineType: 'CALCULATION', line: 'tax = 10%' },
					{ lineType: 'CALCULATION', line: 'total = price * (1 + tax)' }
				],
				tokensByLine: {
					1: [{ type: 'IDENTIFIER', value: 'price', start: 0, end: 5 }],
					2: [{ type: 'IDENTIFIER', value: 'tax', start: 0, end: 3 }],
					3: [{ type: 'IDENTIFIER', value: 'total', start: 0, end: 5 }]
				},
				diagnostics: {},
				evaluationResults: [],
				variableContext: {}
			})
		});

		const { container } = render(InlineCalcMarkEditor, {
			props: { initialDocument: calcDoc }
		});

		// Wait for async processing
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check that calculation blocks are rendered
		const calcBlocks = container.querySelectorAll('.editable-block.calculation');
		console.log('Calculation blocks found:', calcBlocks.length);
		console.log('All blocks:', container.querySelectorAll('.editable-block').length);

		expect(calcBlocks.length).toBe(3);
	});
});
