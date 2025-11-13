/**
 * Block-based editor store for CalcDown
 * Manages document state as a collection of editable blocks
 */

import { documentToBlocks } from '$lib/utils/blockConversion';

export interface Block {
	id: string;
	type: 'markdown' | 'calculation';
	content: string; // Raw text content (single or multiple lines)
	lineStart: number; // Starting line number in full document (1-indexed)
	lineEnd: number; // Ending line number in full document (1-indexed)

	// Cached evaluation results
	classification?: LineClassification[];
	tokens?: Record<number, Token[]>; // Keyed by line number
	diagnostics?: Record<number, Diagnostic[]>; // Keyed by line number
	evaluationResults?: EvaluationResult[];
	renderedHtml?: string; // For markdown blocks
}

export interface LineClassification {
	lineType: 'MARKDOWN' | 'CALCULATION' | 'BLANK';
	line: string;
}

export interface Token {
	type: string;
	value: string;
	start: number;
	end: number;
	originalText?: string;
}

export interface Diagnostic {
	severity: 'error' | 'warning' | 'info';
	message: string;
	range?: {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
}

export interface EvaluationResult {
	OriginalLine: number;
	Value: {
		Value: number | boolean;
		Symbol?: string;
		SourceFormat?: string;
	};
	Symbol?: string;
	SourceFormat?: string;
}

export interface EditorState {
	// Model: raw CalcMark document text (source of truth)
	documentText: string;

	// Controller results: evaluation data from server
	classifications: LineClassification[];
	tokensByLine: Record<number, Token[]>;
	diagnosticsByLine: Record<number, Diagnostic[]>;
	evaluationResults: EvaluationResult[];
	variableContext: Record<string, EvaluationResult>;

	// UI state
	activeBlockId: string | null;
	documentVersion: number;
	isProcessing: boolean;

	// Cached previous blocks for ID preservation
	previousBlocks: Block[];
}

/**
 * Creates a new editor store
 */
export function createEditorStore(initialText: string = '') {
	const state = $state<EditorState>({
		// Model: raw text
		documentText: initialText,

		// Controller results: empty until first evaluation
		classifications: [],
		tokensByLine: {},
		diagnosticsByLine: {},
		evaluationResults: [],
		variableContext: {},

		// UI state
		activeBlockId: null,
		documentVersion: 0,
		isProcessing: false,

		// Cached previous blocks
		previousBlocks: []
	});

	// Derived blocks (IDs are stable based on content + position)
	const derivedBlocks = $derived(
		documentToBlocks(
			state.documentText,
			state.classifications,
			state.tokensByLine,
			state.diagnosticsByLine,
			state.evaluationResults
		)
	);

	return {
		// Model: raw document text
		get documentText() {
			return state.documentText;
		},

		// View: blocks derived from documentText + evaluation results
		get blocks() {
			return derivedBlocks;
		},

		// UI state getters
		get activeBlockId() {
			return state.activeBlockId;
		},
		get variableContext() {
			return state.variableContext;
		},
		get isProcessing() {
			return state.isProcessing;
		},
		get documentVersion() {
			return state.documentVersion;
		},

		// Actions: Model updates
		setDocumentText(text: string) {
			state.documentText = text;
			state.documentVersion++;
		},

		updateBlockContent(blockId: string, content: string) {
			// Find the block to update (blocks are derived, so we need fresh reference)
			const blocks = this.blocks;
			const blockIndex = blocks.findIndex((b) => b.id === blockId);
			if (blockIndex !== -1) {
				// Split current document into lines
				const lines = state.documentText.split('\n');

				// Calculate line range for this block
				const block = blocks[blockIndex];
				const startIdx = block.lineStart - 1;
				const endIdx = block.lineEnd - 1;

				// Replace the lines corresponding to this block
				const newLines = [...lines];
				const contentLines = content.split('\n');
				newLines.splice(startIdx, endIdx - startIdx + 1, ...contentLines);

				// Update documentText
				state.documentText = newLines.join('\n');
				state.documentVersion++;
			}
		},

		// Actions: Controller updates (from server evaluation)
		setEvaluationResults(
			classifications: LineClassification[],
			tokensByLine: Record<number, Token[]>,
			diagnosticsByLine: Record<number, Diagnostic[]>,
			evaluationResults: EvaluationResult[],
			variableContext: Record<string, EvaluationResult>
		) {
			state.classifications = classifications;
			state.tokensByLine = tokensByLine;
			state.diagnosticsByLine = diagnosticsByLine;
			state.evaluationResults = evaluationResults;
			state.variableContext = variableContext;
		},

		// Actions: UI state
		setActiveBlock(blockId: string | null) {
			state.activeBlockId = blockId;
		},

		insertBlockAfter(afterBlockId: string, newBlock: Block) {
			const blocks = this.blocks;
			const index = blocks.findIndex((b) => b.id === afterBlockId);
			if (index !== -1) {
				const newBlocks = [...blocks];
				newBlocks.splice(index + 1, 0, newBlock);
				state.documentText = newBlocks.map((b) => b.content).join('\n');
				state.documentVersion++;
			}
		},

		removeBlock(blockId: string) {
			const blocks = this.blocks;
			const newBlocks = blocks.filter((b) => b.id !== blockId);
			state.documentText = newBlocks.map((b) => b.content).join('\n');
			state.documentVersion++;
		},

		mergeBlocks(sourceBlockId: string, targetBlockId: string) {
			const blocks = this.blocks;
			const sourceIndex = blocks.findIndex((b) => b.id === sourceBlockId);
			const targetIndex = blocks.findIndex((b) => b.id === targetBlockId);

			if (sourceIndex !== -1 && targetIndex !== -1) {
				const newBlocks = [...blocks];
				const source = newBlocks[sourceIndex];
				const target = newBlocks[targetIndex];

				// Merge content
				newBlocks[targetIndex] = {
					...target,
					content: target.content + '\n' + source.content
				};

				// Remove source block
				newBlocks.splice(sourceIndex, 1);

				state.documentText = newBlocks.map((b) => b.content).join('\n');
				state.documentVersion++;
			}
		},

		setProcessing(isProcessing: boolean) {
			state.isProcessing = isProcessing;
		}
	};
}

export type EditorStore = ReturnType<typeof createEditorStore>;
