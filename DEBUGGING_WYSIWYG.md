# Debugging WYSIWYG Editor - Client-Side WASM

## Dev Server Running

**URL**: http://localhost:5173/wysiwyg

## What to Check in Browser Console

### Expected Console Output (Success)

When the page loads and you type, you should see:

```
[WorkerManager] ✓ CalcMark worker initialized
[Worker] Initializing CalcMark WASM...
[Worker] ✓ CalcMark WASM initialized
[WYSIWYG] evaluateDocument: starting
[Worker] Evaluating input, length: <number>
[Worker] ✓ Evaluation complete, sending results
[WorkerManager] Received result for request <id>
[WYSIWYG] evaluateDocument: got results
```

### Error Scenarios

**If you see module resolution errors:**
```
[WorkerManager] Worker error: Failed to fetch dynamically imported module
```
→ The worker can't load the WASM files. This is a Vite bundling issue.

**If you see WASM initialization errors:**
```
[Worker] Error: CalcMark API not initialized
```
→ The Go WASM runtime isn't loading properly.

**If you see no logs at all:**
→ The worker isn't being created. Check browser DevTools → Sources → Web Workers

## Current Issues to Look For

### 1. Overlay Misalignment
**Symptom**: The rendered/highlighted text appears shifted up and to the right
**How to verify**: Type `# Budget Calculator` and compare textarea vs overlay positions

### 2. Cursor Position
**Symptom**: Cursor appears in wrong location or is too tall
**How to verify**: Click in the middle of a line - cursor should appear where you clicked

### 3. No Syntax Highlighting
**Symptom**: Text appears plain, no markdown rendering or calc highlighting
**How to verify**: Type `x = 5` - should show syntax highlighted after 150ms debounce

## Browser DevTools Commands

Open Console and run:

```javascript
// Check if worker is running
console.log(window.__workerManager);

// Manually trigger evaluation
const textarea = document.querySelector('.raw-textarea');
console.log('Textarea value:', textarea.value);
```

## Next Steps Based on Console Output

### If Worker Loads Successfully
→ Issue is with alignment CSS or cursor positioning logic

### If Worker Fails to Load
→ Need to fix Vite worker bundling config

### If WASM Fails to Initialize
→ Need to check WASM file paths and Go runtime

## Screenshot What You See

Please screenshot:
1. **Browser console** - full log output
2. **DevTools Sources tab** - Web Workers section
3. **The editor** - showing the misalignment/cursor issues

This will help me identify the exact issue!
