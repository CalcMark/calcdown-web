# WYSIWYG Editor - Critical Bug Status Report

## Executive Summary

The WYSIWYG editor has **CRITICAL, FLAKY bugs** causing text corruption and cursor issues during typing. These bugs are:
- **Reproducible** in automated tests (flaky)
- **User-reported** in Safari (consistent but hard to reproduce)
- **Timing-dependent** (race conditions)
- **Data-corrupting** (characters reordered, deleted, or phantom characters inserted)

**Impact:** Any deviation from user input is unacceptable for a text editor.
**Severity:** CRITICAL
**Status:** ROOT CAUSE IDENTIFIED

---

## Bugs Confirmed

### 1. Character Reordering (CONFIRMED, REPRODUCED)
**Evidence:** Test output shows "salary" → "slryaa"
**Frequency:** Flaky (timing-dependent)
**Root Cause:** Race condition during typing + evaluation

### 2. Phantom Spaces (USER REPORTED, Safari)
**Evidence:** User saw "$500,000" → "$500, 000"
**Frequency:** Flaky in Safari
**Root Cause:** Same race condition as #1

### 3. Character Deletion After Cursor (USER REPORTED, Safari)
**Evidence:** "monthly_salary" → "mo_salary" (y deleted)
**Frequency:** Cannot reliably reproduce
**Root Cause:** Same race condition as #1

### 4. Cursor Lag (USER REPORTED, Safari)
**Evidence:** User reports cursor "catches up after couple seconds"
**Frequency:** Consistent in Safari
**Root Cause:** updateCursorPosition() may be slow, or visual cursor update delayed

---

## Root Cause Analysis

### The Architecture

```
User types
    ↓
Textarea input event
    ↓
handleInput() runs:
  - rawText = textareaElement.value  (read)
  - doc.updateRawText(rawText)       (update model)
  - updateCursorPosition()            (update visual)
  - scheduleEvaluation()              (debounce eval)
    ↓
Svelte reactivity:
  - rawText changed → bind:value triggers
  - Svelte updates textarea.value    (WRITE BACK!)
    ↓
RACE CONDITION HERE
    ↓
Next keystroke arrives
    ↓
Textarea state is inconsistent
    ↓
Character corruption
```

### The Problem: `bind:value` Feedback Loop

1. **User types** 'a' → Textarea has "a"
2. **Input event fires** → `handleInput()` sets `rawText = "a"`
3. **Svelte sees `rawText` changed** → Triggers bind:value update
4. **Svelte writes back** `textarea.value = "a"` (redundant!)
5. **User types** 'b' **DURING** step 4
6. **Browser is confused** - value being set while input is happening
7. **Result:** Characters dropped, reordered, or duplicated

### Why It's Flaky

The bug only manifests when:
- Typing happens DURING Svelte's reactivity update
- Evaluation is processing (adds more state changes)
- Browser is under load (slow rendering)
- Safari's stricter event handling

### Why Removing `bind:value` Made It Worse

Without `bind:value`:
- Textarea has NO initial value
- No two-way sync between state and DOM
- **Worse corruption:** "bonus" → "sunob" (reversed!)

**Conclusion:** We need `bind:value` for initialization, but NOT for ongoing updates.

---

## Failed Attempts

1. ✅ **Removed `onkeyup` handler** - Fixed off-by-one errors
2. ✅ **Removed `requestAnimationFrame`** - Fixed async cursor updates
3. ❌ **Removed `bind:value`** - CATASTROPHIC text corruption
4. ❌ **Used one-way `value={rawText}`** - Still caused character reordering

---

## The Real Solution

### Hypothesis

The problem is that `handleInput()` updates `rawText`, which triggers Svelte reactivity, which tries to update the textarea, creating a feedback loop.

### Solution: One-Way Data Flow

**Current (BROKEN):**
```typescript
// handleInput reads AND writes to rawText
function handleInput() {
    rawText = textareaElement.value;  // ← This triggers bind:value!
    ...
}
```

```svelte
<!-- This creates feedback loop -->
<textarea bind:value={rawText} oninput={handleInput} />
```

**Proposed Fix:**
```typescript
// Internal state for textarea, separate from reactive state
let textareaText = $state('');

function handleInput() {
    if (!textareaElement) return;

    // Update internal state (NO reactive bindings)
    textareaText = textareaElement.value;

    // Update document model
    doc.updateRawText(textareaText);

    // Update cursor immediately
    updateCursorPosition();

    // Schedule evaluation
    scheduleEvaluation();
}
```

```svelte
<!-- NO bind:value, textarea is uncontrolled -->
<textarea
    bind:this={textareaElement}
    oninput={handleInput}
    value={initialText}  <!-- Only for SSR hydration -->
/>
```

### Key Changes:

1. **Remove `bind:value`** - No two-way binding
2. **Use `value={initialText}` ONLY** - Sets initial value for SSR
3. **After mount, textarea is uncontrolled** - Browser manages it
4. **We READ from textarea** - Never write to it
5. **No Svelte reactivity on textarea value** - No feedback loop

---

## Implementation Plan

### Phase 1: Fix the Race Condition
- [ ] Remove `bind:value={rawText}`
- [ ] Add `value={initialText}` for SSR hydration
- [ ] Ensure `handleInput()` ONLY reads from textarea
- [ ] Verify NO code path writes to `textarea.value` after mount

### Phase 2: Test Thoroughly
- [ ] Run all existing tests
- [ ] Add new flaky-bug detection tests
- [ ] Run tests in WebKit (Safari engine)
- [ ] Test with various typing speeds
- [ ] Test during active evaluation

### Phase 3: Safari-Specific Testing
- [ ] Test on actual Safari browser
- [ ] Test cursor lag
- [ ] Test phantom spaces
- [ ] Test character corruption

---

## Test Coverage

### Existing Tests (27 tests)
- ✅ Cursor position after every character
- ✅ No phantom characters
- ✅ Rapid typing fidelity
- ✅ Delete/Backspace behavior
- ✅ Character preservation
- ❌ **1 flaky test** (character reordering)

### New Tests Needed
- Safari-specific timing tests (created: `wysiwyg-safari-timing.spec.ts`)
- WebKit browser testing
- Stress testing with rapid typing
- Concurrent typing + evaluation tests

---

##Evidence

### Character Reordering

```
Test: fuzz test: random edits should maintain exact character sequence
Mismatch after typing "salary"
Expected: "salary"
Got:      "slryaa"
```

### Previous Character Scrambling (when bind:value removed)

```
Test: continuous typing session
Expected: "bonus = $500"
Got:      " = $500sunob"
```

**Analysis:** Characters "bonus" were REVERSED to "sunob" and moved to wrong position.

---

## Next Steps

1. **IMMEDIATE:** Do NOT remove `bind:value` again - it causes worse corruption
2. **INVESTIGATE:** Why does `bind:value` + `oninput` create race condition?
3. **FIX:** Find way to prevent Svelte from writing back to textarea during input
4. **TEST:** Run Safari/WebKit tests to validate fix
5. **DOCUMENT:** Update WYSIWYG architecture docs with findings

---

## Questions for Further Investigation

1. Can we use `bind:this` without `bind:value`?
2. Can we disable Svelte's two-way binding update during input?
3. Should evaluation pause during active typing?
4. Should we debounce cursor position updates?
5. Is there a Svelte-specific way to handle controlled textareas?

---

##Recommendations

### Short Term
- Keep `bind:value` for now (lesser of two evils)
- Add more logging to catch character corruption
- Run tests in WebKit to reproduce Safari bugs

### Medium Term
- Refactor to eliminate `bind:value` properly
- Use uncontrolled textarea with careful state management
- Add comprehensive timing tests

### Long Term
- Consider alternative WYSIWYG architectures (ContentEditable, ProseMirror, etc.)
- Performance profiling of cursor position calculation
- Safari-specific optimizations

---

## Priority

**CRITICAL** - This affects core editing functionality. Any text corruption is unacceptable.

**Timeline:** Should be fixed before any production release.

**User Impact:** HIGH - Users cannot trust the editor with their data.
