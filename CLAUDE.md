# Working on the CalcDown Website

This is a website for CalcDown Editor.
The editor relies on the WASM created by the CalcMark implementation at https://github.com/CalcMark/go-calcmark.

- Front end and server code: SvelteKit 5 with TypeScript
- Data storage: Supabase.
- Hosting: Vercel.

## Development Guidelines

- **Building WASM files**: The CalcMark WASM files need to be generated using the calcmark CLI tool.
  1. Install the calcmark CLI tool:

     ```bash
     go install github.com/CalcMark/go-calcmark/impl/cmd/calcmark@main
     ```

  2. The tool will be installed to your `$GOBIN` directory (check with `go env GOBIN`).

  3. **Note**: The `calcmark wasm` command requires running from within a Go module directory. Since this is a SvelteKit project, you cannot generate WASM files directly here. Instead:
     - Use pre-built WASM files from the demo project, OR
     - Clone the go-calcmark repository and run the command there:
       ```bash
       git clone https://github.com/CalcMark/go-calcmark.git
       cd go-calcmark
       calcmark wasm /path/to/calcdown/static/
       ```

  4. The WASM files (`calcmark.wasm` and `wasm_exec.js`) should be placed in the `static/` directory of this project.

- Create tests that validate the desired behavior, or that test a hypothesis.
- Avoid any pre-Svelte 5 code, especially around runes or other deprecated features.
  Do not spin up one-off scripts: use vitest or Playwright, or both.
- Prefer purely functional code that can be easily tested without side efforts.
- Keep CSS as close to the Svelte component using it as possible.
  For example, src/lib/components/CalcToken.svelte should include any CSS necessary for styling individual tokens.
- Always run tests and fix errors before declaring a task to be complete.
- Keep code in $lib/components and $lib/utils or server routes unless code should be global in nature.

### Svelte 5 Reactivity Best Practices

- **Keep state management simple**: Svelte 5's reactivity works best with direct, simple patterns. Avoid overly complex helper functions or state manipulation.
- **Direct assignments trigger reactivity**: Use `blocks = documentToBlocks(...)` rather than complex immutable update patterns.
- **Minimize intermediary state**: Each additional layer of state management can break reactivity. Keep the data flow direct: API → state → template.
- **Test reactivity early**: If state updates don't trigger DOM re-renders, simplify the component structure before adding complexity.
- **Test components in isolation**: Use `@testing-library/svelte` with Vitest browser mode to test Svelte components independently of any page routes. Create `*.svelte.test.ts` files to verify component reactivity and behavior without the overhead of full E2E tests. This catches reactivity issues faster and makes debugging easier.

## Svelte Front-end

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### Available MCP Tools:

#### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

#### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

#### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

#### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
