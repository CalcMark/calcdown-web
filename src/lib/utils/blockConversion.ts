/**
 * Utilities for converting between document text and block structure
 */

import type { Block, LineClassification } from '$lib/stores/blockStore.svelte';

/**
 * Generates a unique block ID
 */
export function generateBlockId(): string {
	return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Converts document text and classifications into blocks
 * Groups consecutive lines of the same type into blocks
 */
export function documentToBlocks(
	documentText: string,
	classifications: LineClassification[] = []
): Block[] {
	const lines = documentText.split('\n');

	if (lines.length === 0) {
		return [
			{
				id: generateBlockId(),
				type: 'markdown',
				content: '',
				lineStart: 1,
				lineEnd: 1
			}
		];
	}

	// If no classifications provided, treat everything as markdown initially
	const lineTypes: Array<'MARKDOWN' | 'CALCULATION' | 'BLANK'> =
		classifications.length > 0
			? classifications.map((c) => c.lineType)
			: lines.map(() => 'MARKDOWN' as const);

	const blocks: Block[] = [];
	let currentBlockLines: string[] = [lines[0]];
	let currentType = lineTypes[0];
	let currentLineStart = 1;

	for (let i = 1; i < lines.length; i++) {
		const lineType = lineTypes[i];
		const line = lines[i];

		// Rule: BLANK lines are merged into MARKDOWN blocks
		// CALCULATION lines form their own blocks (one line per block for simplicity in MVP)
		const normalizedType = lineType === 'BLANK' ? 'MARKDOWN' : lineType;
		const normalizedCurrentType = currentType === 'BLANK' ? 'MARKDOWN' : currentType;

		// Group consecutive lines of same type
		// BUT: Each CALCULATION line is its own block
		if (normalizedType === normalizedCurrentType && normalizedType !== 'CALCULATION') {
			currentBlockLines.push(line);
		} else {
			// Finalize current block
			blocks.push({
				id: generateBlockId(),
				type: normalizedCurrentType === 'CALCULATION' ? 'calculation' : 'markdown',
				content: currentBlockLines.join('\n'),
				lineStart: currentLineStart,
				lineEnd: currentLineStart + currentBlockLines.length - 1
			});

			// Start new block
			currentBlockLines = [line];
			currentType = lineType;
			currentLineStart = i + 1;
		}
	}

	// Don't forget last block
	const normalizedCurrentType = currentType === 'BLANK' ? 'MARKDOWN' : currentType;
	blocks.push({
		id: generateBlockId(),
		type: normalizedCurrentType === 'CALCULATION' ? 'calculation' : 'markdown',
		content: currentBlockLines.join('\n'),
		lineStart: currentLineStart,
		lineEnd: currentLineStart + currentBlockLines.length - 1
	});

	return blocks;
}

/**
 * Converts blocks back to document text
 */
export function blocksToDocument(blocks: Block[]): string {
	return blocks.map((b) => b.content).join('\n');
}

/**
 * Updates line numbers for all blocks after content changes
 */
export function recalculateLineNumbers(blocks: Block[]): Block[] {
	let currentLine = 1;

	return blocks.map((block) => {
		const lineCount = block.content.split('\n').length;
		const updatedBlock = {
			...block,
			lineStart: currentLine,
			lineEnd: currentLine + lineCount - 1
		};
		currentLine += lineCount;
		return updatedBlock;
	});
}

/**
 * Splits a block at a specific position (for ENTER key handling)
 */
export function splitBlockAtPosition(
	block: Block,
	cursorPosition: number
): { before: Block; after: Block } {
	const contentBefore = block.content.substring(0, cursorPosition);
	const contentAfter = block.content.substring(cursorPosition);

	return {
		before: {
			...block,
			content: contentBefore,
			lineEnd: block.lineStart + contentBefore.split('\n').length - 1
		},
		after: {
			id: generateBlockId(),
			type: 'markdown', // New blocks default to markdown
			content: contentAfter,
			lineStart: block.lineStart + contentBefore.split('\n').length,
			lineEnd: block.lineStart + contentBefore.split('\n').length + contentAfter.split('\n').length - 1
		}
	};
}
