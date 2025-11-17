<!--
 * WYSIWYG CalcMark Editor
 *
 * Architecture:
 * - Textarea (invisible) = source of truth, browser manages cursor
 * - Rendered overlay (visible) = shows formatted output
 * - Client-side WASM (Web Worker) processes all classification/tokenization/evaluation
 * - Viewport-aware: only evaluate visible lines
 -->
<script lang="ts">
	import { CalcMarkDocument } from '$lib/state/CalcMarkDocument';
	import { LineContext } from '$lib/state/LineContext.svelte';
	import { CursorManager } from '$lib/state/CursorManager.svelte';
	import { USER_INPUT_DEBOUNCE_MS } from '$lib/constants';
	import { renderLine, formatValue } from '$lib/utils/wysiwygRenderer';
	import { onMount } from 'svelte';
	import LineHoverOverlay from './LineHoverOverlay.svelte';
	import { createWorkerManager } from '$lib/client/calcmarkWorkerManager';

	let { initialText = '' } = $props();

	const doc = new CalcMarkDocument(initialText);
	const lineContext = new LineContext(doc);
	const cursorManager = new CursorManager();
	// Each Editor gets its own dedicated worker for predictable initialization
	// Worker will be created in onMount and terminated in cleanup
	let workerManager = $state<ReturnType<typeof createWorkerManager> | null>(null);

	let textareaElement = $state<HTMLTextAreaElement | null>(null);
	let overlayElement = $state<HTMLDivElement | null>(null);
	let containerElement = $state<HTMLDivElement | null>(null);
	let gutterElement = $state<HTMLDivElement | null>(null);

	let rawText = $state(doc.getRawText());
	let lines = $state(doc.getLines());

	// Timer handles - using 'any' is standard for setTimeout/setInterval return values
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let debounceTimer: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let scrollTimer: any = null;

	// Typing state - controls whether we show textarea or overlay
	let isTyping = $state(false);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let typingTimer: any = null;

	// Custom cursor state
	// CRITICAL: Native caret is ALWAYS hidden (see .raw-textarea CSS)
	// Custom cursor visibility is controlled by isTyping flag
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let customCursorTimer: any = null;
	// Note: cursorPosition, cursorVisible, cursorBlinkInterval now managed by CursorManager

	// Smooth transition state
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used in error handler (line 413), linter doesn't detect catch/finally usage
	let overlayOpacity = $state(1);

	/**
	 * SYNCHRONIZATION FLAGS - Prevent race conditions and feedback loops
	 *
	 * Pattern inspired by ProseMirror's "updating" flag:
	 * - Ensures one-way data flow at a time
	 * - Prevents bind:value from writing back during user input
	 * - Prevents evaluation from interfering with active typing
	 */
	let isUpdatingFromUser = $state(false);
	let isUpdatingFromEvaluation = $state(false);

	onMount(() => {
		// Create dedicated worker for this editor instance
		// Each component gets its own worker for predictable initialization
		workerManager = createWorkerManager();

		// Set initial textarea value programmatically
		// This is necessary because we removed bind:value's two-way binding
		if (textareaElement) {
			textareaElement.value = rawText;
			// Set cursor to beginning (0,0) on initial load
			// Without this, browser defaults to end of text
			textareaElement.selectionStart = 0;
			textareaElement.selectionEnd = 0;
		}

		// Initialize cursor manager with DOM elements
		if (textareaElement && overlayElement) {
			cursorManager.init(textareaElement, overlayElement, doc);
		}

		// Wait for worker to be ready before initial evaluation
		// This prevents race condition where editor loads without syntax highlighting
		workerManager.waitForInit().then(() => {
			evaluateDocument();
		}).catch((error) => {
			console.error('[Editor] Failed to initialize worker:', error);
			// Continue anyway - try evaluating (will fail gracefully)
			evaluateDocument();
		});

		// Sync scroll between textarea, overlay, and gutter
		if (textareaElement && overlayElement && gutterElement) {
			textareaElement.addEventListener('scroll', () => {
				if (overlayElement && textareaElement && gutterElement) {
					overlayElement.scrollTop = textareaElement.scrollTop;
					overlayElement.scrollLeft = textareaElement.scrollLeft;
					gutterElement.scrollTop = textareaElement.scrollTop;
				}
			});
		}

		// Track cursor position for visual overlay
		if (textareaElement) {
			// Update line context when cursor moves
			const updateLineContext = () => {
				lineContext.setCursorLine(cursorManager.line);
			};

			// Handle navigation keys - show cursor immediately
			const handleNavigation = (event: KeyboardEvent) => {
				const navigationKeys = [
					'ArrowUp',
					'ArrowDown',
					'ArrowLeft',
					'ArrowRight',
					'Home',
					'End',
					'PageUp',
					'PageDown'
				];

				if (navigationKeys.includes(event.key)) {
					// Navigation: show cursor immediately (no delay)
					isTyping = false;
					cursorManager.show();
					cursorManager.startBlink();
				}
			};

			textareaElement.addEventListener('keydown', handleNavigation);
			textareaElement.addEventListener('keyup', () => {
				cursorManager.updateFromTextarea();
				updateLineContext();
			});
			textareaElement.addEventListener('mouseup', () => {
				// Mouse click: update position and show cursor immediately
				cursorManager.updateFromTextarea();
				isTyping = false;
				cursorManager.show();
				cursorManager.startBlink();
				updateLineContext();
			});
			textareaElement.addEventListener('click', () => {
				// Click: update position and show cursor immediately
				cursorManager.updateFromTextarea();
				isTyping = false;
				cursorManager.show();
				cursorManager.startBlink();
				updateLineContext();
			});
			textareaElement.addEventListener('focus', () => {
				if (!isTyping) {
					cursorManager.startBlink();
				}
			});
			textareaElement.addEventListener('blur', () => {
				cursorManager.stopBlink();
				lineContext.setCursorLine(null);
			});
		}

		return () => {
			cursorManager.destroy();
			// Clean up Web Worker
			if (workerManager) {
				workerManager.terminate();
			}
		};
	});

	/**
	 * Prevent bind:value feedback loop using synchronization flags
	 *
	 * This $effect ensures that we NEVER update the textarea during user input.
	 * The textarea is the source of truth - we only READ from it, never WRITE to it
	 * during or immediately after user input.
	 *
	 * The flags ensure one-way data flow:
	 * - User types → textarea changes → we read it → update state
	 * - Evaluation → overlay updates → textarea UNCHANGED
	 */
	$effect(() => {
		// NEVER update textarea during user input
		// The isUpdatingFromUser flag is set BEFORE rawText changes,
		// and cleared AFTER via queueMicrotask
		if (isUpdatingFromUser || isUpdatingFromEvaluation) {
			return;
		}

		// This should only execute on initial load or programmatic changes
		// NOT during normal typing
		if (textareaElement && textareaElement.value !== rawText) {
			// Store cursor position before update
			const savedCursor = textareaElement.selectionStart;
			const savedCursorEnd = textareaElement.selectionEnd;

			textareaElement.value = rawText;

			// Restore cursor position IMMEDIATELY
			// This prevents cursor jumping to end when value is set
			textareaElement.selectionStart = savedCursor;
			textareaElement.selectionEnd = savedCursorEnd;
		}
	});

	// === Keyboard and Selection Event Handlers ===

	/**
	 * Handle user typing
	 *
	 * SIMPLE APPROACH: Show plain textarea while typing, overlay when idle.
	 * - User sees native text + native cursor (instant, zero lag)
	 * - Overlay with syntax highlighting appears after typing pauses
	 * - No complex DOM reconciliation during input
	 */
	function handleInput() {
		if (!textareaElement || isUpdatingFromEvaluation) return;

		// Mark as typing - hides custom cursor during input
		isTyping = true;
		cursorManager.hide(); // Hide custom cursor immediately when typing
		if (typingTimer) clearTimeout(typingTimer);
		if (customCursorTimer) clearTimeout(customCursorTimer);

		// Track typing time for render blocking
		lastInputTime = Date.now();

		// Set flag BEFORE updating any state
		isUpdatingFromUser = true;

		try {
			// Read from textarea (source of truth)
			rawText = textareaElement.value;
			doc.updateRawText(rawText);

			// Update overlay IMMEDIATELY to show new text (without syntax highlighting yet)
			// Version tracking ensures only changed lines re-render
			lines = doc.getLines();

			// Show custom cursor after typing stops
			typingTimer = setTimeout(() => {
				isTyping = false;
				cursorManager.show(); // Show cursor immediately
				cursorManager.startBlink(); // Start blinking
			}, USER_INPUT_DEBOUNCE_MS);

			scheduleEvaluation();
		} finally {
			queueMicrotask(() => {
				isUpdatingFromUser = false;
			});
		}
	}

	// Track time of last user input to prevent render updates during active typing
	let lastInputTime = 0;
	let renderUpdateTimer: ReturnType<typeof setTimeout> | null = null;

	function scheduleEvaluation() {
		if (debounceTimer) clearTimeout(debounceTimer);

		debounceTimer = setTimeout(() => {
			evaluateDocument();
		}, USER_INPUT_DEBOUNCE_MS);
	}

	/**
	 * Schedule a render update, but NEVER while user is actively typing.
	 * This is critical - rendering MUST NOT interfere with typing.
	 *
	 * We wait until at least 100ms after the last keystroke before applying
	 * any visual updates. This ensures buttery-smooth typing with zero dropped characters.
	 */
	function scheduleRenderUpdate(updateFn: () => void) {
		// Clear any pending render update
		if (renderUpdateTimer) {
			clearTimeout(renderUpdateTimer);
		}

		const timeSinceLastInput = Date.now() - lastInputTime;
		const MIN_IDLE_TIME = 100; // Wait 100ms of idle time before rendering

		if (timeSinceLastInput < MIN_IDLE_TIME) {
			// User is actively typing - delay the update
			const delay = MIN_IDLE_TIME - timeSinceLastInput;

			renderUpdateTimer = setTimeout(() => {
				// Recursively check if user is still typing
				scheduleRenderUpdate(updateFn);
			}, delay);
		} else {
			// User has stopped typing - safe to render
			updateFn();
			renderUpdateTimer = null;
		}
	}

	/**
	 * Evaluate document and update overlay
	 *
	 * CRITICAL: Uses synchronization flag to prevent interfering with user input.
	 * - Sets isUpdatingFromEvaluation before any DOM/state changes
	 * - NEVER modifies textarea value (only reads it)
	 * - Only updates overlay rendering (lines, tokens, diagnostics)
	 * - Clears flag after all updates complete
	 *
	 * NOW USING CLIENT-SIDE WASM: Evaluation happens in Web Worker (<5ms)
	 * instead of server round-trip (100-300ms). This eliminates typing interruptions.
	 */
	async function evaluateDocument() {
		// Skip evaluation if user is actively typing
		if (isUpdatingFromUser) {
			return;
		}

		// Skip evaluation if worker not yet initialized
		if (!workerManager) {
			return;
		}

		isUpdatingFromEvaluation = true;

		// Store current cursor position
		const currentCursorPos = textareaElement?.selectionStart || 0;

		try {
			const { text, offset} = doc.getTextForEvaluation();

			// Use Web Worker for instant evaluation (no network round-trip!)
			const results = await workerManager.evaluate(text, offset);

			// Don't fade during active editing - it feels sluggish
			// overlayOpacity = 0.7;  // Removed - causes confusion during typing/deleting

			// Track which lines are being updated to minimize re-renders
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- Local variable in function scope, not reactive state
			const changedLineNumbers = new Set<number>();

			// Update document state
			doc.updateClassifications(results.classifications);
			// Classifications update all lines in the evaluation range
			// Track them all as changed
			const range = doc.getEvaluationRange();
			for (let i = range.start; i <= range.end; i++) {
				changedLineNumbers.add(i);
			}

			// Update tokens for calculation lines
			// tokensByLine is built server-side with i+1, so it's 1-indexed
			for (const [lineStr, tokens] of Object.entries(results.tokensByLine)) {
				const serverLineNumber = Number(lineStr);
				const documentLineNumber = CalcMarkDocument.serverLineToDocumentLine(
					serverLineNumber,
					true,
					offset
				);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- WASM worker returns dynamic token structures
				doc.updateTokens(documentLineNumber, tokens as any[]);
				changedLineNumbers.add(documentLineNumber);
			}

			// Update diagnostics
			// IMPORTANT: validate() returns 0-indexed line numbers (comes directly from WASM)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- WASM worker returns dynamic diagnostic structures
			const adjustedDiagnostics: Record<number, any[]> = {};
			for (const [lineStr, diags] of Object.entries(results.diagnostics)) {
				const serverLineNumber = Number(lineStr);
				const documentLineNumber = CalcMarkDocument.serverLineToDocumentLine(
					serverLineNumber,
					false,
					offset
				);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- WASM worker diagnostic structures are dynamic
				adjustedDiagnostics[documentLineNumber] = diags as any[];
				changedLineNumbers.add(documentLineNumber);
			}
			doc.updateDiagnostics(adjustedDiagnostics);

			// Update calculation results
			doc.updateEvaluationResults(results.evaluationResults, results.variableContext, offset);
			// Calculation results also change lines
			for (const result of results.evaluationResults) {
				const documentLineNumber = CalcMarkDocument.serverLineToDocumentLine(
					result.OriginalLine,
					true,
					offset
				);
				changedLineNumbers.add(documentLineNumber);
			}

			// CRITICAL: Schedule the DOM update using requestAnimationFrame
			// This prevents dropped characters during fast typing by ensuring
			// the render happens during the browser's rendering phase, not during
			// active input event handling
			scheduleRenderUpdate(() => {
				// Trigger re-render (ONLY overlay, NOT textarea)
				// IMPORTANT: updateRawText() already reuses Line objects for unchanged lines,
				// so Svelte's keyed #each will only re-render lines that have actually changed.
				lines = doc.getLines();

				// Fade back in
				overlayOpacity = 1;

				// CRITICAL: NEVER write to textarea.value here!
				// Only restore cursor position if browser lost it
				if (textareaElement && textareaElement.selectionStart !== currentCursorPos) {
					textareaElement.selectionStart = currentCursorPos;
					textareaElement.selectionEnd = currentCursorPos;
				}

				// Note: Cursor updates are now handled by cursorManager
			});
		} catch (error) {
			console.error('Evaluation error:', error);
			overlayOpacity = 1;
		} finally {
			isUpdatingFromEvaluation = false;
		}
	}

	// Handle scroll (debounced viewport update)
	function handleScroll() {
		if (!textareaElement) return;

		// CRITICAL: Synchronize gutter position immediately (no debounce)
		// Gutter must stay aligned with editor at all times
		// Use transform for better performance than scrollTop
		if (gutterElement) {
			const scrollTop = textareaElement.scrollTop;
			gutterElement.style.transform = `translateY(-${scrollTop}px)`;
		}

		// Debounce viewport calculation and evaluation
		if (scrollTimer) clearTimeout(scrollTimer);

		scrollTimer = setTimeout(() => {
			if (!textareaElement || !overlayElement) return;

			// Dynamically calculate line height from rendered elements
			// This ensures viewport calculations work correctly regardless of font changes
			const computedStyle = window.getComputedStyle(overlayElement);
			const fontSize = parseFloat(computedStyle.fontSize) || 16;
			const lineHeightRatio = parseFloat(computedStyle.lineHeight) / fontSize || 1.75;
			const lineHeight = fontSize * lineHeightRatio;

			const scrollTop = textareaElement.scrollTop;
			const clientHeight = textareaElement.clientHeight;

			const firstVisible = Math.floor(scrollTop / lineHeight);
			const lastVisible = Math.ceil((scrollTop + clientHeight) / lineHeight);

			doc.updateViewport(firstVisible, lastVisible);
			evaluateDocument();
		}, 300);
	}

	// All rendering logic moved to wysiwygRenderer.ts for better maintainability

	// === Cursor Visualization ===

	// Cursor management now handled by CursorManager
	// Old functions removed - cursor position is automatically derived from textarea.selectionStart

	// === Click-to-Position Mapping ===
</script>

<div class="wysiwyg-container" bind:this={containerElement}>
	<!-- Main editor area -->
	<div class="editor-area">
		<!-- Actual textarea (invisible but editable) -->
		<!--
			CRITICAL: NO bind:value!
			- Removed bind:value to prevent feedback loop race conditions
			- Textarea value is managed manually via $effect with synchronization flags
			- This prevents bind:value from writing back during user input events
			- Pattern based on ProseMirror/CodeMirror "updating flag" approach
		-->
		<textarea
			bind:this={textareaElement}
			oninput={handleInput}
			onscroll={handleScroll}
			class="raw-textarea hide-native-cursor"
			spellcheck="false"
			placeholder="Type CalcMark here..."
		></textarea>

		<!-- Rendered overlay (always visible, updates incrementally) -->
		<div bind:this={overlayElement} class="rendered-overlay">
			{#each lines as line (line.lineNumber)}
				<div
					class="line"
					role="presentation"
					data-line={line.lineNumber}
					onmouseenter={() => lineContext.setHoveredLine(line.lineNumber)}
					onmouseleave={() => lineContext.setHoveredLine(null)}
				>
					<!-- renderLine() returns sanitized HTML with syntax highlighting - all content is escaped via escapeHtml() -->
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- Content is sanitized via escapeHtml() in wysiwygRenderer.ts before rendering -->
					{@html renderLine(line, doc)}
				</div>
			{/each}
		</div>

		<!-- Custom cursor - hidden while typing, visible otherwise -->
		<!-- CRITICAL: Always render to avoid DOM add/remove delays. Use CSS for visibility. -->
		<div
			class="custom-cursor"
			class:visible={cursorManager.cursorVisible && !isTyping}
			class:hidden={!cursorManager.cursorVisible || isTyping}
			style="top: {cursorManager.y}px; left: {cursorManager.x}px; height: {cursorManager.height}px;"
		></div>
	</div>

	<!-- Right gutter for computed values, hints, warnings -->
	<div class="gutter">
		<div class="gutter-content" bind:this={gutterElement}>
			{#each lines as line (line.lineNumber)}
				<div
					class="gutter-line"
					role="presentation"
					data-line={line.lineNumber}
					class:has-result={!!line.calculationResult}
					onmouseenter={() => lineContext.setHoveredLine(line.lineNumber)}
					onmouseleave={() => lineContext.setHoveredLine(null)}
				>
					{#if line.calculationResult}
						<div class="gutter-result">
							{formatValue(line.calculationResult.Value)}
						</div>
					{:else}
						<!-- Empty lines need a non-breaking space to maintain height and alignment -->
						&nbsp;
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Hover effects overlay - spans entire container (editor + gutter) -->
	<LineHoverOverlay {lineContext} {overlayElement} />
</div>

<style>
	.wysiwyg-container {
		/* CSS Variables - all dimensions derived from base font size */
		--editor-font-size: 1rem; /* 16px default, but scales with user preferences */
		--editor-line-height: 1.75; /* Ratio - always proportional to font size */
		--editor-padding: 2.5rem; /* Scales with root font size */
		--gutter-padding-inline: 1rem;
		--gutter-min-width: 9.375rem; /* 150px at default font size */
		--gutter-preferred-width: 30vw;
		--gutter-max-width: 60vw;
		--cursor-width: 0.125rem; /* 2px at default, but scales */
		--spacing-xs: 0.25rem;
		--spacing-sm: 0.5rem;
		--spacing-md: 0.75rem;
		--border-radius-sm: 0.25rem;
		--animation-duration: 200ms;

		/* Colors */
		--color-text: #1e293b;
		--color-text-muted: #64748b;
		--color-primary: #0ea5e9;
		--color-primary-bg: transparent; /* Removed background for cleaner appearance */
		--color-primary-bg-light: transparent; /* Removed background for cleaner appearance */
		--color-selection: rgba(14, 165, 233, 0.2);
		--color-accent: #7c3aed;
		--color-border: #e2e8f0;

		/* Theme colors - swappable backgrounds */
		--color-bg-editor: #ffffff; /* White for main editor */
		--color-bg-gutter: #f8fafc; /* Light gray for gutter */

		/* CRITICAL: Use flex:1 with min-height:0 to respect parent constraints */
		/* height:100% creates circular dependency in flex containers */
		width: 100%;
		flex: 1 1 0;
		min-height: 0;
		display: flex;
		flex-direction: row;
		overflow: hidden;

		/* CRITICAL: Establish positioning context for LineHoverOverlay */
		position: relative;
	}

	.editor-area {
		/* Fill remaining horizontal space */
		flex: 1;
		position: relative;
		overflow: hidden;
		background: var(--color-bg-editor);
	}

	.raw-textarea {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		max-width: 100%;
		height: 100%;
		padding: var(--editor-padding);
		margin: 0;
		border: none;
		outline: none;
		resize: none;
		font-family: var(--font-family);
		font-size: var(--editor-font-size);
		/* CRITICAL: line-height MUST match overlay for cursor/text alignment */
		/* Native cursor height = line-height (cannot be changed via CSS) */
		/* To make cursor shorter, we would need custom cursor overlay */
		line-height: var(--editor-line-height);
		/* ALWAYS transparent - overlay shows content, no flashing */
		color: transparent;
		caret-color: var(--color-text);
		background: transparent;
		z-index: 2; /* Above overlay to receive all pointer events */
		overflow-y: auto;
		overflow-x: hidden;
		white-space: pre-wrap;
		word-wrap: break-word;
		word-break: break-word;
		overflow-wrap: break-word;
		/* Ensure text box sizing includes padding */
		box-sizing: border-box;
		/* Allow text selection in textarea */
		pointer-events: auto;
	}

	/* Hide native cursor when custom cursor is active */
	.raw-textarea.hide-native-cursor {
		caret-color: transparent;
	}

	.raw-textarea::selection {
		background: var(--color-selection);
	}

	.rendered-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		max-width: 100%;
		height: 100%;
		padding: var(--editor-padding);
		overflow: hidden;
		/* Allow pointer events to pass through to textarea above */
		pointer-events: none;
		z-index: 1; /* Below textarea so textarea receives all events */
		font-family: var(--font-family);
		font-size: var(--editor-font-size);
		line-height: var(--editor-line-height);
		color: var(--color-text);
		white-space: pre-wrap;
		word-wrap: break-word;
		word-break: break-word;
		overflow-wrap: break-word;
		/* Ensure text box sizing includes padding */
		box-sizing: border-box;
		/* Smooth fade in/out */
		opacity: 1;
		transition: opacity 0.15s ease;
	}

	.line {
		/* CRITICAL: min-height prevents empty lines from collapsing to 0px */
		/* Without this, blank markdown lines collapse and cause gutter misalignment */
		min-height: calc(var(--editor-font-size) * var(--editor-line-height));
		overflow-wrap: anywhere;
		word-break: break-word;
		hyphens: none;
		pointer-events: auto; /* Enable hover events on lines */
	}

	.line :global(*) {
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	/* Reset margins on markdown elements to prevent vertical misalignment */
	.rendered-overlay :global(h1),
	.rendered-overlay :global(h2),
	.rendered-overlay :global(h3),
	.rendered-overlay :global(h4),
	.rendered-overlay :global(h5),
	.rendered-overlay :global(h6),
	.rendered-overlay :global(p),
	.rendered-overlay :global(blockquote),
	.rendered-overlay :global(ul),
	.rendered-overlay :global(ol) {
		margin: 0;
		padding: 0;
	}

	.gutter {
		/* Fixed width, fills height of parent */
		flex-shrink: 0;
		width: clamp(var(--gutter-min-width), var(--gutter-preferred-width), var(--gutter-max-width));
		position: relative;
		background: var(--color-bg-gutter);
		border-left: 1px solid var(--color-border);
		padding-block: var(--editor-padding);
		padding-inline: var(--gutter-padding-inline);
		overflow: hidden;
	}

	.gutter-content {
		position: relative;
		width: 100%;
		/* CRITICAL: No padding here - padding is on parent container */
		/* This ensures transform translateY works correctly for scroll sync */
		/* Content can overflow but won't show scrollbars */
		overflow: hidden;
	}

	@media (max-width: 48rem) {
		/* 768px at default font size */
		.gutter {
			display: none;
		}

		.editor-area {
			max-width: 100%;
		}

		:global(.calculation::after) {
			content: attr(data-result);
			color: var(--color-primary);
			font-weight: 600;
			margin-left: var(--spacing-md);
		}
	}

	.gutter-line {
		/* Match the natural line height from overlay - no explicit height needed */
		/* Safari/WebKit calculates line-height differently than Chrome, so letting */
		/* it flow naturally ensures perfect alignment across all browsers */
		line-height: var(--editor-line-height);
		/* CRITICAL: Do NOT use flexbox centering - it breaks vertical alignment with overlay */
		/* The overlay lines use natural text flow, so gutter must do the same */
		margin: 0;
		padding: 0;
		position: relative;
		/* Match font size exactly with the overlay to ensure line-height is calculated identically */
		font-size: var(--editor-font-size);
	}

	.gutter-result {
		color: var(--color-primary);
		font-weight: 600;
		/* Match editor font size exactly - Roboto has good metrics for alignment */
		font-size: var(--editor-font-size);
		font-family: var(--font-family);
		animation: fadeIn var(--animation-duration) ease-in;
		padding-inline: var(--spacing-sm);
		/* CRITICAL: Zero vertical padding to prevent misalignment with overlay lines */
		padding-block: 0;
		border-radius: var(--border-radius-sm);
		/* background removed for cleaner appearance */
		white-space: nowrap;
		/* Display inline-block to work with line-height properly */
		display: inline-block;
		/* Align to baseline to match text flow in overlay */
		vertical-align: baseline;
		/* Match line-height of parent for perfect vertical alignment */
		line-height: var(--editor-line-height);
	}

	/* Make gutter result more visible on hover */
	.gutter-line.has-result:hover .gutter-result {
		/* background removed for cleaner appearance */
		transform: scale(1.02);
		transition: all 0.15s ease;
	}

	:global(.calculation) {
		font-family: var(--font-family);
		/* background removed for cleaner appearance */
		border-radius: var(--border-radius-sm);
		display: inline;
		/* CRITICAL: Zero padding/margin to prevent line height changes */
		padding: 0;
		margin: 0;
		/* Ensure line-height matches parent */
		line-height: inherit;
	}

	:global(.calc-result) {
		color: var(--color-primary);
		font-weight: 600;
		margin-left: var(--spacing-md);
		animation: fadeIn var(--animation-duration) ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateX(calc(var(--spacing-xs) * -1));
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/* Custom cursor - appears after typing stops with correct font-size height */
	.custom-cursor {
		position: absolute;
		width: var(--cursor-width);
		background: var(--color-text);
		pointer-events: none;
		z-index: 3; /* Above everything */
		/* NO transition - instant response for navigation */
	}

	.custom-cursor.visible {
		opacity: 1;
	}

	.custom-cursor.hidden {
		opacity: 0;
	}
</style>
