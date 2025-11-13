/**
 * Focus management utilities for navigating between blocks
 */

import type { Block } from '$lib/stores/blockStore.svelte';

export interface NavigationResult {
	nextBlockId: string | null;
	shouldDeactivateCurrent: boolean;
}

/**
 * Find the next block to focus after TAB key
 */
export function findNextBlock(blocks: Block[], currentBlockId: string): string | null {
	const currentIndex = blocks.findIndex((b) => b.id === currentBlockId);
	if (currentIndex === -1 || currentIndex === blocks.length - 1) {
		return null; // No next block
	}
	return blocks[currentIndex + 1].id;
}

/**
 * Find the previous block to focus
 */
export function findPreviousBlock(blocks: Block[], currentBlockId: string): string | null {
	const currentIndex = blocks.findIndex((b) => b.id === currentBlockId);
	if (currentIndex === -1 || currentIndex === 0) {
		return null; // No previous block
	}
	return blocks[currentIndex - 1].id;
}

/**
 * Navigate to next block (TAB behavior)
 */
export function navigateToNextBlock(
	blocks: Block[],
	currentBlockId: string
): NavigationResult {
	const nextBlockId = findNextBlock(blocks, currentBlockId);
	return {
		nextBlockId,
		shouldDeactivateCurrent: true
	};
}

/**
 * Navigate to previous block (SHIFT+TAB behavior)
 */
export function navigateToPreviousBlock(
	blocks: Block[],
	currentBlockId: string
): NavigationResult {
	const previousBlockId = findPreviousBlock(blocks, currentBlockId);
	return {
		nextBlockId: previousBlockId,
		shouldDeactivateCurrent: true
	};
}
