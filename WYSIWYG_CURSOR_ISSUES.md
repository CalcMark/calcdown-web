# WYSIWYG Editor - Critical Cursor and Input Issues

## Summary of Reported Bugs

### 1. Phantom Space Bug (Safari)
**Reported:** User typed ',' after '$500', then typed '000' → Got '$500, 000' with unwanted space
**Status:** Cannot reproduce in Chromium tests, Safari-specific
**Impact:** Critical - breaks editing fidelity

### 2. Cursor Lag (Safari)
**Reported:** Cursor doesn't update immediately after typing, "catches up after a couple seconds"
**Status:** Cannot reproduce in Chromium tests, Safari-specific
**Impact:** Critical - breaks real-time editing experience

### 3. Character Deletion Corruption (Safari)
**Reported:** Cursor between 'l' and 'y' in "monthly", rapid Backspace deleted characters before cursor BUT ALSO deleted the 'y' AFTER cursor
**Result:** `"monthly_salary"` → `"mo_salary"` (the 'y' was deleted)
**Status:** Cannot reproduce in Chromium tests - Chromium correctly preserves 'y'
**Impact:** CRITICAL - data loss, corrupts user's text

## Root Cause Analysis

### The Fundamental Architecture Problem

The WYSIWYG editor has a race condition between:

1. **User Input** (textarea value changes)
2. **Svelte Reactivity** (bind:value two-way binding)
3. **Cursor Position** (managed separately from textarea)
4. **Async Evaluation** (CalcMark processing)

### The Specific Issue: `bind:value` + `oninput`

In `WysiwygCalcMarkEditor.svelte:395-396`:

```svelte
<textarea
    bind:value={rawText}
    oninput={handleInput}
    ...
>
```

**This creates a problematic pattern:**

1. User types → Browser fires `input` event
2. `handleInput()` runs: `rawText = textareaElement.value`
3. Svelte's reactivity sees `rawText` changed
4. Svelte tries to UPDATE the textarea through `bind:value`
5. **In Safari**: This can reset the cursor position or interfere with ongoing input

**The Flow:**
```
User types 'x'
  ↓
input event fires
  ↓
handleInput() sets rawText = "...x"
  ↓
Svelte reactivity triggers
  ↓
Svelte sets textarea.value = "...x"  ← REDUNDANT and DANGEROUS
  ↓
Safari: "Wait, the value changed during input processing?"
  ↓
Safari: "Let me reset the cursor position to be safe"
  ↓
BUG: Cursor jumps or lags
```

### Why It Works in Chromium But Fails in Safari

- **Chromium**: More lenient about value changes during input processing, maintains cursor
- **Safari**: Stricter event handling, may reset cursor when value changes during input

### Evidence from Tests

All tests pass in Chromium:
- ✅ Cursor updates after every character
- ✅ No phantom spaces
- ✅ Characters after cursor preserved during rapid Backspace

But user experiences failures in Safari:
- ❌ Cursor lags
- ❌ Phantom spaces appear
- ❌ Characters after cursor get deleted

## The Solution: Remove `bind:value`

### Why This Fixes the Issue

1. **One-way flow**: Input event → Update state → No feedback loop
2. **No reactivity interference**: Svelte won't try to "sync back" to textarea
3. **Cursor safety**: No redundant value sets during input processing

### Implementation

**Current (Broken):**
```svelte
<textarea
    bind:value={rawText}
    oninput={handleInput}
>
```

**Fixed:**
```svelte
<textarea
    bind:this={textareaElement}
    oninput={handleInput}
    value={initialText}  <!-- Only for SSR/initial load -->
>
```

**handleInput remains the same:**
```typescript
function handleInput() {
    if (!textareaElement) return;

    // THIS is the single source of truth
    rawText = textareaElement.value;
    doc.updateRawText(rawText);

    updateCursorPosition();
    scheduleEvaluation();
}
```

### Why `value={initialText}` Instead of `bind:value`

- `value={...}` is ONE-WAY: Svelte → DOM only
- Used ONLY for initial render (SSR, hydration)
- After that, textarea is controlled by browser native behavior
- Input events update our state, but we NEVER write back to textarea
- This prevents the race condition

## Additional Considerations

### Document State Management

The `doc.updateRawText(rawText)` call is important - it updates the document model. But the document model should NOT flow back to the textarea. The textarea is the source of truth for user input.

### Evaluation and Re-rendering

The evaluation flow is correct:
1. User input → Update textarea (native)
2. Input event → Update `rawText` → Update `doc`
3. Debounced → Evaluate → Update overlay rendering
4. Preserve cursor position during evaluation

The key is that evaluation should NEVER modify the textarea value - only the overlay rendering.

## Testing Strategy

### Current Test Coverage (Chromium)

- ✅ Cursor position after every character
- ✅ No phantom characters
- ✅ Rapid typing fidelity
- ✅ Delete/Backspace behavior
- ✅ Character preservation during rapid delete

### Needed: Safari-Specific Tests

Since all bugs appear Safari-specific, we need:
- Run existing tests in WebKit (Playwright supports this)
- Add Safari-specific timing tests
- Test with actual Safari browser on macOS

### How to Run Tests in WebKit

```bash
npx playwright test --project=webkit
```

## Implementation Checklist

- [ ] Remove `bind:value={rawText}` from textarea
- [ ] Add `value={initialText}` for initial render only
- [ ] Verify `handleInput()` is sole source of rawText updates
- [ ] Ensure evaluation NEVER modifies textarea value
- [ ] Test in WebKit (Safari engine)
- [ ] Verify cursor position updates in Safari
- [ ] Verify no character corruption in Safari
- [ ] Verify no phantom spaces in Safari

## Risk Assessment

**Risk of Change: LOW**
- Only removing a two-way binding
- Not changing any logic
- Input handling stays the same

**Impact of Fix: HIGH**
- Should eliminate Safari race conditions
- Should fix cursor lag
- Should fix character corruption
- Should fix phantom spaces

## References

- Svelte docs on bindings: https://svelte.dev/docs/element-directives#bind-property
- Similar issues: https://github.com/sveltejs/svelte/issues/6112
- Input event behavior: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/input_event
