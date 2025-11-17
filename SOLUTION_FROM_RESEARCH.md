# Solution: Preventing Input Race Conditions

## Research Findings from Production Editors

### 1. Trix Editor
- **Uses `beforeinput` event** (fires BEFORE DOM mutations)
- **Two-tier controller system**: Level2InputController (modern browsers) vs Level0InputController (fallback)
- **Still has Safari issues** - same problems we're experiencing (text appearing in reverse, rendering delays)

### 2. ProseMirror/CodeMirror
- **Uses "updating" flag pattern** to prevent infinite loops
- **Separates read and write phases** using `requestAnimationFrame`
- **Document-diffing algorithm** for minimal DOM updates

### 3. Key Pattern: The "Updating" Flag

From ProseMirror's CodeMirror integration example:

```javascript
class CodeBlock {
  constructor() {
    this.updating = false  // ← Synchronization guard
  }

  // When inner editor changes
  forwardUpdate() {
    if (this.updating || !this.cm.hasFocus) return  // ← Skip if we're updating
    // ... forward changes to outer editor
  }

  // When outer editor changes
  update(node) {
    this.updating = true       // ← Set flag
    this.cm.dispatch({...})    // ← Update inner editor
    this.updating = false      // ← Clear flag
  }
}
```

**Key Insight:** Changes flow in only ONE direction at a time.

---

## Proposed Solution for WYSIWYG Editor

### Problem Recap

Current broken flow:
```
User types → input event → handleInput()
  ↓
  rawText = textarea.value  (read)
  ↓
  Svelte sees rawText changed
  ↓
  bind:value triggers
  ↓
  textarea.value = rawText  (WRITE BACK - causes race!)
  ↓
  Next keystroke confused
  ↓
  Character corruption
```

### Solution: Add Updating Flag

```typescript
// Add flag to prevent feedback loop
let isUpdatingFromInput = $state(false);

function handleInput() {
    if (!textareaElement) return;

    // Set flag to prevent bind:value from writing back
    isUpdatingFromInput = true;

    try {
        rawText = textareaElement.value;
        doc.updateRawText(rawText);
        updateCursorPosition();
        scheduleEvaluation();
    } finally {
        // Clear flag AFTER Svelte's reactivity has processed
        queueMicrotask(() => {
            isUpdatingFromInput = false;
        });
    }
}
```

```svelte
<!-- Modified textarea binding -->
<textarea
    bind:this={textareaElement}
    bind:value={rawText}
    oninput={handleInput}
    ...
/>
```

But wait - Svelte's `bind:value` is automatic. We can't directly prevent it from updating.

### Alternative: Conditional Binding with $effect

```typescript
let internalText = $state('');
let isUpdatingFromInput = $state(false);

function handleInput() {
    if (!textareaElement) return;

    isUpdatingFromInput = true;

    internalText = textareaElement.value;
    doc.updateRawText(internalText);
    updateCursorPosition();
    scheduleEvaluation();

    // Use microtask to ensure Svelte's reactivity completes
    queueMicrotask(() => {
        isUpdatingFromInput = false;
    });
}

// Sync internal state to textarea, but ONLY when not coming from input
$effect(() => {
    if (textareaElement && !isUpdatingFromInput) {
        // Only update textarea when changes come from outside (e.g., evaluation results)
        textareaElement.value = internalText;
    }
});
```

```svelte
<!-- NO bind:value - manual control -->
<textarea
    bind:this={textareaElement}
    oninput={handleInput}
    ...
/>
```

---

## Alternative Solution: Prevent Updates During Typing

### Simpler approach inspired by CodeMirror

CodeMirror separates read/write phases using `requestAnimationFrame`. We can apply similar logic:

```typescript
let isTyping = $state(false);
let typingTimer: any = null;

function handleInput() {
    if (!textareaElement) return;

    // Mark as typing
    isTyping = true;
    clearTimeout(typingTimer);

    // Update from textarea (one-way)
    rawText = textareaElement.value;
    doc.updateRawText(rawText);
    updateCursorPosition();

    // Schedule evaluation AFTER typing stops
    typingTimer = setTimeout(() => {
        isTyping = false;
        evaluateDocument();
    }, USER_INPUT_DEBOUNCE_MS);
}

// Only allow bind:value updates when NOT typing
$effect(() => {
    if (textareaElement && !isTyping && rawText !== textareaElement.value) {
        // Evaluation results can update textarea, but only when user not typing
        textareaElement.value = rawText;
    }
});
```

---

## Recommended Approach: Combination Pattern

Based on research, combine both techniques:

1. **Use "updating" flag** (from ProseMirror pattern)
2. **Use `beforeinput` event** (from Trix pattern)
3. **Remove `bind:value`** and manage manually
4. **Separate evaluation from input handling**

### Implementation

```typescript
// Synchronization flags
let isUpdatingFromUser = $state(false);
let isUpdatingFromEvaluation = $state(false);

// Handle user input
function handleInput(event: Event) {
    if (!textareaElement || isUpdatingFromEvaluation) return;

    isUpdatingFromUser = true;

    try {
        // Read from textarea (source of truth)
        const newText = textareaElement.value;

        // Update document model
        doc.updateRawText(newText);

        // Update cursor immediately
        updateCursorPosition();

        // Schedule evaluation
        scheduleEvaluation();
    } finally {
        // Clear flag after current event loop
        queueMicrotask(() => {
            isUpdatingFromUser = false;
        });
    }
}

// Handle evaluation results
async function evaluateDocument() {
    if (isUpdatingFromUser) {
        // Skip evaluation if user is actively typing
        return;
    }

    isUpdatingFromEvaluation = true;

    try {
        // ... evaluation logic ...

        // Update overlay rendering (NOT textarea)
        lines = doc.getLines();

        // Restore cursor position
        updateCursorPosition();
    } finally {
        isUpdatingFromEvaluation = false;
    }
}

// Optional: Use beforeinput for better control (Level 2 browsers)
function handleBeforeInput(event: InputEvent) {
    // Can intercept and modify input before it affects DOM
    // Useful for special handling (auto-formatting, etc.)
}
```

```svelte
<textarea
    bind:this={textareaElement}
    oninput={handleInput}
    onbeforeinput={handleBeforeInput}  <!-- Optional -->
    value={initialText}  <!-- Only for SSR -->
/>
```

---

## Key Principles from Research

1. **Never write to textarea during input event processing**
2. **Use flags to prevent circular updates**
3. **Separate user input from programmatic updates**
4. **Use microtasks/requestAnimationFrame for timing control**
5. **Evaluation should NEVER modify textarea - only overlay**

---

## Testing Strategy

After implementing, test:
1. Rapid typing with random delays
2. Typing during evaluation
3. Safari/WebKit specific tests
4. Character order preservation
5. Cursor position accuracy

---

## Benefits of This Approach

✅ **Prevents race conditions** - Flags ensure one-way data flow
✅ **Safari compatible** - Same patterns used by Trix/ProseMirror
✅ **Maintains textarea as source of truth** - No bind:value interference
✅ **Clean separation** - User input vs evaluation results
✅ **Testable** - Flags can be inspected in tests

---

## Next Steps

1. Implement updating flags
2. Remove bind:value
3. Add manual synchronization with $effect
4. Test in WebKit
5. Verify no character corruption
