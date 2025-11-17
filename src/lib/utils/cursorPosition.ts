/**
 * Pure cursor position calculation utilities
 * No DOM manipulation, just calculations
 */

import type { CalcMarkDocument } from '$lib/state/CalcMarkDocument';

export interface CursorPosition {
	x: number;
	y: number;
	height: number;
}

/**
 * Find text node at a specific character offset within an element
 */
export function findTextNodeAtOffset(
	element: Element,
	targetOffset: number
): { node: Text; offset: number } | null {
	let currentOffset = 0;

	function traverse(node: Node): { node: Text; offset: number } | null {
		if (node.nodeType === Node.TEXT_NODE) {
			const textNode = node as Text;
			const length = textNode.textContent?.length || 0;

			if (currentOffset + length >= targetOffset) {
				return { node: textNode, offset: targetOffset - currentOffset };
			}

			currentOffset += length;
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			for (const child of Array.from(node.childNodes)) {
				const result = traverse(child);
				if (result) return result;
			}
		}

		return null;
	}

	return traverse(element);
}

/**
 * Get the actual font size in pixels from computed styles
 */
function getFontSize(element: Element): number {
	const computedStyle = window.getComputedStyle(element);
	const fontSize = computedStyle.fontSize;
	return parseFloat(fontSize) || 16; // Fallback to 16px if parsing fails
}

/**
 * Calculate cursor position using Range API
 *
 * CRITICAL: Overlay doesn't scroll, so we use textarea's scroll position
 * to calculate the cursor's position relative to the visible viewport
 */
export function calculateCursorPosition(
	lineElement: Element,
	offset: number,
	overlayElement: HTMLElement,
	textareaElement?: HTMLElement
): CursorPosition | null {
	const range = document.createRange();
	const textNode = findTextNodeAtOffset(lineElement, offset);

	// Get the actual font size from the line element (respects rem/em/user zoom)
	const fontSize = getFontSize(lineElement);
	// Cursor height MUST match font size exactly to align with text
	// Using line-height would make it too tall (28px vs 16px)
	const cursorHeight = fontSize;

	// Cursor positioning:
	// - getBoundingClientRect() returns viewport (screen) coordinates
	// - Cursor is absolutely positioned in .editor-area
	// - We calculate position relative to overlay's top-left corner
	// - NO scroll offset needed because overlay doesn't scroll - its content stays fixed

	// Handle blank lines: if no text node found, position cursor at start of line
	if (!textNode) {
		// For blank lines, use the line element's position but with calculated text height
		const lineRect = lineElement.getBoundingClientRect();
		const overlayRect = overlayElement.getBoundingClientRect();

		return {
			x: lineRect.left - overlayRect.left,
			y: lineRect.top - overlayRect.top,
			height: cursorHeight
		};
	}

	range.setStart(textNode.node, textNode.offset);
	range.collapse(true);

	const rect = range.getBoundingClientRect();
	const overlayRect = overlayElement.getBoundingClientRect();

	return {
		x: rect.left - overlayRect.left,
		y: rect.top - overlayRect.top,
		height: cursorHeight
	};
}

/**
 * Get character offset from click position using Range API
 */
export function getCharacterOffsetFromClick(element: Element, clickX: number): number {
	const range = document.createRange();
	let closestOffset = 0;
	let closestDistance = Infinity;
	let foundAny = false;

	function traverse(node: Node, currentOffset: number): number {
		if (node.nodeType === Node.TEXT_NODE) {
			const textNode = node as Text;
			const length = textNode.textContent?.length || 0;

			// Skip calculation results (they're not in the source text)
			const parent = textNode.parentElement;
			if (parent?.classList.contains('calc-result')) {
				return currentOffset;
			}

			// Check each character position
			for (let i = 0; i <= length; i++) {
				range.setStart(textNode, i);
				range.setEnd(textNode, i);

				const rect = range.getBoundingClientRect();
				const distance = Math.abs(rect.left - clickX);

				if (distance < closestDistance) {
					closestDistance = distance;
					closestOffset = currentOffset + i;
					foundAny = true;
				}
			}

			return currentOffset + length;
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			const elem = node as Element;

			// Skip calculation results entirely
			if (elem.classList.contains('calc-result')) {
				return currentOffset;
			}

			for (const child of Array.from(node.childNodes)) {
				currentOffset = traverse(child, currentOffset);
			}
		}

		return currentOffset;
	}

	traverse(element, 0);

	// If we didn't find any character positions, return 0 (start of line)
	return foundAny ? closestOffset : 0;
}

/**
 * Calculate line index from Y coordinate
 * Dynamically calculates line height and padding from CSS variables
 * @param clickY - Y coordinate relative to the overlay element (NOT viewport)
 * @param overlayScrollTop - Current scroll position of overlay
 * @param overlayElement - The overlay element to read CSS variables from
 */
export function getLineIndexFromY(
	clickY: number,
	overlayScrollTop: number,
	overlayElement?: HTMLElement
): number {
	// Get actual values from CSS variables and computed styles
	let lineHeight = 28; // Fallback
	let padding = 40; // Fallback

	if (overlayElement) {
		const computedStyle = window.getComputedStyle(overlayElement);
		const fontSize = parseFloat(computedStyle.fontSize) || 16;
		const lineHeightRatio = parseFloat(computedStyle.lineHeight) / fontSize || 1.75;
		lineHeight = fontSize * lineHeightRatio;

		// Get padding from CSS variable or computed style
		const paddingTop = computedStyle.paddingTop;
		padding = parseFloat(paddingTop) || 40;
	}

	const adjustedY = clickY + overlayScrollTop - padding;
	return Math.floor(adjustedY / lineHeight);
}
