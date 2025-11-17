<script lang="ts">
	// Test route index - lists all available test fixtures
</script>

<svelte:head>
	<title>Editor Test Fixtures - DO NOT DEPLOY</title>
</svelte:head>

<div class="test-index">
	<header>
		<h1>⚠️ Editor Test Fixtures</h1>
		<p class="warning">
			This route is for E2E testing only and should NOT be deployed to production.
		</p>
	</header>

	<nav class="fixture-list">
		<h2>Available Test Fixtures</h2>
		<p class="note">
			These fixtures provide stable, known content for E2E tests. Currently, all E2E tests use
			<code>/edit</code>. You can update tests to use these fixtures for more predictable testing.
		</p>

		<section>
			<h3>Current Fixtures</h3>
			<ul>
				<li><a href="/test/budget">Budget Calculator</a> - Multi-section document with currency calculations</li>
				<li><a href="/test/simple">Simple Calculation</a> - Minimal 3-line test for precision</li>
				<li><a href="/test/empty">Empty Editor</a> - Blank starting state for interaction tests</li>
				<li><a href="/test/long-lines">Long Lines</a> - Text wrapping and word-break testing</li>
				<li><a href="/test/dependencies">Dependent Calculations</a> - Chained variable references</li>
			</ul>
		</section>

		<section>
			<h3>Suggested Additional Fixtures</h3>
			<p class="suggestion">Create these fixtures as needed for specific test scenarios:</p>
			<ul class="todo">
				<li><code>/test/markdown</code> - Markdown-heavy document (headings, lists, blockquotes)</li>
				<li><code>/test/unicode</code> - Unicode variables with emoji and international characters</li>
				<li><code>/test/errors</code> - Document with intentional syntax errors for diagnostic testing</li>
				<li><code>/test/mixed</code> - Mixed markdown and calculations interleaved</li>
			</ul>
		</section>
	</nav>
</div>

<style>
	.test-index {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, sans-serif;
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
		padding: 2rem;
		background: #fee;
		border: 2px solid #c00;
		border-radius: 8px;
	}

	h1 {
		margin: 0 0 1rem 0;
		color: #c00;
	}

	.warning {
		margin: 0;
		font-weight: 600;
		color: #600;
	}

	.fixture-list {
		background: white;
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 2rem;
	}

	section {
		margin-bottom: 2rem;
	}

	section:last-child {
		margin-bottom: 0;
	}

	h2 {
		margin: 0 0 1.5rem 0;
		color: #333;
		border-bottom: 2px solid #eee;
		padding-bottom: 0.5rem;
	}

	h3 {
		margin: 0 0 0.75rem 0;
		color: #666;
		font-size: 1rem;
		font-weight: 600;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0 0 1.5rem 0;
	}

	li {
		margin-bottom: 0.5rem;
	}

	a {
		color: #0066cc;
		text-decoration: none;
		font-weight: 500;
	}

	a:hover {
		text-decoration: underline;
	}

	.note {
		background: #f0f9ff;
		border-left: 3px solid #0ea5e9;
		padding: 0.75rem;
		margin: 0 0 1.5rem 0;
		font-size: 0.875rem;
		color: #0c4a6e;
	}

	code {
		background: #f1f5f9;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-family: 'Courier New', monospace;
		font-size: 0.875em;
		color: #1e293b;
	}

	.suggestion {
		font-size: 0.875rem;
		color: #64748b;
		margin: 0 0 0.5rem 0;
		font-style: italic;
	}

	ul.todo {
		opacity: 0.6;
	}

	ul.todo li {
		list-style-type: '○ ';
		padding-left: 0.5rem;
	}
</style>
