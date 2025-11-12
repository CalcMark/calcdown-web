<script lang="ts">
	import CalculationLine from './CalculationLine.svelte';
	import type { Block } from '$lib/stores/blockStore.svelte';

	let {
		block,
		isActive = false,
		variableContext = {},
		onContentChange = (content) => {},
		onEnter = () => {},
		onTab = () => {},
		onBackspaceAtStart = () => {},
		onBlur = () => {}
	} = $props();

	let textareaElement = $state(null);
	let showPreview = $derived(!isActive);

	// Get tokens, diagnostics, and evaluation results for the first line of this block
	// (In MVP, calculation blocks are single-line)
	const lineNumber = $derived(block.lineStart);
	const tokens = $derived((block.tokens && block.tokens[lineNumber]) || []);
	const diagnostics = $derived(
		(block.diagnostics && block.diagnostics[lineNumber]) || []
	);
	const evaluationResult = $derived(
		block.evaluationResults?.find((r) => r.OriginalLine === lineNumber) || null
	);

	function handleInput(event: Event) {
		const value = (event.target as HTMLTextAreaElement).value;
		onContentChange(value);
	}

	function handleKeyDown(event: KeyboardEvent) {
		const textarea = event.target as HTMLTextAreaElement;
		const { selectionStart, selectionEnd, value } = textarea;

		// TAB: Trigger evaluation
		if (event.key === 'Tab') {
			event.preventDefault();
			onTab();
			return;
		}

		// ENTER: Trigger evaluation and create new block
		if (event.key === 'Enter') {
			event.preventDefault();
			onEnter();
			return;
		}

		// BACKSPACE at start: Merge with previous block
		if (event.key === 'Backspace' && selectionStart === 0 && selectionEnd === 0) {
			event.preventDefault();
			onBackspaceAtStart();
			return;
		}
	}

	export function focus() {
		textareaElement?.focus();
	}
</script>

<div class="calculation-block-editor">
	{#if showPreview}
		<!-- Preview mode: Show syntax-highlighted calculation -->
		<div class="preview-mode">
			<CalculationLine
				{lineNumber}
				{tokens}
				{diagnostics}
				{evaluationResult}
				lineText={block.content}
				{variableContext}
			/>
		</div>
	{:else}
		<!-- Edit mode: Show textarea -->
		<div class="edit-mode">
			<textarea
				bind:this={textareaElement}
				value={block.content}
				oninput={handleInput}
				onkeydown={handleKeyDown}
				onblur={onBlur}
				placeholder="Enter a calculation..."
				rows="1"
				spellcheck="false"
			></textarea>
		</div>
	{/if}
</div>

<style>
	.calculation-block-editor {
		width: 100%;
	}

	.preview-mode {
		width: 100%;
		min-height: 24px;
	}

	.edit-mode {
		width: 100%;
	}

	textarea {
		width: 100%;
		min-height: 24px;
		padding: 4px 8px;
		border: none;
		background: transparent;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
		font-size: 16px;
		line-height: 1.8;
		color: #1e293b;
		resize: none;
		overflow: hidden;
		outline: none;
	}

	textarea::placeholder {
		color: #94a3b8;
	}

	/* Auto-resize textarea based on content */
	textarea {
		field-sizing: content;
	}
</style>
