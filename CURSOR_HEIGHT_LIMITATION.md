# Cursor Height Limitation in WYSIWYG Editor

## Problem

The native browser cursor in a `<textarea>` is always the height of the `line-height` CSS property, not the `font-size`. This creates a visual mismatch when `line-height` is larger than `font-size` (e.g., `line-height: 1.75` makes the cursor ~75% taller than the text).

## Current State

- **Font size**: 16px (var(--editor-font-size))
- **Line height**: 1.75 = 28px (var(--editor-line-height))
- **Cursor height**: 28px (cannot be changed)
- **Desired cursor height**: ~16px (font-size)

## Why This Happens

CSS provides **no property** to control cursor height in a textarea. The browser automatically sets cursor height equal to `line-height`. This is intentional browser behavior and cannot be overridden.

## Attempted Solutions

### ❌ CSS `caret-color`

- Only controls cursor **color**, not height
- Cannot affect cursor dimensions

### ❌ Custom CSS properties

- No `caret-height`, `cursor-height`, or similar exists
- `line-height` affects both text spacing AND cursor height

### ✅ Reduce `line-height`

- Setting `line-height: 1` makes cursor = font-size
- **Problem**: Reduces text readability, lines too cramped
- **Not recommended** for a document editor

### ✅ Custom cursor overlay (RECOMMENDED)

- Create a `<div>` positioned where cursor should be
- Style it to be exactly `font-size` height
- Hide native cursor with `caret-color: transparent`
- **Advantages**:
  - Exact control over cursor height
  - Can match font-size perfectly
  - Can customize appearance (color, width, animation)
- **Disadvantages**:
  - Requires JavaScript to calculate position
  - Must update on every cursor movement
  - Can feel "janky" if not implemented carefully

## Current Implementation

We're using the **native browser cursor** with `line-height: 1.75`, which means:

- ✅ Zero JavaScript overhead
- ✅ Perfect cursor positioning (browser handles it)
- ✅ Native accessibility (screen readers, etc.)
- ❌ Cursor is 28px tall instead of 16px
- ❌ Visual mismatch between cursor and text height

## Recommendations

### Option 1: Accept Tall Cursor (Current)

**Status**: Implemented

- Easiest solution
- Zero performance cost
- Standard browser behavior
- Users are familiar with this from other web apps

### Option 2: Implement Custom Cursor Overlay

**Status**: Not implemented (was removed earlier due to jank)

- Would require:
  1. Calculate cursor position from `selectionStart`
  2. Create overlay div at that position
  3. Set height to `font-size` (16px)
  4. Update on keypress, mouse click, arrow keys
  5. Implement blinking animation
  6. Hide when textarea loses focus

**Implementation considerations**:

- Use `requestAnimationFrame` for smooth updates
- Debounce rapid movements
- Cache measurements to avoid layout thrashing
- Use CSS `transform` for positioning (GPU-accelerated)

### Option 3: Reduce Line Height

**Status**: Not recommended

- Would make lines too cramped
- Reduces readability
- Not suitable for a document editor

## Test Coverage

Created comprehensive test suite in `/e2e/wysiwyg-cursor-height.spec.ts`:

- ✅ Verifies cursor is visible
- ✅ Confirms font-size vs line-height measurements
- ✅ Takes screenshots for visual regression testing
- ❌ Cannot actually measure cursor height (browser limitation)

## Conclusion

**The cursor height issue is a browser limitation, not a bug.**

To fix it properly, we need to implement a custom cursor overlay (Option 2). This was previously attempted but removed due to performance concerns. If cursor height is a priority, we should re-implement the custom cursor with better performance optimization (see implementation considerations above).

Otherwise, we accept the native browser behavior where cursor = line-height.
