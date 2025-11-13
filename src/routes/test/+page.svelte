<script lang="ts">
	import CalculationLine from '$lib/components/CalculationLine.svelte';
	import CalcToken from '$lib/components/CalcToken.svelte';
	import CalculationBlockEditor from '$lib/components/CalculationBlockEditor.svelte';
	import MarkdownBlockEditor from '$lib/components/MarkdownBlockEditor.svelte';
	import type { Block } from '$lib/stores/blockStore.svelte';

	// Sample tokens for "discount = 20%"
	const sampleTokens = [
		{ type: 'IDENTIFIER', value: 'discount', originalText: 'discount', start: 0, end: 8 },
		{ type: 'ASSIGN', value: '=', originalText: '=', start: 9, end: 10 },
		{ type: 'NUMBER', value: '0.2', originalText: '20%', start: 11, end: 14 }
	];

	// Sample tokens for "tax = 10%"
	const sampleTokens2 = [
		{ type: 'IDENTIFIER', value: 'tax', originalText: 'tax', start: 0, end: 3 },
		{ type: 'ASSIGN', value: '=', originalText: '=', start: 4, end: 5 },
		{ type: 'NUMBER', value: '0.1', originalText: '10%', start: 6, end: 9 }
	];

	const sampleDiagnostics = [];

	const sampleEvalResult = {
		Value: { Value: '0.2', SourceFormat: '20%' },
		Symbol: '',
		SourceFormat: '20%',
		OriginalLine: 1
	};

	const sampleEvalResult2 = {
		Value: { Value: '0.1', SourceFormat: '10%' },
		Symbol: '',
		SourceFormat: '10%',
		OriginalLine: 2
	};

	const sampleVariableContext = {
		discount: {
			Value: { Value: '0.2', SourceFormat: '20%' },
			Symbol: '',
			SourceFormat: '',
			OriginalLine: 1
		},
		tax: {
			Value: { Value: '0.1', SourceFormat: '10%' },
			Symbol: '',
			SourceFormat: '',
			OriginalLine: 2
		}
	};

	// Sample blocks
	const calculationBlock: Block = {
		id: 'calc-1',
		type: 'calculation',
		content: 'discount = 20%',
		lineStart: 1,
		lineEnd: 1,
		tokens: { 1: sampleTokens },
		diagnostics: { 1: sampleDiagnostics },
		evaluationResults: [sampleEvalResult]
	};

	const calculationBlock2: Block = {
		id: 'calc-2',
		type: 'calculation',
		content: 'tax = 10%',
		lineStart: 2,
		lineEnd: 2,
		tokens: { 2: sampleTokens2 },
		diagnostics: { 2: [] },
		evaluationResults: [sampleEvalResult2]
	};

	const markdownBlock: Block = {
		id: 'md-1',
		type: 'markdown',
		content: '# Test Heading\n\nThis is **bold** and this is *italic*.',
		lineStart: 2,
		lineEnd: 4
	};

	let isActive = $state(false);
</script>

<div class="test-container">
	<h1>Component Testing Page</h1>

	<section>
		<h2>1. CalcToken Component (Individual Tokens)</h2>
		<p>Testing individual token rendering with colors:</p>
		<div class="token-test">
			<CalcToken
				token={{
					type: 'IDENTIFIER',
					value: 'discount',
					originalText: 'discount',
					start: 0,
					end: 8
				}}
				diagnostics={[]}
				variableContext={sampleVariableContext}
			/>
			<span> = </span>
			<CalcToken
				token={{ type: 'NUMBER', value: '0.2', originalText: '20%', start: 11, end: 14 }}
				diagnostics={[]}
				variableContext={{}}
			/>
		</div>
	</section>

	<section>
		<h2>2. CalculationLine Component (Full Line)</h2>
		<p>Testing full calculation line with syntax highlighting:</p>
		<div class="line-test">
			<CalculationLine
				lineNumber={1}
				tokens={sampleTokens}
				diagnostics={sampleDiagnostics}
				evaluationResult={sampleEvalResult}
				lineText="discount = 20%"
				variableContext={sampleVariableContext}
			/>
		</div>
	</section>

	<section>
		<h2>3. Two Consecutive Calculation Blocks</h2>
		<p>Testing two calculation blocks back-to-back:</p>
		<div class="block-test">
			<CalculationBlockEditor
				block={calculationBlock}
				isActive={false}
				variableContext={sampleVariableContext}
				onContentChange={() => {}}
				onEnter={() => {}}
				onTab={() => {}}
				onBackspaceAtStart={() => {}}
				onBlur={() => {}}
			/>
			<CalculationBlockEditor
				block={calculationBlock2}
				isActive={false}
				variableContext={sampleVariableContext}
				onContentChange={() => {}}
				onEnter={() => {}}
				onTab={() => {}}
				onBackspaceAtStart={() => {}}
				onBlur={() => {}}
			/>
		</div>
	</section>

	<section>
		<h2>4. CalculationBlockEditor Component (Edit Mode)</h2>
		<p>Testing calculation block in edit mode (isActive = true):</p>
		<div class="block-test">
			<CalculationBlockEditor
				block={calculationBlock}
				isActive={true}
				variableContext={sampleVariableContext}
				onContentChange={() => {}}
				onEnter={() => {}}
				onTab={() => {}}
				onBackspaceAtStart={() => {}}
				onBlur={() => {}}
			/>
		</div>
	</section>

	<section>
		<h2>5. MarkdownBlockEditor Component (Preview Mode)</h2>
		<p>Testing markdown block in preview mode:</p>
		<div class="block-test">
			<MarkdownBlockEditor
				block={markdownBlock}
				isActive={false}
				onContentChange={() => {}}
				onEnter={() => {}}
				onTab={() => {}}
				onBackspaceAtStart={() => {}}
				onBlur={() => {}}
			/>
		</div>
	</section>

	<section>
		<h2>6. MarkdownBlockEditor Component (Edit Mode)</h2>
		<p>Testing markdown block in edit mode:</p>
		<div class="block-test">
			<MarkdownBlockEditor
				block={markdownBlock}
				isActive={true}
				onContentChange={() => {}}
				onEnter={() => {}}
				onTab={() => {}}
				onBackspaceAtStart={() => {}}
				onBlur={() => {}}
			/>
		</div>
	</section>

	<section>
		<h2>7. Toggle Test</h2>
		<p>Click the button to toggle between active/inactive states:</p>
		<button onclick={() => (isActive = !isActive)}>
			Toggle Active State: {isActive ? 'Active' : 'Inactive'}
		</button>
		<div class="block-test">
			<CalculationBlockEditor
				block={calculationBlock}
				{isActive}
				variableContext={sampleVariableContext}
				onContentChange={() => {}}
				onEnter={() => {}}
				onTab={() => {}}
				onBackspaceAtStart={() => {}}
				onBlur={() => {}}
			/>
		</div>
	</section>

	<section>
		<h2>8. Raw Token Data</h2>
		<details>
			<summary>Click to see raw token structure</summary>
			<pre>{JSON.stringify(sampleTokens, null, 2)}</pre>
		</details>
	</section>

	<section>
		<h2>9. Raw Block Data</h2>
		<details>
			<summary>Click to see raw calculation block structure</summary>
			<pre>{JSON.stringify(calculationBlock, null, 2)}</pre>
		</details>
	</section>
</div>

<style>
	.test-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 40px 20px;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	h1 {
		font-size: 32px;
		margin-bottom: 40px;
		color: #1e293b;
	}

	section {
		margin-bottom: 60px;
		padding: 20px;
		background: #ffffff;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}

	h2 {
		font-size: 20px;
		margin-bottom: 12px;
		color: #334155;
		font-weight: 600;
	}

	p {
		margin-bottom: 16px;
		color: #64748b;
	}

	.token-test,
	.line-test,
	.block-test {
		padding: 20px;
		background: #f8fafc;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
	}

	button {
		padding: 12px 24px;
		background: #0ea5e9;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 16px;
		cursor: pointer;
		margin-bottom: 16px;
	}

	button:hover {
		background: #0284c7;
	}

	pre {
		background: #1e293b;
		color: #f1f5f9;
		padding: 16px;
		border-radius: 6px;
		overflow-x: auto;
		font-size: 13px;
		line-height: 1.6;
	}

	details {
		margin-top: 12px;
	}

	summary {
		cursor: pointer;
		color: #0ea5e9;
		font-weight: 500;
	}

	summary:hover {
		text-decoration: underline;
	}
</style>
