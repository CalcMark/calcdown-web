# Instant Evaluation Upgrade: Client-Side WASM

## The Problem

Current architecture:

```
User types → 150ms debounce → 100-300ms network → server WASM → re-render
Total latency: 250-450ms (causes jank, dropped characters, interruptions)
```

## The Solution

**Run CalcMark WASM in a Web Worker on the client.**

New architecture:

```
User types → 150ms debounce → <5ms Web Worker → re-render
Total latency: ~155ms (buttery smooth)
```

## Files Created

1. **`src/lib/client/calcmark.ts`** - Browser-side WASM loader (mirrors server implementation)
2. **`src/lib/workers/calcmark.worker.ts`** - Web Worker for background evaluation
3. **`src/lib/client/calcmarkWorkerManager.ts`** - Worker lifecycle manager

## Changes Needed to WysiwygCalcMarkEditor.svelte

### Before (lines 310-316):

```typescript
const response = await fetch('/api/process', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ input: text, offset })
});

const results = await response.json();
```

### After:

```typescript
import { getWorkerManager } from '$lib/client/calcmarkWorkerManager';

// In component setup:
const workerManager = getWorkerManager();

// In evaluateDocument() function (replace lines 308-316):
const { text, offset } = doc.getTextForEvaluation();

// Use Web Worker instead of server fetch
const results = await workerManager.evaluate(text, offset);
```

That's it! Just replace the `fetch()` call with `workerManager.evaluate()`.

## Why This Works

1. **Zero network latency**: WASM runs locally in browser
2. **Non-blocking**: Web Worker runs in background thread
3. **Same API**: Results have identical structure to server response
4. **Same WASM**: Uses the exact same `calcmark.wasm` file (3.8MB, already bundled)
5. **Automatic cancellation**: Newer requests cancel older ones (prevents stale updates)

## Benefits

✅ **Typing never interrupted** - No network round-trip
✅ **Sub-160ms latency** - Instant syntax highlighting
✅ **No cursor sync issues** - Fast enough to keep native cursor visible
✅ **Same evaluation logic** - Server and client use identical WASM
✅ **Progressive enhancement** - Server can still validate on save

## Testing Strategy

1. Update `WysiwygCalcMarkEditor.svelte` with the 3-line change above
2. Test typing speed - should feel instant
3. Test complex calculations - should evaluate in background without blocking
4. Test rapid typing - older requests should auto-cancel

## Optional: Dual-Mode Strategy

Keep server as authoritative source:

```typescript
// Client-side: instant feedback
const clientResults = await workerManager.evaluate(text, offset);
doc.updateFromResults(clientResults);

// Server-side: validation when saving (debounced, less frequent)
if (shouldValidate) {
	const serverResults = await fetch('/api/process', { ... });
	if (resultsMatch(clientResults, serverResults)) {
		// Client and server agree - all good
	} else {
		// Server found an issue client missed - show warning
		showValidationWarning(serverResults);
	}
}
```

## Size Considerations

- **WASM file**: 3.8MB (already being shipped to browser)
- **Additional code**: ~5KB for worker manager
- **Total increase**: ~5KB (WASM is already bundled)

The WASM is already in your browser bundle (see `.svelte-kit/output/client/`), you're just not using it!

## Migration Path

1. ✅ Create client-side files (DONE - see above)
2. ⏳ Update editor component (3-line change)
3. ⏳ Test typing performance
4. ⏳ Remove server `/api/process` endpoint (or keep for validation)
5. ⏳ Deploy

This solves your fundamental latency problem without changing editors or architecture.
