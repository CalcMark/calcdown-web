# Server Code Cleanup

Since CalcMark now runs client-side, these server files are no longer needed:

## Files to Remove

```bash
# Remove API endpoint (no longer called)
rm src/routes/api/process/+server.ts
rm src/routes/api/process/process.test.ts
rmdir src/routes/api/process  # If empty
rmdir src/routes/api          # If empty

# Remove server-side WASM loader (replaced by client version)
rm src/lib/server/calcmark.ts
rmdir src/lib/server          # If empty
```

## Files to KEEP

- ✅ `scripts/download-wasm.js` - Still downloads WASM from GitHub
- ✅ `src/lib/wasm/calcmark.wasm` - Now used client-side
- ✅ `src/lib/wasm/wasm_exec.js` - Now used client-side
- ✅ `package.json` scripts:
  - `wasm:fetch` - Downloads WASM to correct location
  - `postinstall` - Auto-downloads WASM after npm install

## What Changed

### Before:
```
User types → Server API (/api/process) → Server WASM → Response → UI
```

### Now:
```
User types → Web Worker (client) → Client WASM → UI
(No server involved!)
```

## WASM File Location

The `npm run wasm:fetch` script downloads to `src/lib/wasm/`, which is perfect because:
- Vite bundles it for browser use
- Both client and Web Worker can import it
- Same location works for dev and production

## When to Add Server Back

Later when you add:
- **User authentication** → Server endpoints for login/signup
- **Document storage** → Server endpoints for save/load
- **Collaboration** → WebSocket server for real-time sync
- **Validation** → Optional server-side CalcMark validation on save

But for pure editing? **100% client-side now.**
