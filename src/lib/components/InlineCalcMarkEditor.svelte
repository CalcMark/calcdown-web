<script>
	import { createEditorStore } from '$lib/stores/blockStore.svelte';
	import {
		documentToBlocks,
		blocksToDocument,
		generateBlockId,
		recalculateLineNumbers
	} from '$lib/utils/blockConversion';
	import EditableBlock from './EditableBlock.svelte';

	const SAMPLE_DOCUMENT = `# CalcMark Demo - Mixing Markdown and Calculations

This is a demonstration of **CalcMark**, a language that blends *calculations* with _markdown_. Learn more at [CalcMark on GitHub](https://github.com).

> CalcMark uses "calculation by exclusion" - lines are greedily interpreted as calculations whenever possible.

## Key Features

- Seamless markdown integration
- Unicode support for variables
- Multiple currency formats

## Percentage Literals ✅

Percentages work! 20% means 0.20:
discount = 20%
tax_rate = 8.5%
growth = 150%
tip = $100 * 15%

Note: The ⭐ and ✅ emoji in this markdown are fine!

## Modulus vs Percentage

Ambiguous (will show hint):
remainder = 10 %3

Clear modulus:
mod_result = 10 % 3

## Unicode Support 🌏

Emoji variables work great:
🏠 = $1_500
🍕 = $800
💡 = $200
total_expenses = 🏠 + 🍕 + 💡

Chinese characters:
工资 = $5_000
奖金 = $500
总收入 = 工资 + 奖金

Arabic characters:
السعر = $100
الكمية = 5
المجموع = السعر * الكمية

Emoji with skin tone modifier:
👍🏻 = 10

## Currency & Quantities

Multiple currency symbols:
price1 = $100
price2 = €50
price3 = £75
price4 = ¥1000

ISO currency codes:
usd_amount = USD100
gbp_amount = GBP50
eur_amount = EUR75

Thousands separators:
big_number = $1,234,567.89
underscore = $1_000_000

## Error Example

This will show an error (undefined variable):
undefined_calc = missing_var + 100

## Comparisons

Boolean comparisons work:
is_affordable = total_expenses < 总收入
has_surplus = 总收入 > $4_000
exact_match = 工资 == $5_000`;

	// Initialize editor store
	const store = createEditorStore(SAMPLE_DOCUMENT);

	// State
	let error = $state(null);
	let debounceTimer = $state(null);
	const DEBOUNCE_MS = 150;

	// Initialize blocks from sample document
	$effect(() => {
		const initialBlocks = documentToBlocks(SAMPLE_DOCUMENT);
		store.setBlocks(initialBlocks);
		// Trigger initial evaluation
		processDocument();
	});

	// Process document through server API
	async function processDocument() {
		store.setProcessing(true);
		error = null;

		try {
			const documentText = store.documentText;

			const response = await fetch('/api/process', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ input: documentText })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Server error');
			}

			const result = await response.json();

			// Update blocks with evaluation results
			store.updateBlockResults(
				result.classifications || [],
				result.tokensByLine || {},
				result.diagnostics || {},
				result.evaluationResults || []
			);

			// Update variable context
			store.setVariableContext(result.variableContext || {});

			// Rebuild blocks based on new classifications
			const newBlocks = documentToBlocks(documentText, result.classifications || []);

			// Preserve block IDs where possible to maintain focus
			const updatedBlocks = newBlocks.map((newBlock, index) => {
				const oldBlock = store.blocks[index];
				if (oldBlock && oldBlock.content === newBlock.content) {
					return { ...newBlock, id: oldBlock.id };
				}
				return newBlock;
			});

			store.setBlocks(updatedBlocks);
		} catch (err) {
			error = err.message;
			console.error('Processing error:', err);
		} finally {
			store.setProcessing(false);
		}
	}

	// Debounced evaluation
	function scheduleEvaluation() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			processDocument();
			debounceTimer = null;
		}, DEBOUNCE_MS);
	}

	// Block event handlers
	function handleBlockActivate(blockId) {
		store.setActiveBlock(blockId);
	}

	function handleBlockContentChange(blockId, content) {
		store.updateBlockContent(blockId, content);
		scheduleEvaluation();
	}

	function handleBlockEnter(blockId) {
		// Trigger evaluation immediately
		processDocument();

		// Create new block after current block
		const newBlock = {
			id: generateBlockId(),
			type: 'markdown',
			content: '',
			lineStart: 0,
			lineEnd: 0
		};

		store.insertBlockAfter(blockId, newBlock);

		// Recalculate line numbers
		const updatedBlocks = recalculateLineNumbers(store.blocks);
		store.setBlocks(updatedBlocks);

		// Set new block as active
		store.setActiveBlock(newBlock.id);
	}

	function handleBlockTab(blockId) {
		// Trigger evaluation immediately
		processDocument();
	}

	function handleBlockBackspaceAtStart(blockId) {
		const blockIndex = store.blocks.findIndex((b) => b.id === blockId);
		if (blockIndex > 0) {
			const previousBlockId = store.blocks[blockIndex - 1].id;

			// Merge current block into previous block
			store.mergeBlocks(blockId, previousBlockId);

			// Recalculate line numbers
			const updatedBlocks = recalculateLineNumbers(store.blocks);
			store.setBlocks(updatedBlocks);

			// Set previous block as active
			store.setActiveBlock(previousBlockId);

			// Trigger evaluation
			scheduleEvaluation();
		}
	}

	function handleBlockBlur(blockId) {
		// Keep block active for now (we can change this behavior later)
		// store.setActiveBlock(null);
	}
</script>

<div class="inline-editor-container">
	<h1>CalcMark Editor (MVP)</h1>

	{#if error}
		<div class="error">Error: {error}</div>
	{/if}

	{#if store.isProcessing}
		<div class="processing-indicator">Processing...</div>
	{/if}

	<div class="editor-content">
		{#each store.blocks as block (block.id)}
			<EditableBlock
				bind:block
				isActive={store.activeBlockId === block.id}
				variableContext={store.variableContext}
				onActivate={() => handleBlockActivate(block.id)}
				onContentChange={(content) => handleBlockContentChange(block.id, content)}
				onEnter={() => handleBlockEnter(block.id)}
				onTab={() => handleBlockTab(block.id)}
				onBackspaceAtStart={() => handleBlockBackspaceAtStart(block.id)}
				onBlur={() => handleBlockBlur(block.id)}
			/>
		{/each}
	</div>
</div>

<style>
	.inline-editor-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 20px;
		font-family: system-ui, -apple-system, sans-serif;
		min-height: 100vh;
		background: #f5f5f5;
	}

	h1 {
		margin-bottom: 30px;
		font-size: 28px;
		font-weight: 600;
		color: #1e293b;
	}

	.error {
		margin-bottom: 20px;
		padding: 16px;
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 4px;
		color: #c00;
		font-size: 14px;
	}

	.processing-indicator {
		position: fixed;
		top: 20px;
		right: 20px;
		padding: 8px 16px;
		background: #0ea5e9;
		color: white;
		border-radius: 4px;
		font-size: 14px;
		font-weight: 500;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		z-index: 1000;
	}

	.editor-content {
		background: white;
		border-radius: 8px;
		padding: 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		min-height: 400px;
	}
</style>
