import { describe, it, expect, beforeEach } from 'vitest';
import { createEditorStore } from './blockStore.svelte';
import type {
	Block,
	LineClassification,
	Token,
	Diagnostic,
	EvaluationResult
} from './blockStore.svelte';

describe('EditorStore', () => {
	let store: ReturnType<typeof createEditorStore>;

	beforeEach(() => {
		store = createEditorStore();
	});

	describe('initialization', () => {
		it('should initialize with empty state', () => {
			expect(store.blocks).toEqual([]);
			expect(store.activeBlockId).toBeNull();
			expect(store.variableContext).toEqual({});
			expect(store.isProcessing).toBe(false);
			expect(store.documentVersion).toBe(0);
		});
	});

	describe('setBlocks', () => {
		it('should set blocks and increment version', () => {
			const blocks: Block[] = [
				{
					id: 'block-1',
					type: 'markdown',
					content: 'Hello',
					lineStart: 1,
					lineEnd: 1
				}
			];

			store.setBlocks(blocks);

			expect(store.blocks).toEqual(blocks);
			expect(store.documentVersion).toBe(1);
		});

		it('should replace existing blocks', () => {
			const blocks1: Block[] = [
				{ id: 'block-1', type: 'markdown', content: 'First', lineStart: 1, lineEnd: 1 }
			];
			const blocks2: Block[] = [
				{ id: 'block-2', type: 'calculation', content: 'x = 10', lineStart: 1, lineEnd: 1 }
			];

			store.setBlocks(blocks1);
			expect(store.documentVersion).toBe(1);

			store.setBlocks(blocks2);
			expect(store.blocks).toEqual(blocks2);
			expect(store.documentVersion).toBe(2);
		});
	});

	describe('setActiveBlock', () => {
		it('should set active block ID', () => {
			store.setActiveBlock('block-1');
			expect(store.activeBlockId).toBe('block-1');
		});

		it('should allow setting to null', () => {
			store.setActiveBlock('block-1');
			store.setActiveBlock(null);
			expect(store.activeBlockId).toBeNull();
		});
	});

	describe('updateBlockContent', () => {
		beforeEach(() => {
			store.setBlocks([
				{ id: 'block-1', type: 'markdown', content: 'Old content', lineStart: 1, lineEnd: 1 },
				{ id: 'block-2', type: 'calculation', content: 'x = 10', lineStart: 2, lineEnd: 2 }
			]);
		});

		it('should update block content by ID', () => {
			store.updateBlockContent('block-1', 'New content');

			expect(store.blocks[0].content).toBe('New content');
			expect(store.blocks[1].content).toBe('x = 10'); // Unchanged
		});

		it('should increment document version', () => {
			const versionBefore = store.documentVersion;
			store.updateBlockContent('block-1', 'New content');

			expect(store.documentVersion).toBe(versionBefore + 1);
		});

		it('should do nothing if block not found', () => {
			const versionBefore = store.documentVersion;
			store.updateBlockContent('nonexistent', 'New content');

			expect(store.documentVersion).toBe(versionBefore);
		});
	});

	describe('insertBlockAfter', () => {
		beforeEach(() => {
			store.setBlocks([
				{ id: 'block-1', type: 'markdown', content: 'First', lineStart: 1, lineEnd: 1 },
				{ id: 'block-2', type: 'calculation', content: 'x = 10', lineStart: 2, lineEnd: 2 }
			]);
		});

		it('should insert block after specified block', () => {
			const newBlock: Block = {
				id: 'block-new',
				type: 'markdown',
				content: 'New block',
				lineStart: 2,
				lineEnd: 2
			};

			store.insertBlockAfter('block-1', newBlock);

			expect(store.blocks).toHaveLength(3);
			expect(store.blocks[0].id).toBe('block-1');
			expect(store.blocks[1].id).toBe('block-new');
			expect(store.blocks[2].id).toBe('block-2');
		});

		it('should increment document version', () => {
			const versionBefore = store.documentVersion;
			const newBlock: Block = {
				id: 'block-new',
				type: 'markdown',
				content: 'New',
				lineStart: 2,
				lineEnd: 2
			};

			store.insertBlockAfter('block-1', newBlock);

			expect(store.documentVersion).toBe(versionBefore + 1);
		});

		it('should do nothing if target block not found', () => {
			const newBlock: Block = {
				id: 'block-new',
				type: 'markdown',
				content: 'New',
				lineStart: 2,
				lineEnd: 2
			};

			store.insertBlockAfter('nonexistent', newBlock);

			expect(store.blocks).toHaveLength(2); // Unchanged
		});
	});

	describe('removeBlock', () => {
		beforeEach(() => {
			store.setBlocks([
				{ id: 'block-1', type: 'markdown', content: 'First', lineStart: 1, lineEnd: 1 },
				{ id: 'block-2', type: 'calculation', content: 'x = 10', lineStart: 2, lineEnd: 2 },
				{ id: 'block-3', type: 'markdown', content: 'Third', lineStart: 3, lineEnd: 3 }
			]);
		});

		it('should remove block by ID', () => {
			store.removeBlock('block-2');

			expect(store.blocks).toHaveLength(2);
			expect(store.blocks[0].id).toBe('block-1');
			expect(store.blocks[1].id).toBe('block-3');
		});

		it('should increment document version', () => {
			const versionBefore = store.documentVersion;
			store.removeBlock('block-2');

			expect(store.documentVersion).toBe(versionBefore + 1);
		});
	});

	describe('mergeBlocks', () => {
		beforeEach(() => {
			store.setBlocks([
				{ id: 'block-1', type: 'markdown', content: 'First', lineStart: 1, lineEnd: 1 },
				{ id: 'block-2', type: 'markdown', content: 'Second', lineStart: 2, lineEnd: 2 }
			]);
		});

		it('should merge source block into target block', () => {
			store.mergeBlocks('block-2', 'block-1');

			expect(store.blocks).toHaveLength(1);
			expect(store.blocks[0].id).toBe('block-1');
			expect(store.blocks[0].content).toBe('First\nSecond');
		});

		it('should increment document version', () => {
			const versionBefore = store.documentVersion;
			store.mergeBlocks('block-2', 'block-1');

			expect(store.documentVersion).toBe(versionBefore + 1);
		});

		it('should do nothing if blocks not found', () => {
			const versionBefore = store.documentVersion;
			store.mergeBlocks('nonexistent', 'block-1');

			expect(store.blocks).toHaveLength(2);
			expect(store.documentVersion).toBe(versionBefore);
		});
	});

	describe('documentText derived property', () => {
		it('should return empty string for no blocks', () => {
			expect(store.documentText).toBe('');
		});

		it('should join block contents with newlines', () => {
			store.setBlocks([
				{ id: 'block-1', type: 'markdown', content: 'First', lineStart: 1, lineEnd: 1 },
				{ id: 'block-2', type: 'calculation', content: 'x = 10', lineStart: 2, lineEnd: 2 },
				{ id: 'block-3', type: 'markdown', content: 'Third', lineStart: 3, lineEnd: 3 }
			]);

			expect(store.documentText).toBe('First\nx = 10\nThird');
		});
	});

	describe('setVariableContext', () => {
		it('should set variable context', () => {
			const context = {
				x: {
					OriginalLine: 1,
					Value: { Value: 10, Symbol: '$', SourceFormat: '$10' }
				} as EvaluationResult
			};

			store.setVariableContext(context);

			expect(store.variableContext).toEqual(context);
		});
	});

	describe('setProcessing', () => {
		it('should set processing state', () => {
			expect(store.isProcessing).toBe(false);

			store.setProcessing(true);
			expect(store.isProcessing).toBe(true);

			store.setProcessing(false);
			expect(store.isProcessing).toBe(false);
		});
	});

	describe('updateBlockResults', () => {
		beforeEach(() => {
			store.setBlocks([
				{ id: 'block-1', type: 'markdown', content: '# Title', lineStart: 1, lineEnd: 1 },
				{ id: 'block-2', type: 'calculation', content: 'x = 10', lineStart: 2, lineEnd: 2 },
				{ id: 'block-3', type: 'calculation', content: 'y = x + 5', lineStart: 3, lineEnd: 3 }
			]);
		});

		it('should update blocks with classification data', () => {
			const classifications: LineClassification[] = [
				{ lineType: 'MARKDOWN', line: '# Title' },
				{ lineType: 'CALCULATION', line: 'x = 10' },
				{ lineType: 'CALCULATION', line: 'y = x + 5' }
			];

			store.updateBlockResults(classifications, {}, {}, []);

			expect(store.blocks[0].classification).toEqual([classifications[0]]);
			expect(store.blocks[1].classification).toEqual([classifications[1]]);
			expect(store.blocks[2].classification).toEqual([classifications[2]]);
		});

		it('should update blocks with tokens by line', () => {
			const tokensByLine: Record<number, Token[]> = {
				2: [
					{ type: 'IDENTIFIER', value: 'x', start: 0, end: 1 },
					{ type: 'ASSIGN', value: '=', start: 2, end: 3 },
					{ type: 'NUMBER', value: '10', start: 4, end: 6 }
				],
				3: [
					{ type: 'IDENTIFIER', value: 'y', start: 0, end: 1 },
					{ type: 'ASSIGN', value: '=', start: 2, end: 3 },
					{ type: 'IDENTIFIER', value: 'x', start: 4, end: 5 }
				]
			};

			store.updateBlockResults([], tokensByLine, {}, []);

			expect(store.blocks[1].tokens).toEqual({ 2: tokensByLine[2] });
			expect(store.blocks[2].tokens).toEqual({ 3: tokensByLine[3] });
		});

		it('should update blocks with diagnostics', () => {
			const diagnostics: Record<number, Diagnostic[]> = {
				3: [
					{
						severity: 'error',
						message: 'Undefined variable',
						range: {
							start: { line: 3, column: 4 },
							end: { line: 3, column: 5 }
						}
					}
				]
			};

			store.updateBlockResults([], {}, diagnostics, []);

			expect(store.blocks[2].diagnostics).toEqual({ 3: diagnostics[3] });
		});

		it('should update blocks with evaluation results', () => {
			const evaluationResults: EvaluationResult[] = [
				{
					OriginalLine: 2,
					Value: { Value: 10, Symbol: undefined, SourceFormat: '10' }
				},
				{
					OriginalLine: 3,
					Value: { Value: 15, Symbol: undefined, SourceFormat: '15' }
				}
			];

			store.updateBlockResults([], {}, {}, evaluationResults);

			expect(store.blocks[1].evaluationResults).toEqual([evaluationResults[0]]);
			expect(store.blocks[2].evaluationResults).toEqual([evaluationResults[1]]);
		});

		it('should handle multi-line blocks correctly', () => {
			store.setBlocks([
				{
					id: 'block-1',
					type: 'markdown',
					content: 'Line 1\nLine 2\nLine 3',
					lineStart: 1,
					lineEnd: 3
				}
			]);

			const classifications: LineClassification[] = [
				{ lineType: 'MARKDOWN', line: 'Line 1' },
				{ lineType: 'MARKDOWN', line: 'Line 2' },
				{ lineType: 'MARKDOWN', line: 'Line 3' }
			];

			store.updateBlockResults(classifications, {}, {}, []);

			expect(store.blocks[0].classification).toEqual(classifications);
		});
	});
});
