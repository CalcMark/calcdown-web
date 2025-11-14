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
 * Calculate cursor position using Range API
 */
export function calculateCursorPosition(
	lineElement: Element,
	offset: number,
	overlayElement: HTMLElement
): CursorPosition | null {
	const range = document.createRange();
	const textNode = findTextNodeAtOffset(lineElement, offset);

	if (!textNode) return null;

	range.setStart(textNode.node, textNode.offset);
	range.collapse(true);

	const rect = range.getBoundingClientRect();
	const overlayRect = overlayElement.getBoundingClientRect();

	return {
		x: rect.left - overlayRect.left + overlayElement.scrollLeft,
		y: rect.top - overlayRect.top + overlayElement.scrollTop,
		height: rect.height || 28
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
 * @param clickY - Y coordinate relative to the overlay element (NOT viewport)
 * @param overlayScrollTop - Current scroll position of overlay
 * @param lineHeight - Height of each line in pixels
 * @param padding - Top padding of overlay in pixels
 */
export function getLineIndexFromY(
	clickY: number,
	overlayScrollTop: number,
	lineHeight: number = 28,
	padding: number = 40
): number {
	// clickY is relative to overlay top, add scroll to get position in full document
	const adjustedY = clickY + overlayScrollTop - padding;
	return Math.floor(adjustedY / lineHeight);
}
