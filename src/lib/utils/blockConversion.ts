/**
 * Utilities for converting between document text and block structure
 */

import type {
	Block,
	LineClassification,
	Token,
	Diagnostic,
	EvaluationResult
} from '$lib/stores/blockStore.svelte';

/**
 * Generates a simple hash from a string (for stable block IDs)
 */
function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash).toString(36);
}

/**
 * Generates a stable block ID based on content and position
 */
export function generateBlockId(content: string = '', position: number = 0): string {
	const contentHash = simpleHash(content);
	return `block-${position}-${contentHash}`;
}

/**
 * Tries to reuse a block ID from previous blocks if possible
 * Falls back to generating a new ID
 */
function getOrGenerateBlockId(
	position: number,
	type: 'markdown' | 'calculation',
	content: string,
	previousBlocks: Block[]
): string {
	// Check if there's a previous block at the same position with the same type
	const previousBlock = previousBlocks[position];

	if (previousBlock && previousBlock.type === type) {
		// Reuse the ID from the previous block
		// This keeps components stable even when content changes
		return previousBlock.id;
	}

	// No matching previous block, generate new ID
	return generateBlockId(content, position);
}

/**
 * Converts document text and evaluation results into blocks
 * Groups consecutive lines of the same type into blocks
 */
/**
 * Helper to attach evaluation data to a block
 */
function attachEvaluationData(
	block: Block,
	tokensByLine: Record<number, Token[]>,
	diagnosticsByLine: Record<number, Diagnostic[]>,
	evaluationResults: EvaluationResult[]
): Block {
	// Get tokens for this block's line range
	const blockTokens: Record<number, Token[]> = {};
	for (let line = block.lineStart; line <= block.lineEnd; line++) {
		if (tokensByLine[line]) {
			blockTokens[line] = tokensByLine[line];
		}
	}

	// Get diagnostics for this block's line range
	const blockDiagnostics: Record<number, Diagnostic[]> = {};
	for (let line = block.lineStart; line <= block.lineEnd; line++) {
		if (diagnosticsByLine[line]) {
			blockDiagnostics[line] = diagnosticsByLine[line];
		}
	}

	// Get evaluation results for this block's line range
	const blockEvalResults: EvaluationResult[] = [];
	for (const result of evaluationResults) {
		if (result.OriginalLine >= block.lineStart && result.OriginalLine <= block.lineEnd) {
			blockEvalResults.push(result);
		}
	}

	return {
		...block,
		tokens: blockTokens,
		diagnostics: blockDiagnostics,
		evaluationResults: blockEvalResults
	};
}

export function documentToBlocks(
	documentText: string,
	classifications: LineClassification[] = [],
	tokensByLine: Record<number, Token[]> = {},
	diagnosticsByLine: Record<number, Diagnostic[]> = {},
	evaluationResults: EvaluationResult[] = [],
	previousBlocks: Block[] = []
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

	// If no classifications provided OR classifications don't match line count, treat everything as markdown
	const lineTypes: Array<'MARKDOWN' | 'CALCULATION' | 'BLANK'> =
		classifications.length === lines.length
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
			const content = currentBlockLines.join('\n');
			const blockType = normalizedCurrentType === 'CALCULATION' ? 'calculation' : 'markdown';
			blocks.push({
				id: getOrGenerateBlockId(blocks.length, blockType, content, previousBlocks),
				type: blockType,
				content,
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
	const content = currentBlockLines.join('\n');
	const blockType = normalizedCurrentType === 'CALCULATION' ? 'calculation' : 'markdown';
	blocks.push({
		id: getOrGenerateBlockId(blocks.length, blockType, content, previousBlocks),
		type: blockType,
		content,
		lineStart: currentLineStart,
		lineEnd: currentLineStart + currentBlockLines.length - 1
	});

	// Attach evaluation data to all blocks
	return blocks.map((block) =>
		attachEvaluationData(block, tokensByLine, diagnosticsByLine, evaluationResults)
	);
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
			lineEnd:
				block.lineStart + contentBefore.split('\n').length + contentAfter.split('\n').length - 1
		}
	};
}
