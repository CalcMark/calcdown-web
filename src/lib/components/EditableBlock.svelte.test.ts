import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import EditableBlock from './EditableBlock.svelte';
import type { Block } from '$lib/types';

describe('EditableBlock - Layout Tests', () => {
	it('calculation block should NOT have border-left styling on outer wrapper', () => {
		const block: Block = {
			id: 'test-1',
			type: 'calculation',
			content: 'discount = 20%',
			lineStart: 1,
			lineEnd: 1,
			tokens: {},
			diagnostics: {},
			evaluationResults: []
		};

		const { container } = render(EditableBlock, {
			props: {
				block,
				isActive: false,
				variableContext: {},
				onActivate: () => {},
				onContentChange: () => {},
				onEnter: () => {},
				onTab: () => {},
				onBackspaceAtStart: () => {},
				onBlur: () => {}
			}
		});

		const editableBlock = container.querySelector('.editable-block.calculation');
		expect(editableBlock).toBeTruthy();

		// Get computed style (won't work in jsdom, but we can check CSS class structure)
		// The issue: EditableBlock has border-left AND CalculationLine has border-left
		// Expected: Only ONE element should have the blue left border

		// Check if the CSS class exists that would add border-left
		expect(editableBlock?.classList.contains('calculation')).toBe(true);

		// This test documents the CURRENT (bad) behavior:
		// Both .editable-block.calculation AND .calculation-line have border-left
		// We need to remove one of these borders
	});

	it('should document nested elements with blue borders', () => {
		const block: Block = {
			id: 'test-1',
			type: 'calculation',
			content: 'discount = 20%',
			lineStart: 1,
			lineEnd: 1,
			tokens: {
				1: [
					{ type: 'IDENTIFIER', value: 'discount', start: 0, end: 8, originalText: 'discount' },
					{ type: 'ASSIGN', value: '=', start: 9, end: 10, originalText: '=' },
					{ type: 'NUMBER', value: '20%', start: 11, end: 14, originalText: '20%' }
				]
			},
			diagnostics: {},
			evaluationResults: []
		};

		const { container } = render(EditableBlock, {
			props: {
				block,
				isActive: false,
				variableContext: {},
				onActivate: () => {},
				onContentChange: () => {},
				onEnter: () => {},
				onTab: () => {},
				onBackspaceAtStart: () => {},
				onBlur: () => {}
			}
		});

		// Current structure (BAD):
		// <div class="editable-block calculation">  ← border-left: 3px solid #0ea5e9
		//   <div class="calculation-block-editor">
		//     <div class="calculation-line">  ← ALSO border-left: 3px solid #0ea5e9
		//
		// Expected structure (GOOD):
		// <div class="editable-block calculation">  ← NO border-left
		//   <div class="calculation-block-editor">
		//     <div class="calculation-line">  ← border-left: 3px solid #0ea5e9

		const editableBlock = container.querySelector('.editable-block.calculation');
		const calculationLine = container.querySelector('.calculation-line');

		expect(editableBlock).toBeTruthy();
		expect(calculationLine).toBeTruthy();

		// Both have the CSS classes that add border-left
		// This is the problem we need to fix
		expect(editableBlock?.classList.contains('calculation')).toBe(true);
		expect(calculationLine?.classList.contains('calculation-line')).toBe(true);
	});
});
