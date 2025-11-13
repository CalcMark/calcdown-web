import { describe, it, expect } from 'vitest';
import {
	documentToBlocks,
	blocksToDocument,
	recalculateLineNumbers,
	splitBlockAtPosition,
	generateBlockId
} from './blockConversion';
import type { LineClassification } from '$lib/stores/blockStore.svelte';

describe('blockConversion utilities', () => {
	describe('generateBlockId', () => {
		it('should generate stable IDs for same content and position', () => {
			const id1 = generateBlockId('test', 0);
			const id2 = generateBlockId('test', 0);
			expect(id1).toBe(id2);
			expect(id1).toMatch(/^block-/);
		});

		it('should generate different IDs for different content', () => {
			const id1 = generateBlockId('test1', 0);
			const id2 = generateBlockId('test2', 0);
			expect(id1).not.toBe(id2);
		});

		it('should generate different IDs for different positions', () => {
			const id1 = generateBlockId('test', 0);
			const id2 = generateBlockId('test', 1);
			expect(id1).not.toBe(id2);
		});
	});

	describe('documentToBlocks', () => {
		it('should create a single markdown block from empty string', () => {
			const blocks = documentToBlocks('');
			expect(blocks).toHaveLength(1);
			expect(blocks[0].type).toBe('markdown');
			expect(blocks[0].content).toBe('');
			expect(blocks[0].lineStart).toBe(1);
			expect(blocks[0].lineEnd).toBe(1);
		});

		it('should create a single markdown block without classifications', () => {
			const text = 'Hello world\nSecond line';
			const blocks = documentToBlocks(text);
			expect(blocks).toHaveLength(1);
			expect(blocks[0].type).toBe('markdown');
			expect(blocks[0].content).toBe(text);
			expect(blocks[0].lineStart).toBe(1);
			expect(blocks[0].lineEnd).toBe(2);
		});

		it('should group consecutive markdown lines', () => {
			const text = '# Title\nParagraph\n\nAnother paragraph';
			const classifications: LineClassification[] = [
				{ lineType: 'MARKDOWN', line: '# Title' },
				{ lineType: 'MARKDOWN', line: 'Paragraph' },
				{ lineType: 'BLANK', line: '' },
				{ lineType: 'MARKDOWN', line: 'Another paragraph' }
			];

			const blocks = documentToBlocks(text, classifications);
			expect(blocks).toHaveLength(1);
			expect(blocks[0].type).toBe('markdown');
			expect(blocks[0].content).toBe(text);
		});

		it('should create separate blocks for calculation lines', () => {
			const text = '# Title\nx = 10\ny = 20\nMore text';
			const classifications: LineClassification[] = [
				{ lineType: 'MARKDOWN', line: '# Title' },
				{ lineType: 'CALCULATION', line: 'x = 10' },
				{ lineType: 'CALCULATION', line: 'y = 20' },
				{ lineType: 'MARKDOWN', line: 'More text' }
			];

			const blocks = documentToBlocks(text, classifications);
			expect(blocks).toHaveLength(4);

			// First markdown block
			expect(blocks[0].type).toBe('markdown');
			expect(blocks[0].content).toBe('# Title');
			expect(blocks[0].lineStart).toBe(1);
			expect(blocks[0].lineEnd).toBe(1);

			// First calculation
			expect(blocks[1].type).toBe('calculation');
			expect(blocks[1].content).toBe('x = 10');
			expect(blocks[1].lineStart).toBe(2);
			expect(blocks[1].lineEnd).toBe(2);

			// Second calculation
			expect(blocks[2].type).toBe('calculation');
			expect(blocks[2].content).toBe('y = 20');
			expect(blocks[2].lineStart).toBe(3);
			expect(blocks[2].lineEnd).toBe(3);

			// Last markdown block
			expect(blocks[3].type).toBe('markdown');
			expect(blocks[3].content).toBe('More text');
			expect(blocks[3].lineStart).toBe(4);
			expect(blocks[3].lineEnd).toBe(4);
		});

		it('should merge BLANK lines into markdown blocks', () => {
			const text = 'Line 1\n\nLine 3';
			const classifications: LineClassification[] = [
				{ lineType: 'MARKDOWN', line: 'Line 1' },
				{ lineType: 'BLANK', line: '' },
				{ lineType: 'MARKDOWN', line: 'Line 3' }
			];

			const blocks = documentToBlocks(text, classifications);
			expect(blocks).toHaveLength(1);
			expect(blocks[0].type).toBe('markdown');
			expect(blocks[0].content).toBe(text);
		});

		it('should handle mixed content correctly', () => {
			const text = '# Header\n\nx = 5\n\nParagraph\ny = 10';
			const classifications: LineClassification[] = [
				{ lineType: 'MARKDOWN', line: '# Header' },
				{ lineType: 'BLANK', line: '' },
				{ lineType: 'CALCULATION', line: 'x = 5' },
				{ lineType: 'BLANK', line: '' },
				{ lineType: 'MARKDOWN', line: 'Paragraph' },
				{ lineType: 'CALCULATION', line: 'y = 10' }
			];

			const blocks = documentToBlocks(text, classifications);
			expect(blocks).toHaveLength(4);

			expect(blocks[0].type).toBe('markdown');
			expect(blocks[0].content).toBe('# Header\n');

			expect(blocks[1].type).toBe('calculation');
			expect(blocks[1].content).toBe('x = 5');

			expect(blocks[2].type).toBe('markdown');
			expect(blocks[2].content).toBe('\nParagraph');

			expect(blocks[3].type).toBe('calculation');
			expect(blocks[3].content).toBe('y = 10');
		});
	});

	describe('blocksToDocument', () => {
		it('should convert empty blocks to empty string', () => {
			const doc = blocksToDocument([]);
			expect(doc).toBe('');
		});

		it('should join block contents with newlines', () => {
			const blocks = [
				{
					id: '1',
					type: 'markdown' as const,
					content: 'First block',
					lineStart: 1,
					lineEnd: 1
				},
				{
					id: '2',
					type: 'calculation' as const,
					content: 'x = 10',
					lineStart: 2,
					lineEnd: 2
				},
				{
					id: '3',
					type: 'markdown' as const,
					content: 'Last block',
					lineStart: 3,
					lineEnd: 3
				}
			];

			const doc = blocksToDocument(blocks);
			expect(doc).toBe('First block\nx = 10\nLast block');
		});

		it('should preserve multi-line block content', () => {
			const blocks = [
				{
					id: '1',
					type: 'markdown' as const,
					content: 'Line 1\nLine 2\nLine 3',
					lineStart: 1,
					lineEnd: 3
				}
			];

			const doc = blocksToDocument(blocks);
			expect(doc).toBe('Line 1\nLine 2\nLine 3');
		});
	});

	describe('recalculateLineNumbers', () => {
		it('should recalculate line numbers for single-line blocks', () => {
			const blocks = [
				{
					id: '1',
					type: 'markdown' as const,
					content: 'First',
					lineStart: 1,
					lineEnd: 1
				},
				{
					id: '2',
					type: 'calculation' as const,
					content: 'x = 10',
					lineStart: 5, // Wrong
					lineEnd: 5
				},
				{
					id: '3',
					type: 'markdown' as const,
					content: 'Last',
					lineStart: 10, // Wrong
					lineEnd: 10
				}
			];

			const updated = recalculateLineNumbers(blocks);

			expect(updated[0].lineStart).toBe(1);
			expect(updated[0].lineEnd).toBe(1);

			expect(updated[1].lineStart).toBe(2);
			expect(updated[1].lineEnd).toBe(2);

			expect(updated[2].lineStart).toBe(3);
			expect(updated[2].lineEnd).toBe(3);
		});

		it('should recalculate line numbers for multi-line blocks', () => {
			const blocks = [
				{
					id: '1',
					type: 'markdown' as const,
					content: 'Line 1\nLine 2\nLine 3',
					lineStart: 1,
					lineEnd: 3
				},
				{
					id: '2',
					type: 'calculation' as const,
					content: 'x = 10',
					lineStart: 10, // Wrong
					lineEnd: 10
				}
			];

			const updated = recalculateLineNumbers(blocks);

			expect(updated[0].lineStart).toBe(1);
			expect(updated[0].lineEnd).toBe(3);

			expect(updated[1].lineStart).toBe(4);
			expect(updated[1].lineEnd).toBe(4);
		});
	});

	describe('splitBlockAtPosition', () => {
		it('should split block at beginning', () => {
			const block = {
				id: '1',
				type: 'markdown' as const,
				content: 'Hello world',
				lineStart: 1,
				lineEnd: 1
			};

			const { before, after } = splitBlockAtPosition(block, 0);

			expect(before.content).toBe('');
			expect(after.content).toBe('Hello world');
			expect(after.type).toBe('markdown');
			expect(after.id).not.toBe(block.id);
		});

		it('should split block at end', () => {
			const block = {
				id: '1',
				type: 'markdown' as const,
				content: 'Hello world',
				lineStart: 1,
				lineEnd: 1
			};

			const { before, after } = splitBlockAtPosition(block, 11);

			expect(before.content).toBe('Hello world');
			expect(after.content).toBe('');
		});

		it('should split block in middle', () => {
			const block = {
				id: '1',
				type: 'calculation' as const,
				content: 'x = 10 + 20',
				lineStart: 5,
				lineEnd: 5
			};

			const { before, after } = splitBlockAtPosition(block, 6);

			expect(before.content).toBe('x = 10');
			expect(after.content).toBe(' + 20');
			expect(before.id).toBe(block.id);
			expect(after.id).not.toBe(block.id);
		});

		it('should handle multi-line content', () => {
			const block = {
				id: '1',
				type: 'markdown' as const,
				content: 'Line 1\nLine 2\nLine 3',
				lineStart: 1,
				lineEnd: 3
			};

			const { before, after } = splitBlockAtPosition(block, 7); // After "Line 1\n"

			expect(before.content).toBe('Line 1\n');
			expect(after.content).toBe('Line 2\nLine 3');
		});
	});

	describe('roundtrip conversion', () => {
		it('should preserve document through conversion cycle', () => {
			const originalDoc = '# Header\n\nx = 10\ny = 20\n\nParagraph text';
			const classifications: LineClassification[] = [
				{ lineType: 'MARKDOWN', line: '# Header' },
				{ lineType: 'BLANK', line: '' },
				{ lineType: 'CALCULATION', line: 'x = 10' },
				{ lineType: 'CALCULATION', line: 'y = 20' },
				{ lineType: 'BLANK', line: '' },
				{ lineType: 'MARKDOWN', line: 'Paragraph text' }
			];

			const blocks = documentToBlocks(originalDoc, classifications);
			const reconstructed = blocksToDocument(blocks);

			expect(reconstructed).toBe(originalDoc);
		});
	});
});
