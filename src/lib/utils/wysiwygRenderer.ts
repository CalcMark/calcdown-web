/**
 * Pure rendering functions for WYSIWYG CalcMark editor
 * All functions are pure - no side effects, easy to test
 */

import { marked } from 'marked';
import type { CalcMarkDocument } from '$lib/state/CalcMarkDocument';
import { runeToUtf16Position } from '$lib/utils/unicode';

interface Line {
	lineNumber: number;
	rawContent: string;
	classification: 'MARKDOWN' | 'CALCULATION' | 'BLANK' | null;
	tokens?: any[];
	calculationResult?: any;
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Format a calculation result value
 */
export function formatValue(value: any): string {
	if (typeof value.Value === 'number') {
		const num = value.Value;

		// Format with symbol if present
		if (value.Symbol) {
			return `${value.Symbol}${formatNumber(num)}`;
		}

		return formatNumber(num);
	}

	return String(value.Value);
}

/**
 * Format a number with locale formatting
 */
export function formatNumber(num: number): string {
	// Keep numbers readable
	if (Math.abs(num) < 1000) {
		return num.toString();
	}

	// Use locale formatting
	return num.toLocaleString(undefined, {
		maximumFractionDigits: 2
	});
}

/**
 * Render a markdown line
 */
export function renderMarkdownLine(content: string): string {
	if (content.trim() === '') return '&nbsp;'; // Empty line
	return marked.parseInline(content);
}

/**
 * Render a calculation line with syntax highlighting
 * Preserves ALL whitespace and characters
 */
export function renderCalculationLine(line: Line, doc: CalcMarkDocument): string {
	const tokens = line.tokens || [];
	const result = line.calculationResult;
	const lineText = line.rawContent;

	// Add data-result attribute for mobile inline display
	const resultAttr = result ? ` data-result="= ${formatValue(result.Value)}"` : '';
	let html = `<span class="calculation"${resultAttr}>`;

	if (tokens.length > 0) {
		// Render character by character, wrapping tokens in spans
		// This preserves ALL whitespace and characters
		let currentPos = 0;

		for (const token of tokens) {
			// Skip EOF and other zero-length tokens
			if (token.type === 'EOF' || token.start === token.end) {
				continue;
			}

			// Convert rune positions to UTF-16 positions
			const tokenStart = runeToUtf16Position(lineText, token.start);
			const tokenEnd = runeToUtf16Position(lineText, token.end);
			const tokenText = lineText.substring(tokenStart, tokenEnd);

			if (tokenStart > currentPos) {
				// Add any whitespace/characters before this token
				html += escapeHtml(lineText.substring(currentPos, tokenStart));
			}

			// Add the token with syntax highlighting
			html += `<span class="token-${token.type.toLowerCase()}">${escapeHtml(tokenText)}</span>`;
			currentPos = tokenEnd;
		}

		// Add any remaining characters after the last token
		if (currentPos < lineText.length) {
			html += escapeHtml(lineText.substring(currentPos));
		}
	} else{
		// No tokens yet, show raw
		html += escapeHtml(lineText);
	}

	// Note: Results are now rendered in the gutter, not inline
	// See WysiwygCalcMarkEditor.svelte for gutter implementation

	html += '</span>';
	return html;
}

/**
 * Render a line based on its classification
 * Pure function - always returns the same output for the same input
 */
export function renderLine(line: Line, doc: CalcMarkDocument): string {
	if (!line.classification) {
		// No classification yet - show raw (optimistic UI)
		return escapeHtml(line.rawContent);
	}

	if (line.classification === 'MARKDOWN') {
		return renderMarkdownLine(line.rawContent);
	} else if (line.classification === 'CALCULATION') {
		return renderCalculationLine(line, doc);
	}

	return escapeHtml(line.rawContent);
}
