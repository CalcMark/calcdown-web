<script lang="ts">
	import CalculationBlockEditor from './CalculationBlockEditor.svelte';
	import MarkdownBlockEditor from './MarkdownBlockEditor.svelte';
	import type { Block } from '$lib/stores/blockStore.svelte';

	let {
		block,
		isActive = false,
		variableContext = {},
		onActivate = () => {},
		onContentChange = (_content: string) => {
			void _content;
		},
		onEnter = () => {},
		onTab = () => {},
		onBackspaceAtStart = () => {},
		onBlur = () => {}
	}: {
		block: Block;
		isActive: boolean;
		variableContext: Record<string, unknown>;
		onActivate: () => void;
		onContentChange: (content: string) => void;
		onEnter: () => void;
		onTab: () => void;
		onBackspaceAtStart: () => void;
		onBlur: () => void;
	} = $props();

	let editorElement = $state(null);

	// Focus the editor when block becomes active
	$effect(() => {
		if (isActive && editorElement) {
			editorElement.focus?.();
		}
	});

	function handleClick() {
		if (!isActive) {
			onActivate();
		}
	}
</script>

<div
	class="editable-block"
	class:active={isActive}
	class:calculation={block.type === 'calculation'}
	class:markdown={block.type === 'markdown'}
	onclick={handleClick}
	role="button"
	tabindex="-1"
>
	{#if block.type === 'calculation'}
		<CalculationBlockEditor
			bind:this={editorElement}
			{block}
			{isActive}
			{variableContext}
			{onContentChange}
			{onEnter}
			{onTab}
			{onBackspaceAtStart}
			{onBlur}
		/>
	{:else}
		<MarkdownBlockEditor
			bind:this={editorElement}
			{block}
			{isActive}
			{onContentChange}
			{onEnter}
			{onTab}
			{onBackspaceAtStart}
			{onBlur}
		/>
	{/if}
</div>

<style>
	.editable-block {
		margin: 4px 0;
		padding: 8px 12px;
		border-radius: 4px;
		border: 2px solid transparent;
		transition: all 0.15s ease;
		cursor: text;
		min-height: 32px;
	}

	.editable-block:hover {
		background: #f8fafc;
		border-color: #e2e8f0;
	}

	.editable-block.active {
		background: #ffffff;
		border-color: #0ea5e9;
		box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
	}

	.editable-block.calculation {
		background: #f0f9ff;
		border-left: 3px solid #0ea5e9;
	}

	.editable-block.calculation.active {
		background: #e0f2fe;
	}

	.editable-block.markdown {
		background: transparent;
	}

	.editable-block.markdown.active {
		background: #ffffff;
	}
</style>
