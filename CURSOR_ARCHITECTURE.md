# Cursor Position Architecture - Research & Proposal

## Current State Analysis

### Current Cursor Sources

1. **Native Textarea Cursor (Source of Truth)**
   - Location: `HTMLTextAreaElement.selectionStart` / `selectionEnd`
   - Type: Absolute character position in document
   - Managed by: Browser (native)
   - Always accurate, always synchronized with user input

2. **CalcMarkDocument Cursor State**
   - Location: `CalcMarkDocument.state.cursor` (line, offset)
   - Type: Line number + character offset within line
   - Managed by: `updateCursorFromAbsolutePosition()`
   - Converts from absolute → line-based coordinates

3. **Custom Visual Cursor**
   - Location: `WysiwygCalcMarkEditor.cursorPosition` (top, left, height)
   - Type: Pixel coordinates relative to overlay
   - Managed by: `updateCursorPosition()` + `calculateCursorPosition()`
   - Visible representation shown to user

### Current Data Flow

```
User Input (typing/clicking)
  ↓
Browser updates textarea.selectionStart
  ↓
handleInput() / handleKeyUp() / handleClick()
  ↓
updateCursorPosition(recalculateLine)
  ↓
doc.updateCursorFromAbsolutePosition(textarea.selectionStart, recalculateLine)
  ↓
calculateCursorPosition(lineElement, offset, overlayElement)
  ↓
cursorPosition = { top, left, height }
```

## Problems Identified

### 1. Multiple Sources of Cursor State
- **Native textarea**: `textarea.selectionStart` (absolute position)
- **CalcMarkDocument**: `state.cursor` (line, offset)
- **Component state**: `cursorPosition` (x, y coordinates)
- **LineContext**: `cursorLine` (just line number)

**Issue**: State duplication leads to desynchronization bugs.

### 2. Bidirectional Data Flow
Current flow allows both:
- Reading from textarea → updating document state
- Writing to textarea (in click handlers)

This creates potential race conditions and feedback loops.

### 3. Coordinate System Confusion
Three different coordinate systems:
- **Absolute**: Character position in entire document (0 to text.length)
- **Line-based**: (lineNumber, offsetInLine)
- **Visual**: (x, y) pixels in overlay

Conversions happen in multiple places without clear ownership.

### 4. Cursor Position Calculation Issues
The `calculateCursorPosition()` function in `cursorPosition.ts`:
- Takes line element + offset
- Uses `findTextNodeAtOffset()` to find the text node
- Uses `Range.getBoundingClientRect()` to get position

**Problem**: This doesn't account for:
- Padding/margins in the overlay
- Different rendering between textarea and HTML spans
- Syntax highlighting spans that may have different widths

## Proposed Architecture

### Single Source of Truth Principle

**NATIVE TEXTAREA is the ONLY source of truth for cursor position.**

All other cursor representations are READ-ONLY derived state.

### Centralized Cursor Manager (Svelte Rune Class)

Create a new `CursorManager.svelte.ts` that:

```typescript
/**
 * Centralized cursor position management for WYSIWYG editor
 *
 * ARCHITECTURE:
 * - Native textarea.selectionStart is the ONLY source of truth
 * - All other representations are READ-ONLY derived state
 * - Conversions happen in one place with clear data flow
 */
export class CursorManager {
  // === INPUTS (External Dependencies) ===
  private textareaElement: HTMLTextAreaElement;
  private overlayElement: HTMLElement;
  private doc: CalcMarkDocument;

  // === DERIVED STATE (Read-Only) ===
  absolutePosition = $derived(this.textareaElement.selectionStart);
  hasSelection = $derived(this.textareaElement.selectionStart !== this.textareaElement.selectionEnd);

  // Line-based coordinates (derived from absolute position)
  linePosition = $derived.by(() => {
    return this.doc.getLineFromPosition(this.absolutePosition);
  });

  // Visual pixel coordinates (derived from line position)
  visualPosition = $derived.by(() => {
    const { line, offset } = this.linePosition;
    const lineElement = this.overlayElement.querySelector(`[data-line="${line}"]`);
    if (!lineElement) return { x: 0, y: 0, height: 16 };

    return calculateVisualPosition(lineElement, offset, this.overlayElement);
  });

  // === READ-ONLY ACCESSORS ===
  get line(): number { return this.linePosition.line; }
  get offset(): number { return this.linePosition.offset; }
  get x(): number { return this.visualPosition.x; }
  get y(): number { return this.visualPosition.y; }
  get height(): number { return this.visualPosition.height; }
}
```

### Read-Only Derived State Flow

```
SINGLE SOURCE OF TRUTH: textarea.selectionStart (managed by browser)
  ↓ (automatic - browser manages this)
  ↓
  ↓ DERIVED (via $derived runes - automatic reactivity)
  ↓
CursorManager.absolutePosition
  ↓
  ↓ DERIVED (CalcMarkDocument.getLineFromPosition)
  ↓
CursorManager.linePosition = { line, offset }
  ↓
  ↓ DERIVED (calculateVisualPosition)
  ↓
CursorManager.visualPosition = { x, y, height }
  ↓
  ↓ CONSUMED BY
  ↓
Custom Cursor Rendering <div class="custom-cursor">
```

### Key Principles

1. **Unidirectional Data Flow**
   - Textarea → Cursor Manager → Visual Representation
   - NEVER write to textarea from cursor calculations
   - Only user interactions (via browser events) modify textarea.selectionStart

2. **Single Conversion Point**
   - ALL coordinate conversions happen inside CursorManager
   - Component code only reads from CursorManager accessors
   - No manual cursor position calculations in component

3. **Svelte $derived for Automatic Updates**
   - When textarea.selectionStart changes, all derived state updates automatically
   - No manual `updateCursorPosition()` calls needed
   - Reactivity handled by Svelte runtime

4. **Clear Ownership**
   - **Browser owns**: textarea.selectionStart (native cursor)
   - **CursorManager owns**: All coordinate conversions
   - **Component owns**: Visual rendering of custom cursor

## Implementation Plan

### Phase 1: Create CursorManager.svelte.ts

```typescript
// src/lib/state/CursorManager.svelte.ts

export class CursorManager {
  private textareaElement = $state<HTMLTextAreaElement | null>(null);
  private overlayElement = $state<HTMLElement | null>(null);
  private doc = $state<CalcMarkDocument | null>(null);

  constructor() {}

  // Initialize with dependencies
  init(textarea: HTMLTextAreaElement, overlay: HTMLElement, document: CalcMarkDocument) {
    this.textareaElement = textarea;
    this.overlayElement = overlay;
    this.doc = document;
  }

  // === DERIVED STATE (automatically reactive) ===

  // Absolute cursor position (from textarea)
  get absolutePosition(): number {
    return this.textareaElement?.selectionStart ?? 0;
  }

  get absoluteEnd(): number {
    return this.textareaElement?.selectionEnd ?? 0;
  }

  get hasSelection(): boolean {
    return this.absolutePosition !== this.absoluteEnd;
  }

  // Line-based position
  get line(): number {
    if (!this.doc) return 0;
    return this.doc.getLineFromPosition(this.absolutePosition).line;
  }

  get offset(): number {
    if (!this.doc) return 0;
    return this.doc.getLineFromPosition(this.absolutePosition).offset;
  }

  // Visual position (pixels)
  get x(): number {
    return this.calculateVisualPosition().x;
  }

  get y(): number {
    return this.calculateVisualPosition().y;
  }

  get height(): number {
    return this.calculateVisualPosition().height;
  }

  // === PRIVATE HELPERS ===

  private calculateVisualPosition(): { x: number; y: number; height: number } {
    if (!this.overlayElement || !this.doc) {
      return { x: 0, y: 0, height: 16 };
    }

    const lineElement = this.overlayElement.querySelector(`[data-line="${this.line}"]`);
    if (!lineElement) {
      return { x: 0, y: 0, height: 16 };
    }

    const position = calculateCursorPosition(lineElement, this.offset, this.overlayElement);
    return position ?? { x: 0, y: 0, height: 16 };
  }

  // === WRITE OPERATIONS (only for programmatic cursor placement) ===

  /**
   * Set cursor position programmatically.
   * This is the ONLY way to write cursor position.
   * Used for: clicks, double-clicks, keyboard shortcuts.
   */
  setPosition(absolutePosition: number): void {
    if (!this.textareaElement) return;

    this.textareaElement.selectionStart = absolutePosition;
    this.textareaElement.selectionEnd = absolutePosition;
    this.textareaElement.focus();
  }

  setSelection(start: number, end: number): void {
    if (!this.textareaElement) return;

    this.textareaElement.selectionStart = start;
    this.textareaElement.selectionEnd = end;
    this.textareaElement.focus();
  }
}
```

### Phase 2: Update WysiwygCalcMarkEditor.svelte

Remove all manual cursor tracking:

```svelte
<script lang="ts">
  import { CursorManager } from '$lib/state/CursorManager.svelte';

  const doc = new CalcMarkDocument(initialText);
  const cursorManager = new CursorManager();

  let textareaElement = $state<HTMLTextAreaElement | null>(null);
  let overlayElement = $state<HTMLDivElement | null>(null);

  onMount(() => {
    if (textareaElement && overlayElement) {
      cursorManager.init(textareaElement, overlayElement, doc);
    }
  });

  // Remove all these:
  // let cursorPosition = $state({ top: 0, left: 0, height: 16 });
  // function updateCursorPosition() { ... }

  // Cursor position is now automatically derived!
  // Just access cursorManager.x, cursorManager.y, cursorManager.height
</script>

<!-- Custom cursor now uses derived state -->
{#if showCustomCursor && !isTyping}
  <div
    class="custom-cursor"
    class:visible={cursorVisible}
    style:left="{cursorManager.x}px"
    style:top="{cursorManager.y}px"
    style:height="{cursorManager.height}px"
  ></div>
{/if}
```

### Phase 3: Simplify Click Handlers

```typescript
function handleClickImpl(event: MouseEvent) {
  if (!overlayElement) return;

  const overlayRect = overlayElement.getBoundingClientRect();
  const relativeY = event.clientY - overlayRect.top;
  const lineIndex = getLineIndexFromY(relativeY, overlayElement.scrollTop, overlayElement);

  const line = lines[lineIndex];
  if (!line) return;

  const lineElement = overlayElement.querySelector(`[data-line="${lineIndex}"]`);
  if (!lineElement) return;

  const offset = getCharacterOffsetFromClick(lineElement, event.clientX);
  const absolutePosition = doc.getAbsolutePosition(lineIndex, offset);

  // Single write point for cursor position
  cursorManager.setPosition(absolutePosition);

  // That's it! No manual updateCursorPosition() call needed.
  // Svelte reactivity handles the rest.
}
```

### Phase 4: Remove Manual Updates

Delete all calls to `updateCursorPosition()`:
- No calls in `handleInput()`
- No calls in `handleKeyUp()`
- No calls in `handleSelectionChange()`

The cursor position updates automatically via Svelte reactivity!

## Benefits

1. **Single Source of Truth**: textarea.selectionStart is the ONLY mutable cursor state
2. **Automatic Synchronization**: Svelte $derived ensures all representations stay in sync
3. **No Manual Updates**: Delete all `updateCursorPosition()` calls
4. **Clear Ownership**: Browser owns native cursor, CursorManager owns conversions, Component owns rendering
5. **Easier Testing**: Pure functions in CursorManager, no side effects
6. **Better Performance**: Svelte only recalculates when textarea.selectionStart actually changes
7. **Prevents Bugs**: Impossible to have desynchronized cursor state

## Migration Strategy

1. ✅ Create `CursorManager.svelte.ts` with derived state
2. ✅ Update `WysiwygCalcMarkEditor.svelte` to use CursorManager
3. ✅ Remove all manual `updateCursorPosition()` calls
4. ✅ Remove `cursorPosition` component state
5. ✅ Update click handlers to use `cursorManager.setPosition()`
6. ✅ Run all cursor tests to verify correctness
7. ✅ Delete deprecated cursor tracking code from CalcMarkDocument

## Open Questions

1. **Should CalcMarkDocument still track cursor?**
   - Currently: `state.cursor = { line, offset }`
   - Proposal: Remove this, CursorManager is the single source
   - Decision: Keep for now as a cache, but make it derived from textarea

2. **How to handle cursor during typing?**
   - Current: Hide custom cursor, show native caret
   - Proposal: Keep this behavior, just use derived state
   - Decision: `showCustomCursor` flag remains, but position is always up-to-date

3. **Performance concerns with $derived?**
   - Cursor position calculated on every selectionStart change
   - Solution: Memoize calculateVisualPosition() results
   - Decision: Measure first, optimize if needed

## Conclusion

By centralizing cursor management in a single CursorManager class with Svelte $derived runes, we eliminate:
- State duplication
- Manual synchronization
- Race conditions
- Coordinate conversion bugs

The native textarea becomes the unambiguous source of truth, and all other representations automatically derive from it through reactive Svelte primitives.
