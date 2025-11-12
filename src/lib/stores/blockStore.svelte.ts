/**
 * Block-based editor store for CalcDown
 * Manages document state as a collection of editable blocks
 */

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
	blocks: Block[];
	activeBlockId: string | null;
	variableContext: Record<string, EvaluationResult>;
	documentVersion: number;
	isProcessing: boolean;
}

/**
 * Creates a new editor store
 */
export function createEditorStore() {
	const state = $state<EditorState>({
		blocks: [],
		activeBlockId: null,
		variableContext: {},
		documentVersion: 0,
		isProcessing: false
	});

	return {
		// Getters
		get blocks() {
			return state.blocks;
		},
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

		// Derived: full document text
		get documentText() {
			return state.blocks.map((b) => b.content).join('\n');
		},

		// Actions
		setBlocks(blocks: Block[]) {
			state.blocks = blocks;
			state.documentVersion++;
		},

		setActiveBlock(blockId: string | null) {
			state.activeBlockId = blockId;
		},

		updateBlockContent(blockId: string, content: string) {
			const blockIndex = state.blocks.findIndex((b) => b.id === blockId);
			if (blockIndex !== -1) {
				state.blocks[blockIndex].content = content;
				state.documentVersion++;
			}
		},

		insertBlockAfter(afterBlockId: string, newBlock: Block) {
			const index = state.blocks.findIndex((b) => b.id === afterBlockId);
			if (index !== -1) {
				state.blocks.splice(index + 1, 0, newBlock);
				state.documentVersion++;
			}
		},

		removeBlock(blockId: string) {
			state.blocks = state.blocks.filter((b) => b.id !== blockId);
			state.documentVersion++;
		},

		mergeBlocks(sourceBlockId: string, targetBlockId: string) {
			const sourceIndex = state.blocks.findIndex((b) => b.id === sourceBlockId);
			const targetIndex = state.blocks.findIndex((b) => b.id === targetBlockId);

			if (sourceIndex !== -1 && targetIndex !== -1) {
				const source = state.blocks[sourceIndex];
				const target = state.blocks[targetIndex];

				// Merge content
				target.content = target.content + '\n' + source.content;

				// Remove source block
				state.blocks.splice(sourceIndex, 1);
				state.documentVersion++;
			}
		},

		setVariableContext(context: Record<string, EvaluationResult>) {
			state.variableContext = context;
		},

		setProcessing(isProcessing: boolean) {
			state.isProcessing = isProcessing;
		},

		// Update blocks with evaluation results
		updateBlockResults(
			classifications: LineClassification[],
			tokensByLine: Record<number, Token[]>,
			diagnosticsByLine: Record<number, Diagnostic[]>,
			evaluationResults: EvaluationResult[]
		) {
			// Build maps for quick lookup
			const evalByLine = new Map<number, EvaluationResult>();
			evaluationResults.forEach((result) => {
				if (result.OriginalLine) {
					evalByLine.set(result.OriginalLine, result);
				}
			});

			// Update each block with its corresponding data
			state.blocks.forEach((block) => {
				// Get classifications for this block's line range
				block.classification = classifications.slice(block.lineStart - 1, block.lineEnd);

				// Get tokens for this block
				const blockTokens: Record<number, Token[]> = {};
				for (let line = block.lineStart; line <= block.lineEnd; line++) {
					if (tokensByLine[line]) {
						blockTokens[line] = tokensByLine[line];
					}
				}
				block.tokens = blockTokens;

				// Get diagnostics for this block
				const blockDiagnostics: Record<number, Diagnostic[]> = {};
				for (let line = block.lineStart; line <= block.lineEnd; line++) {
					if (diagnosticsByLine[line]) {
						blockDiagnostics[line] = diagnosticsByLine[line];
					}
				}
				block.diagnostics = blockDiagnostics;

				// Get evaluation results for this block
				const blockEvalResults: EvaluationResult[] = [];
				for (let line = block.lineStart; line <= block.lineEnd; line++) {
					const result = evalByLine.get(line);
					if (result) {
						blockEvalResults.push(result);
					}
				}
				block.evaluationResults = blockEvalResults;
			});
		}
	};
}

export type EditorStore = ReturnType<typeof createEditorStore>;
