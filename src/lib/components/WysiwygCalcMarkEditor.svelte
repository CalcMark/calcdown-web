<!--
 * WYSIWYG CalcMark Editor
 *
 * Architecture:
 * - Textarea (invisible) = source of truth, browser manages cursor
 * - Rendered overlay (visible) = shows formatted output
 * - Server processes all classification/tokenization/evaluation
 * - Viewport-aware: only evaluate visible lines
 -->
<script lang="ts">
	import { CalcMarkDocument } from '$lib/state/CalcMarkDocument';
	import { USER_INPUT_DEBOUNCE_MS } from '$lib/constants';
	import { renderLine, formatValue } from '$lib/utils/wysiwygRenderer';
	import {
		calculateCursorPosition,
		getCharacterOffsetFromClick,
		getLineIndexFromY
	} from '$lib/utils/cursorPosition';
	import { onMount } from 'svelte';

	let { initialText = '' } = $props();

	const doc = new CalcMarkDocument(initialText);

	let textareaElement = $state<HTMLTextAreaElement | null>(null);
	let overlayElement = $state<HTMLDivElement | null>(null);
	let containerElement = $state<HTMLDivElement | null>(null);
	let gutterElement = $state<HTMLDivElement | null>(null);

	let rawText = $state(doc.getRawText());
	let lines = $state(doc.getLines());
	let isEvaluating = $state(false);

	let debounceTimer: any = null;
	let scrollTimer: any = null;

	// Cursor visualization state
	let cursorPosition = $state<{ x: number; y: number; height: number } | null>(null);
	let cursorVisible = $state(false);
	let cursorBlinkInterval: any = null;

	// Smooth transition state
	let overlayOpacity = $state(1);
	let previousLines = $state(doc.getLines());

	onMount(() => {
		// Initial evaluation
		evaluateDocument();

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
			textareaElement.addEventListener('selectionchange', updateCursorPosition);
			textareaElement.addEventListener('keyup', updateCursorPosition);
			textareaElement.addEventListener('mouseup', updateCursorPosition);
			textareaElement.addEventListener('focus', startCursorBlink);
			textareaElement.addEventListener('blur', stopCursorBlink);

			// Intercept clicks and double-clicks to use our custom positioning
			textareaElement.addEventListener('mousedown', handleTextareaMouseDown);
			textareaElement.addEventListener('mousemove', handleTextareaMouseMove);
			textareaElement.addEventListener('click', handleTextareaClick);
			textareaElement.addEventListener('dblclick', handleTextareaDoubleClick);
		}

		return () => {
			if (cursorBlinkInterval) clearInterval(cursorBlinkInterval);
		};
	});

	// Handle user typing
	function handleInput() {
		if (!textareaElement) return;

		rawText = textareaElement.value;
		doc.updateRawText(rawText);

		scheduleEvaluation();
	}

	function scheduleEvaluation() {
		if (debounceTimer) clearTimeout(debounceTimer);

		debounceTimer = setTimeout(() => {
			evaluateDocument();
		}, USER_INPUT_DEBOUNCE_MS);
	}

	async function evaluateDocument() {
		isEvaluating = true;

		// Store current cursor position
		const currentCursorPos = textareaElement?.selectionStart || 0;

		try {
			const { text, offset } = doc.getTextForEvaluation();

			const response = await fetch('/api/process', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ input: text, offset })
			});

			const results = await response.json();

			// Don't fade during active editing - it feels sluggish
			// overlayOpacity = 0.7;  // Removed - causes confusion during typing/deleting

			// Update document state
			doc.updateClassifications(results.classifications);

			// Update tokens for calculation lines
			// Server returns 1-indexed line numbers, convert to 0-indexed
			for (const [lineStr, tokens] of Object.entries(results.tokensByLine)) {
				const serverLineNum = Number(lineStr);
				const docLineNum = serverLineNum - 1 + offset; // Convert from 1-indexed to 0-indexed
				doc.updateTokens(docLineNum, tokens as any[]);
			}

			// Update diagnostics
			// Server returns 1-indexed line numbers, convert to 0-indexed
			const adjustedDiagnostics: Record<number, any[]> = {};
			for (const [lineStr, diags] of Object.entries(results.diagnostics)) {
				adjustedDiagnostics[Number(lineStr) - 1 + offset] = diags as any[];
			}
			doc.updateDiagnostics(adjustedDiagnostics);

			// Update calculation results
			doc.updateEvaluationResults(results.evaluationResults, results.variableContext, offset);

			// Store previous lines for comparison
			previousLines = lines;

			// Trigger re-render
			lines = doc.getLines();

			// Fade back in
			overlayOpacity = 1;

			// Restore cursor position (browser usually maintains it, but ensure it)
			if (textareaElement && textareaElement.selectionStart !== currentCursorPos) {
				textareaElement.selectionStart = currentCursorPos;
				textareaElement.selectionEnd = currentCursorPos;
			}

			// Update cursor visualization
			updateCursorPosition();
		} catch (error) {
			console.error('Evaluation error:', error);
			overlayOpacity = 1;
		} finally {
			isEvaluating = false;
		}
	}

	// Handle scroll (debounced viewport update)
	function handleScroll() {
		if (scrollTimer) clearTimeout(scrollTimer);

		scrollTimer = setTimeout(() => {
			if (!textareaElement) return;

			const lineHeight = 28; // pixels per line
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

	function updateCursorPosition() {
		if (!textareaElement || !overlayElement) return;

		const cursorPos = textareaElement.selectionStart;
		const { line: lineNum, offset } = doc.getLineFromPosition(cursorPos);

		const lineElement = overlayElement.querySelector(`[data-line="${lineNum}"]`);
		if (!lineElement) return;

		const position = calculateCursorPosition(lineElement, offset, overlayElement);
		if (position) {
			cursorPosition = position;
			cursorVisible = true;
		}
	}

	function startCursorBlink() {
		cursorVisible = true;
		if (cursorBlinkInterval) clearInterval(cursorBlinkInterval);

		cursorBlinkInterval = setInterval(() => {
			// Don't hide cursor during evaluation - keep it visible
			if (!isEvaluating) {
				cursorVisible = !cursorVisible;
			} else {
				cursorVisible = true; // Always show during evaluation
			}
		}, 530); // Standard cursor blink rate
	}

	function stopCursorBlink() {
		if (cursorBlinkInterval) {
			clearInterval(cursorBlinkInterval);
			cursorBlinkInterval = null;
		}
		cursorVisible = false;
	}

	// === Click-to-Position Mapping ===

	let isDragging = $state(false);
	let dragStartPos = $state<number | null>(null);

	function handleTextareaMouseDown(event: MouseEvent) {
		// Start tracking potential drag
		isDragging = false;
		if (textareaElement) {
			dragStartPos = textareaElement.selectionStart;
		}
	}

	function handleTextareaMouseMove(event: MouseEvent) {
		// If mouse moved significantly, it's a drag
		if (dragStartPos !== null && textareaElement) {
			const currentPos = textareaElement.selectionStart;
			if (Math.abs(currentPos - dragStartPos) > 0) {
				isDragging = true;
			}
		}
	}

	function handleTextareaClick(event: MouseEvent) {
		// Only use custom positioning if not dragging and no selection exists
		if (!isDragging && textareaElement) {
			const hasSelection = textareaElement.selectionStart !== textareaElement.selectionEnd;
			if (!hasSelection) {
				handleClickImpl(event);
			}
		}
		isDragging = false;
		dragStartPos = null;
	}

	function handleTextareaDoubleClick(event: MouseEvent) {
		// Use our custom double-click word selection logic
		handleDoubleClickImpl(event);
	}

	function handleOverlayKeyDown(event: KeyboardEvent) {
		// Forward keyboard events to textarea
		if (!textareaElement) return;
		textareaElement.focus();
	}

	function handleOverlayClick(event: MouseEvent) {
		handleClickImpl(event);
	}

	function handleOverlayDoubleClick(event: MouseEvent) {
		handleDoubleClickImpl(event);
	}

	function handleClickImpl(event: MouseEvent) {
		if (!overlayElement || !textareaElement) return;

		const overlayRect = overlayElement.getBoundingClientRect();
		const relativeY = event.clientY - overlayRect.top;
		const lineIndex = getLineIndexFromY(relativeY, overlayElement.scrollTop);

		const line = lines[lineIndex];
		if (!line) return;

		const lineElement = overlayElement.querySelector(`[data-line="${lineIndex}"]`);
		if (!lineElement) return;

		const offset = getCharacterOffsetFromClick(lineElement, event.clientX);
		const absolutePosition = doc.getAbsolutePosition(lineIndex, offset);

		textareaElement.selectionStart = absolutePosition;
		textareaElement.selectionEnd = absolutePosition;
		textareaElement.focus();

		updateCursorPosition();
	}

	function handleDoubleClickImpl(event: MouseEvent) {
		if (!overlayElement || !textareaElement) return;

		event.preventDefault();
		event.stopPropagation();

		const overlayRect = overlayElement.getBoundingClientRect();
		const relativeY = event.clientY - overlayRect.top;
		const lineIndex = getLineIndexFromY(relativeY, overlayElement.scrollTop);
		const line = lines[lineIndex];
		if (!line) return;

		const lineElement = overlayElement.querySelector(`[data-line="${lineIndex}"]`);
		if (!lineElement) return;

		const offset = getCharacterOffsetFromClick(lineElement, event.clientX);

		// First, try to select by token if available
		if (line.tokens && line.tokens.length > 0) {
			for (const token of line.tokens) {
				const tokenText = doc.getTokenText(lineIndex, token);
				const tokenStart = line.rawContent.indexOf(tokenText);
				const tokenEnd = tokenStart + tokenText.length;

				if (offset >= tokenStart && offset <= tokenEnd) {
					// Select the entire token
					const absoluteStart = doc.getAbsolutePosition(lineIndex, tokenStart);
					const absoluteEnd = doc.getAbsolutePosition(lineIndex, tokenEnd);

					textareaElement.selectionStart = absoluteStart;
					textareaElement.selectionEnd = absoluteEnd;
					textareaElement.focus();

					updateCursorPosition();
					return;
				}
			}
		}

		// Fallback: select word using identifier/number pattern
		const lineText = line.rawContent;

		// Find all word-like tokens (identifiers, numbers, operators)
		const wordPattern = /[a-zA-Z_][a-zA-Z0-9_]*|[0-9]+|\S/g;
		let match;
		const words: Array<{ start: number; end: number; text: string }> = [];

		while ((match = wordPattern.exec(lineText)) !== null) {
			words.push({
				start: match.index,
				end: match.index + match[0].length,
				text: match[0]
			});
		}

		// Find word containing the offset
		for (const word of words) {
			if (offset >= word.start && offset <= word.end) {
				const absoluteStart = doc.getAbsolutePosition(lineIndex, word.start);
				const absoluteEnd = doc.getAbsolutePosition(lineIndex, word.end);

				textareaElement.selectionStart = absoluteStart;
				textareaElement.selectionEnd = absoluteEnd;
				textareaElement.focus();

				updateCursorPosition();
				return;
			}
		}
	}
</script>

<div class="wysiwyg-container" bind:this={containerElement}>
	<!-- Main editor area -->
	<div class="editor-area">
		<!-- Actual textarea (invisible but editable) -->
		<textarea
			bind:this={textareaElement}
			bind:value={rawText}
			oninput={handleInput}
			onscroll={handleScroll}
			class="raw-textarea"
			spellcheck="false"
			placeholder="Type CalcMark here..."
		/>

		<!-- Rendered overlay (visible, read-only) -->
		<div
			bind:this={overlayElement}
			class="rendered-overlay"
			role="textbox"
			tabindex="0"
			aria-label="CalcMark editor content"
			onclick={handleOverlayClick}
			ondblclick={handleOverlayDoubleClick}
			onkeydown={handleOverlayKeyDown}
			style="opacity: {overlayOpacity};"
		>
			{#each lines as line (line.lineNumber)}
				<div class="line" data-line={line.lineNumber}>
					{@html renderLine(line, doc)}
				</div>
			{/each}

			<!-- Visual cursor indicator -->
			{#if cursorPosition && cursorVisible}
				<div
					class="cursor-indicator"
					style="left: {cursorPosition.x}px; top: {cursorPosition.y}px; height: {cursorPosition.height}px;"
				></div>
			{/if}
		</div>
	</div>

	<!-- Right gutter for computed values, hints, warnings -->
	<div class="gutter" bind:this={gutterElement}>
		{#each lines as line (line.lineNumber)}
			<div class="gutter-line" data-line={line.lineNumber}>
				{#if line.calculationResult}
					<div class="gutter-result">
						= {formatValue(line.calculationResult.Value)}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.wysiwyg-container {
		position: relative;
		width: 100%;
		max-width: 100%;
		margin: 0 auto;
		height: 100vh;
		overflow: hidden;
		display: flex;
		flex-direction: row;
		gap: 0; /* No gap - we want them adjacent */
	}

	.editor-area {
		position: relative;
		flex: 1 1 auto;
		min-width: 0; /* Allow shrinking below content size */
		height: 100%;
		overflow: hidden;
	}

	.raw-textarea {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		padding: 40px;
		margin: 0;
		border: none;
		outline: none;
		resize: none;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		font-size: 16px;
		line-height: 28px;
		color: transparent;
		caret-color: transparent; /* Hide the native caret - we show our own */
		background: transparent;
		z-index: 1;
		overflow-y: auto;
		overflow-x: hidden; /* Prevent horizontal scrolling, force wrapping */
		white-space: pre-wrap;
		word-wrap: break-word;
		word-break: break-word; /* Break long words if needed */
	}

	.raw-textarea::selection {
		background: rgba(14, 165, 233, 0.2);
	}

	.rendered-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		padding: 40px;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		font-size: 16px;
		line-height: 28px;
		color: #1e293b;
		white-space: pre-wrap;
		word-wrap: break-word;
		word-break: break-word; /* Break long words if needed */
		transition: opacity 150ms ease-out;
	}

	.line {
		min-height: 28px;
		/* Ensure all inline elements wrap properly, breaking mid-word if necessary */
		overflow-wrap: anywhere; /* Break anywhere if word is too long */
		word-break: break-word; /* Prefer word boundaries but allow breaking */
		hyphens: none; /* Don't add hyphens, just break */
	}

	/* Ensure all inline elements generated by markdown parser wrap */
	.line :global(*) {
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	/* Right gutter */
	.gutter {
		position: relative;
		width: clamp(150px, 30vw, 60vw); /* Responsive: min 150px, prefers 30vw, max 60vw */
		height: 100%;
		background: #f8fafc;
		border-left: 1px solid #e2e8f0;
		padding-top: 40px; /* Match editor top padding */
		padding-bottom: 40px;
		padding-left: 16px;
		padding-right: 16px;
		overflow-y: auto; /* Enable scrolling */
		overflow-x: hidden;
		flex-shrink: 0;
	}

	/* Mobile responsive: hide gutter, show results inline */
	@media (max-width: 768px) {
		.gutter {
			display: none;
		}

		.editor-area {
			max-width: 100%;
		}

		/* Show results inline on mobile */
		:global(.calculation::after) {
			content: attr(data-result);
			color: #0ea5e9;
			font-weight: 600;
			margin-left: 12px;
		}
	}

	.gutter-line {
		height: 28px; /* Exact match to line height - use height not min-height */
		line-height: 28px;
		display: flex;
		align-items: center;
		margin: 0; /* No margins */
		padding: 0; /* No padding */
	}

	.gutter-result {
		color: #0ea5e9;
		font-weight: 600;
		font-size: 14px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		animation: fadeIn 200ms ease-in;
		padding: 2px 8px;
		border-radius: 4px;
		background: rgba(14, 165, 233, 0.08);
		white-space: nowrap; /* Prevent wrapping */
	}

	:global(.calculation) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: rgba(14, 165, 233, 0.05);
		border-radius: 4px;
		display: inline;
	}

	:global(.calc-result) {
		color: #0ea5e9;
		font-weight: 600;
		margin-left: 12px;
		animation: fadeIn 200ms ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateX(-4px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	:global(.token-number) {
		color: #7c3aed;
	}

	:global(.token-identifier) {
		color: #1e293b;
	}

	:global(.token-assign) {
		color: #64748b;
	}

	:global(.token-plus),
	:global(.token-minus),
	:global(.token-multiply),
	:global(.token-divide) {
		color: #64748b;
	}

	.cursor-indicator {
		position: absolute;
		width: 2px;
		background: #1e293b;
		pointer-events: none;
		z-index: 10;
	}
</style>
