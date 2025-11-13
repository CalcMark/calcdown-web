import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import InlineCalcMarkEditorSimple from './InlineCalcMarkEditorSimple.svelte';

describe('InlineCalcMarkEditorSimple - Minimal Reactivity Test', () => {
	beforeEach(() => {
		// Clear any previous test state
	});

	it('should update DOM when blocks state changes in onMount', async () => {
		const { container } = render(InlineCalcMarkEditorSimple);

		// Initially should have 1 block
		const initialBlocks = container.querySelectorAll('.block');
		console.log('[Simple Test] Initial blocks:', initialBlocks.length);
		expect(initialBlocks.length).toBe(1);

		// Wait for onMount to complete
		await new Promise(resolve => setTimeout(resolve, 200));

		// After onMount, should have 3 blocks
		const finalBlocks = container.querySelectorAll('.block');
		console.log('[Simple Test] Final blocks:', finalBlocks.length);
		expect(finalBlocks.length).toBe(3);

		// Check that we have the right types
		const calcBlocks = container.querySelectorAll('.block.calculation');
		console.log('[Simple Test] Calculation blocks:', calcBlocks.length);
		expect(calcBlocks.length).toBe(2);
	});
});
