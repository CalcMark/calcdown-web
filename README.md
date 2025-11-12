# Calcdown - CalcMark SvelteKit Application

A SvelteKit 5 application demonstrating CalcMark syntax highlighting, evaluation, and diagnostics with server-side WASM processing.

## Features

- **Server-side WASM**: CalcMark WASM runs on the Node.js server (no 3MB client download)
- **Real-time processing**: Syntax highlighting, evaluation, and diagnostics as you type
- **Svelte 5 runes**: Modern reactive patterns with `$state`, `$derived`, `$effect`
- **Block-based markdown rendering**: Proper rendering of markdown structures (lists, blockquotes, etc.)
- **Token-based highlighting**: Color-coded tokens with contextual styling
- **Live diagnostics**: Errors, warnings, and hints displayed inline
- **Evaluation results**: See calculated values for each line
- **Interactive tooltips**: Hover over calculation lines to see results and diagnostics

## Prerequisites

- **Node.js 18+** (for running the SvelteKit dev server)
- **Go 1.21+** (for building the WASM module)

## Setup

### 1. Build the WASM module

**IMPORTANT**: The demo requires WASM files to be built first. These files are **NOT** in git and must be generated locally.

```bash
# From the go-calcmark project root, build the calcmark CLI tool first
cd /Users/bitsbyme/projects/go-calcmark
go build -o calcmark ./impl/cmd/calcmark

# Then use it to build WASM files directly into this project's static/ directory
./calcmark wasm /Users/bitsbyme/projects/calcdown/static/
```

This creates two files in `static/` (both are git-ignored):
- `calcmark.wasm` - The compiled WASM binary (~3MB)
- `wasm_exec.js` - Go's WASM runtime loader

**Why these aren't in git**: The WASM file is large (~3MB) and should be built locally for your Go version.

### 2. Install dependencies

```bash
npm install
```

### 3. Run the development server

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

Then open http://localhost:5173 in your browser.

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## How It Works

### Server-Side Architecture

The demo uses **server-side WASM processing** to avoid sending 3MB of WASM to every client:

1. **WASM Initialization** (`src/lib/server/calcmark.ts`)
   - Loads WASM once when server starts
   - Initializes `global.calcmark` API
   - Single-pass evaluation for O(n) performance

2. **API Endpoint** (`src/routes/api/process/+server.ts`)
   - POST `/api/process` with `{ input: string }`
   - Returns: classifications, tokens, evaluationResults, diagnostics

3. **Client Components** (Svelte 5 with runes)
   - Editor calls API on input change (debounced 150ms)
   - Receives processed data and updates UI reactively
   - Uses `$state`, `$derived`, `$effect` for reactivity

### Data Flow

```
User types in editor
    ↓
CalcMarkEditor.svelte (debounced)
    ↓
POST /api/process
    ↓
Server: processCalcMark() in Node.js
    ├── classifyLines()
    ├── tokenize()
    ├── evaluate() (single pass)
    └── validate()
    ↓
Response: { classifications, tokens, evaluationResults, diagnostics }
    ↓
SyntaxHighlighter.svelte ($derived.by)
    ↓
CalcMarkBlock.svelte (groups lines into blocks)
    ├── Markdown blocks → {@html marked.parse(...)}
    └── Calculation blocks → CalculationLine components
```

## Troubleshooting

### WASM files not found

**Error**: `ENOENT: no such file or directory, open 'static/calcmark.wasm'`

**Solution**:
```bash
# From go-calcmark project root
go build -o calcmark ./impl/cmd/calcmark
./calcmark wasm /Users/bitsbyme/projects/calcdown/static/
```

This builds and copies both `calcmark.wasm` and `wasm_exec.js` to the correct location.

### Server initialization fails

**Error**: `CalcMark API not initialized`

**Solution**:
- Ensure Go WASM was built with correct Go version: `go version`
- The `calcmark wasm` command automatically uses the correct `wasm_exec.js` for your Go version
- Rebuild if needed

### API endpoint returns 500

Check server logs for errors. Common issues:
- WASM files missing or corrupted
- Go runtime version mismatch
- Invalid input format

## Performance Notes

- **No client WASM download**: Server processes everything
- **Single-pass evaluation**: O(n) instead of O(n²)
- **Debounced input**: 150ms delay prevents excessive API calls
- **Block-based rendering**: Efficient markdown parsing
- **Caching**: Server maintains WASM instance across requests

## Browser Support

Works in all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
