<script lang="ts">
	import CalculationLine from './CalculationLine.svelte';
	import type { Block } from '$lib/stores/blockStore.svelte';
	import {
		determineKeyboardAction,
		createKeyboardContext,
		shouldHandleKeyboardEvent
	} from '$lib/utils/keyboardInteractions';

	let {
		block,
		isActive = false,
		variableContext = {},
		onContentChange = (_content: string) => {
			void _content;
		},
		onEnter = () => {},
		onTab = () => {},
		onBackspaceAtStart = () => {},
		onBlur = () => {},
		onEscape = () => {},
		onPreviewClick = () => {}
	}: {
		block: Block;
		isActive: boolean;
		variableContext: Record<string, unknown>;
		onContentChange: (content: string) => void;
		onEnter: () => void;
		onTab: () => void;
		onBackspaceAtStart: () => void;
		onBlur: () => void;
		onEscape?: () => void;
		onPreviewClick?: () => void;
	} = $props();

	let textareaElement = $state(null);
	let showPreview = $derived(!isActive);

	/**
	 * FOCUS MANAGEMENT DESIGN:
	 * - Only ONE block can be in edit mode at any time (enforced by store.activeBlockId)
	 * - When isActive becomes true, this block transitions from preview → edit
	 * - We focus the textarea when it mounts (transitions to edit mode)
	 * - This prevents focus theft during typing because the textarea persists across re-renders
	 * - Zero blocks can be active (activeBlockId = null), meaning all are in preview
	 */

	// Focus the textarea when it first mounts (when switching to edit mode)
	$effect(() => {
		if (!showPreview && textareaElement) {
			textareaElement.focus();
		}
	});

	// Get tokens, diagnostics, and evaluation results for the first line of this block
	// (In MVP, calculation blocks are single-line)
	const lineNumber = $derived(block.lineStart);
	const tokens = $derived.by(() => {
		const t = (block.tokens && block.tokens[lineNumber]) || [];
		return t;
	});
	const diagnostics = $derived((block.diagnostics && block.diagnostics[lineNumber]) || []);
	const evaluationResult = $derived(
		block.evaluationResults?.find((r) => r.OriginalLine === lineNumber) || null
	);

	function handleInput(event: Event) {
		const value = (event.target as HTMLTextAreaElement).value;
		onContentChange(value);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!shouldHandleKeyboardEvent(event)) {
			return; // Let browser handle it
		}

		const context = createKeyboardContext(event, 'calculation');
		const action = determineKeyboardAction(context);

		switch (action.type) {
			case 'ESCAPE_TO_PREVIEW':
				event.preventDefault();
				onEscape();
				break;

			case 'TAB_TO_NEXT_BLOCK':
				event.preventDefault();
				onTab();
				break;

			case 'ENTER_NEW_CALCULATION_BLOCK':
				event.preventDefault();
				onEnter();
				break;

			case 'BACKSPACE_MERGE_WITH_PREVIOUS':
				event.preventDefault();
				onBackspaceAtStart();
				break;

			case 'ALLOW_DEFAULT':
				// Let browser handle it
				break;

			default:
				// No action needed
				break;
		}
	}

	function handlePreviewClick() {
		onPreviewClick();
	}

	export function focus() {
		textareaElement?.focus();
	}
</script>

<div class="calculation-block-editor">
	{#if showPreview}
		<!-- Preview mode: Show syntax-highlighted calculation -->
		<div
			class="preview-mode"
			onclick={handlePreviewClick}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Enter' && handlePreviewClick()}
		>
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
		cursor: pointer;
	}

	.preview-mode:hover {
		background: rgba(14, 165, 233, 0.05);
		border-radius: 4px;
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
