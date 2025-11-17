<!--
 * Line Hover Overlay Component
 *
 * Displays visual effects when hovering over calculation lines:
 * - Line highlight (unless cursor is active on that line)
 * - Dotted underline connecting calculation to its result
 * - Diagnostic indicators (errors, warnings, info)
 * - Future: highlight dependent variables, show tooltips, etc.
 -->
<script lang="ts">
	import type { LineContext } from '$lib/state/LineContext.svelte';

	interface Props {
		lineContext: LineContext;
		overlayElement?: HTMLElement | null;
	}

	let { lineContext, overlayElement = null }: Props = $props();

	// Get reactive context from LineContext
	const context = $derived(lineContext.getCurrentContext);

	// Should we show the overlay? Hide it if cursor is active on the same line
	// Don't check cursorVisible since it blinks - check if it's the cursor line at all
	const shouldShowOverlay = $derived(
		context.lineNumber !== null && !lineContext.isLineCursor(context.lineNumber)
	);

	// Get actual rendered position from DOM instead of calculating
	// This ensures font-size independence and browser compatibility
	let yPosition = $state('0');
	let lineHeight = $state('28px'); // Fallback

	$effect(() => {
		if (context.lineNumber !== null && overlayElement) {
			// Use requestAnimationFrame to ensure layout is complete in Safari
			requestAnimationFrame(() => {
				// Find the actual line element in the rendered overlay (NOT gutter)
				// The gutter has transform applied for scroll sync, which throws off calculations
				const lineElement = overlayElement.querySelector(
					`[data-line="${context.lineNumber}"]`
				) as HTMLElement;

				if (!lineElement) return;

				// The hover overlay is positioned relative to .wysiwyg-container
				// Find the container
				const container = overlayElement.closest('.wysiwyg-container') as HTMLElement;
				if (!container) return;

				// Force layout recalculation (helps with Safari timing issues)
				void container.offsetHeight;

				const containerRect = container.getBoundingClientRect();
				const lineRect = lineElement.getBoundingClientRect();

				// Position relative to .wysiwyg-container
				const top = lineRect.top - containerRect.top;
				yPosition = `${top}px`;
				lineHeight = `${lineRect.height}px`;
			});
		}
	});

	// Count diagnostics by severity
	const diagnosticCounts = $derived.by(() => {
		if (!context.line?.diagnostics) {
			return { error: 0, warning: 0, info: 0 };
		}

		const counts = { error: 0, warning: 0, info: 0 };
		for (const diag of context.line.diagnostics) {
			counts[diag.severity]++;
		}
		return counts;
	});

	// Total diagnostic count
	const totalDiagnostics = $derived(
		diagnosticCounts.error + diagnosticCounts.warning + diagnosticCounts.info
	);

	// Determine primary diagnostic severity (highest priority)
	const primarySeverity = $derived.by((): 'error' | 'warning' | 'info' | null => {
		if (diagnosticCounts.error > 0) return 'error';
		if (diagnosticCounts.warning > 0) return 'warning';
		if (diagnosticCounts.info > 0) return 'info';
		return null;
	});
</script>

{#if shouldShowOverlay}
	<div class="hover-overlay" style="top: {yPosition}; height: {lineHeight}">
		<!-- Background highlight for the line -->
		<div class="line-highlight"></div>

		<!-- Dotted line extending across editor and gutter -->
		<div class="hover-line"></div>

		<!-- Diagnostic indicator (errors, warnings, info) -->
		{#if totalDiagnostics > 0 && primarySeverity}
			<div class="diagnostic-indicator" data-severity={primarySeverity}>
				{totalDiagnostics}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Hover overlay - sits on top of entire container */
	/* Height and position are set dynamically via inline styles from DOM measurements */
	.hover-overlay {
		position: absolute;
		left: 0;
		right: 0;
		pointer-events: none;
		z-index: 1000;
	}

	/* Subtle background highlight for the hovered line */
	.line-highlight {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		/* background removed for cleaner appearance */
		background: transparent;
		transition: background 0.15s ease;
	}

	.hover-overlay:hover .line-highlight {
		/* background removed for cleaner appearance */
		background: transparent;
	}

	/* Dotted line at bottom of line */
	.hover-line {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0.25rem;
		height: 0.0625rem; /* 1px */
		background: repeating-linear-gradient(
			to right,
			var(--color-primary, #0ea5e9) 0,
			var(--color-primary, #0ea5e9) 0.25rem,
			transparent 0.25rem,
			transparent 0.5rem
		);
		opacity: 0.5;
		transition: opacity 0.15s ease;
	}

	.hover-overlay:hover .hover-line {
		opacity: 0.7;
	}

	/* Diagnostic indicator - colored circle with count */
	.diagnostic-indicator {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		animation: fadeIn 0.2s ease-in;
	}

	/* Diagnostic colors based on severity */
	.diagnostic-indicator[data-severity='error'] {
		background: #ef4444; /* Red */
	}

	.diagnostic-indicator[data-severity='warning'] {
		background: #f59e0b; /* Orange */
	}

	.diagnostic-indicator[data-severity='info'] {
		background: #3b82f6; /* Blue */
	}

	/* Mobile responsive - slightly larger touch target */
	@media (max-width: 48rem) {
		.diagnostic-indicator {
			width: 1.75rem;
			height: 1.75rem;
			font-size: 0.875rem;
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-50%) scale(0.8);
		}
		to {
			opacity: 1;
			transform: translateY(-50%) scale(1);
		}
	}
</style>
