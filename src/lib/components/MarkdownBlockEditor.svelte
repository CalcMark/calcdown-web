<script lang="ts">
	import { marked } from 'marked';
	import type { Block } from '$lib/stores/blockStore.svelte';

	let {
		block,
		isActive = false,
		onContentChange = (_: string) => {},
		onEnter = () => {},
		onTab = () => {},
		onBackspaceAtStart = () => {},
		onBlur = () => {}
	}: {
		block: Block;
		isActive: boolean;
		onContentChange: (content: string) => void;
		onEnter: () => void;
		onTab: () => void;
		onBackspaceAtStart: () => void;
		onBlur: () => void;
	} = $props();

	let textareaElement = $state(null);
	let showPreview = $derived(!isActive && block.content.trim().length > 0);

	// Rendered HTML for preview
	const renderedHtml = $derived.by(() => {
		if (block.content.trim().length === 0) return '';
		try {
			return marked.parse(block.content, { breaks: true, gfm: true });
		} catch (e) {
			console.error('Markdown rendering error:', e);
			return '';
		}
	});

	function handleInput(event: Event) {
		const value = (event.target as HTMLTextAreaElement).value;
		onContentChange(value);
	}

	function handleKeyDown(event: KeyboardEvent) {
		const textarea = event.target as HTMLTextAreaElement;
		const { selectionStart, selectionEnd } = textarea;

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

<div class="markdown-block-editor">
	{#if showPreview}
		<!-- Preview mode: Show rendered markdown -->
		<div class="preview-mode markdown-content">
			{@html renderedHtml}
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
				placeholder="Type markdown or calculations..."
				rows="1"
				spellcheck="false"
			></textarea>
		</div>
	{/if}
</div>

<style>
	.markdown-block-editor {
		width: 100%;
		min-height: 24px;
	}

	.preview-mode {
		width: 100%;
		color: #1e293b;
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

	/* Markdown preview styling */
	.markdown-content :global(p),
	.markdown-content :global(h1),
	.markdown-content :global(h2),
	.markdown-content :global(h3),
	.markdown-content :global(h4),
	.markdown-content :global(h5),
	.markdown-content :global(h6),
	.markdown-content :global(ul),
	.markdown-content :global(ol),
	.markdown-content :global(blockquote) {
		margin-top: 0;
		margin-bottom: 0.5em;
	}

	.markdown-content :global(*:last-child) {
		margin-bottom: 0;
	}

	.markdown-content :global(a) {
		color: #0ea5e9;
		text-decoration: none;
	}

	.markdown-content :global(a:hover) {
		text-decoration: underline;
	}

	.markdown-content :global(code) {
		background: #f1f5f9;
		padding: 2px 6px;
		border-radius: 3px;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 0.9em;
	}

	.markdown-content :global(blockquote) {
		border-left: 3px solid #cbd5e1;
		padding-left: 16px;
		color: #64748b;
		font-style: italic;
	}

	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		padding-left: 24px;
	}
</style>
