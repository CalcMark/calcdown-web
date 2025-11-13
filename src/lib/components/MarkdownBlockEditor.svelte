<script lang="ts">
	import { marked } from 'marked';
	import type { Block } from '$lib/stores/blockStore.svelte';
	import {
		determineKeyboardAction,
		createKeyboardContext,
		shouldHandleKeyboardEvent
	} from '$lib/utils/keyboardInteractions';

	let {
		block,
		isActive = false,
		onContentChange = (_content: string) => {
			void _content;
		},
		onEnter = () => {},
		onTab = () => {},
		onBackspaceAtStart = () => {},
		onBlur = () => {},
		onEscape = () => {},
		onPreviewClick = () => {},
		onInsertNewLine = (_position: number) => {}
	}: {
		block: Block;
		isActive: boolean;
		onContentChange: (content: string) => void;
		onEnter: () => void;
		onTab: () => void;
		onBackspaceAtStart: () => void;
		onBlur: () => void;
		onEscape?: () => void;
		onPreviewClick?: () => void;
		onInsertNewLine?: (position: number) => void;
	} = $props();

	let textareaElement = $state(null);
	let showPreview = $derived(!isActive && block.content.trim().length > 0);
	let pendingCursorPosition = $state<number | null>(null);
	let textareaValue = $state(block.content);

	// Sync textareaValue with block.content when block changes from external source
	// But NOT during user typing (to avoid resetting the textarea)
	$effect(() => {
		// Only sync if we're not currently editing
		if (!isActive || document.activeElement !== textareaElement) {
			textareaValue = block.content;
		}
	});

	/**
	 * FOCUS MANAGEMENT DESIGN:
	 * - Only ONE block can be in edit mode at any time (enforced by store.activeBlockId)
	 * - When isActive becomes true, this block transitions from preview → edit
	 * - We focus the textarea when it mounts (transitions to edit mode)
	 * - This prevents focus theft during typing because the textarea persists across re-renders
	 * - Zero blocks can be active (activeBlockId = null), meaning all are in preview
	 */

	// Focus the textarea when in edit mode and restore cursor position
	// This effect runs when block content or active state changes
	$effect(() => {
		// Make block.content a dependency so effect runs when it changes
		const currentContent = block.content;
		const active = isActive;

		if (!showPreview && textareaElement) {
			const needsFocus = document.activeElement !== textareaElement;
			const hasPending = pendingCursorPosition !== null;

			if (needsFocus) {
				textareaElement.focus();
			}

			// Restore cursor position if we have a pending one
			if (hasPending) {
				const pos = pendingCursorPosition!;
				pendingCursorPosition = null;
				// Set cursor position immediately after focus
				textareaElement.setSelectionRange(pos, pos);
			}
		}
	});

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
		const textarea = event.target as HTMLTextAreaElement;
		const cursorPos = textarea.selectionStart;

		// Save cursor position before content change triggers re-render
		pendingCursorPosition = cursorPos;

		// textareaValue is already updated by bind:value
		// Just notify parent of the change
		onContentChange(textareaValue);

		// Restore focus and cursor immediately after the store update
		// This happens before Svelte re-renders with the new block.content
		queueMicrotask(() => {
			if (textarea && document.activeElement !== textarea) {
				textarea.focus();
			}
			if (textarea && pendingCursorPosition !== null) {
				textarea.setSelectionRange(pendingCursorPosition, pendingCursorPosition);
				pendingCursorPosition = null;
			}
		});
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!shouldHandleKeyboardEvent(event)) {
			return; // Let browser handle it
		}

		const context = createKeyboardContext(event, 'markdown');
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

			case 'ENTER_NEW_LINE': {
				// For markdown, allow adding a new line within the block
				// Let the default behavior happen (browser inserts newline)
				// The onContentChange will handle the update
				// Focus and cursor position are restored by the $effect
				break;
			}

			case 'ENTER_NEW_MARKDOWN_BLOCK':
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

<div class="markdown-block-editor">
	{#if showPreview}
		<!-- Preview mode: Show rendered markdown -->
		<div
			class="preview-mode markdown-content"
			onclick={handlePreviewClick}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Enter' && handlePreviewClick()}
		>
			{@html renderedHtml}
		</div>
	{:else}
		<!-- Edit mode: Show textarea -->
		<div class="edit-mode">
			<textarea
				bind:this={textareaElement}
				bind:value={textareaValue}
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
		cursor: pointer;
		padding: 4px 8px;
		margin: -4px -8px;
		border-radius: 4px;
	}

	.preview-mode:hover {
		background: rgba(14, 165, 233, 0.05);
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
