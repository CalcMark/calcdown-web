import { describe, it, expect } from 'vitest';
import {
	findNextBlock,
	findPreviousBlock,
	navigateToNextBlock,
	navigateToPreviousBlock
} from './focusManagement';
import type { Block } from '$lib/stores/blockStore.svelte';

describe('focusManagement', () => {
	const mockBlocks: Block[] = [
		{
			id: 'block-1',
			type: 'markdown',
			content: 'First block',
			lineStart: 1,
			lineEnd: 1
		},
		{
			id: 'block-2',
			type: 'calculation',
			content: 'x = 10',
			lineStart: 2,
			lineEnd: 2
		},
		{
			id: 'block-3',
			type: 'markdown',
			content: 'Third block',
			lineStart: 3,
			lineEnd: 3
		}
	];

	describe('findNextBlock', () => {
		it('should find the next block', () => {
			const nextId = findNextBlock(mockBlocks, 'block-1');
			expect(nextId).toBe('block-2');
		});

		it('should find the next block from middle', () => {
			const nextId = findNextBlock(mockBlocks, 'block-2');
			expect(nextId).toBe('block-3');
		});

		it('should return null when at last block', () => {
			const nextId = findNextBlock(mockBlocks, 'block-3');
			expect(nextId).toBeNull();
		});

		it('should return null for non-existent block', () => {
			const nextId = findNextBlock(mockBlocks, 'non-existent');
			expect(nextId).toBeNull();
		});
	});

	describe('findPreviousBlock', () => {
		it('should find the previous block', () => {
			const prevId = findPreviousBlock(mockBlocks, 'block-3');
			expect(prevId).toBe('block-2');
		});

		it('should find the previous block from middle', () => {
			const prevId = findPreviousBlock(mockBlocks, 'block-2');
			expect(prevId).toBe('block-1');
		});

		it('should return null when at first block', () => {
			const prevId = findPreviousBlock(mockBlocks, 'block-1');
			expect(prevId).toBeNull();
		});

		it('should return null for non-existent block', () => {
			const prevId = findPreviousBlock(mockBlocks, 'non-existent');
			expect(prevId).toBeNull();
		});
	});

	describe('navigateToNextBlock', () => {
		it('should return next block ID and signal to deactivate current', () => {
			const result = navigateToNextBlock(mockBlocks, 'block-1');
			expect(result.nextBlockId).toBe('block-2');
			expect(result.shouldDeactivateCurrent).toBe(true);
		});

		it('should return null when at last block', () => {
			const result = navigateToNextBlock(mockBlocks, 'block-3');
			expect(result.nextBlockId).toBeNull();
			expect(result.shouldDeactivateCurrent).toBe(true);
		});
	});

	describe('navigateToPreviousBlock', () => {
		it('should return previous block ID and signal to deactivate current', () => {
			const result = navigateToPreviousBlock(mockBlocks, 'block-3');
			expect(result.nextBlockId).toBe('block-2');
			expect(result.shouldDeactivateCurrent).toBe(true);
		});

		it('should return null when at first block', () => {
			const result = navigateToPreviousBlock(mockBlocks, 'block-1');
			expect(result.nextBlockId).toBeNull();
			expect(result.shouldDeactivateCurrent).toBe(true);
		});
	});
});
