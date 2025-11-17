/**
 * Tests for focus retention in EditableBlock
 * Ensures that focus is not lost when typing causes re-renders
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import EditableBlock from './EditableBlock.svelte';
import type { Block } from '$lib/stores/blockStore.svelte';

describe('EditableBlock - Focus Retention', () => {
	it('should maintain focus while typing in markdown block', async () => {
		const user = userEvent.setup();
		const mockBlock: Block = {
			id: 'test-block-1',
			type: 'markdown',
			content: 'Initial',
			lineStart: 1,
			lineEnd: 1
		};

		let currentContent = mockBlock.content;
		const handleContentChange = vi.fn((content: string) => {
			currentContent = content;
		});

		const { rerender } = render(EditableBlock, {
			props: {
				block: mockBlock,
				isActive: true,
				variableContext: {},
				onActivate: vi.fn(),
				onContentChange: handleContentChange,
				onEnter: vi.fn(),
				onTab: vi.fn(),
				onBackspaceAtStart: vi.fn(),
				onBlur: vi.fn(),
				onEscape: vi.fn()
			}
		});

		// Find the textarea
		const textarea = screen.getByPlaceholderText(
			'Type markdown or calculations...'
		) as HTMLTextAreaElement;
		expect(textarea).toBeDefined();

		// Focus the textarea
		textarea.focus();
		expect(document.activeElement).toBe(textarea);

		// Type some characters
		await user.type(textarea, ' content');

		// After typing, focus should still be on the textarea
		expect(document.activeElement).toBe(textarea);

		// Simulate a re-render with updated content (what would happen in real app)
		await rerender({
			block: { ...mockBlock, content: currentContent },
			isActive: true,
			variableContext: {},
			onActivate: vi.fn(),
			onContentChange: handleContentChange,
			onEnter: vi.fn(),
			onTab: vi.fn(),
			onBackspaceAtStart: vi.fn(),
			onBlur: vi.fn(),
			onEscape: vi.fn()
		});

		// Focus should STILL be on the textarea after re-render
		expect(document.activeElement).toBe(textarea);
	});

	it('should maintain focus while typing in calculation block', async () => {
		const user = userEvent.setup();
		const mockBlock: Block = {
			id: 'test-block-2',
			type: 'calculation',
			content: 'x = 10',
			lineStart: 1,
			lineEnd: 1
		};

		let currentContent = mockBlock.content;
		const handleContentChange = vi.fn((content: string) => {
			currentContent = content;
		});

		const { rerender } = render(EditableBlock, {
			props: {
				block: mockBlock,
				isActive: true,
				variableContext: {},
				onActivate: vi.fn(),
				onContentChange: handleContentChange,
				onEnter: vi.fn(),
				onTab: vi.fn(),
				onBackspaceAtStart: vi.fn(),
				onBlur: vi.fn(),
				onEscape: vi.fn()
			}
		});

		// Find the textarea
		const textarea = screen.getByPlaceholderText('Enter a calculation...') as HTMLTextAreaElement;
		expect(textarea).toBeDefined();

		// Focus the textarea
		textarea.focus();
		expect(document.activeElement).toBe(textarea);

		// Type some characters
		await user.type(textarea, '0');

		// After typing, focus should still be on the textarea
		expect(document.activeElement).toBe(textarea);

		// Simulate a re-render with updated content
		await rerender({
			block: { ...mockBlock, content: currentContent },
			isActive: true,
			variableContext: {},
			onActivate: vi.fn(),
			onContentChange: handleContentChange,
			onEnter: vi.fn(),
			onTab: vi.fn(),
			onBackspaceAtStart: vi.fn(),
			onBlur: vi.fn(),
			onEscape: vi.fn()
		});

		// Focus should STILL be on the textarea after re-render
		expect(document.activeElement).toBe(textarea);
	});
});
