<script lang="ts">
	import WysiwygCalcMarkEditor from '$lib/components/WysiwygCalcMarkEditor.svelte';

	const SAMPLE_DOCUMENT = `# Budget Calculator

## Income
monthly_salary = $5000
bonus = $500
total_income = monthly_salary + bonus

## Expenses
rent = $1500
food = $800
utilities = $200
total_expenses = rent + food + utilities

## Summary
leftover = total_income - total_expenses

> This is a simple budget calculator written in CalcMark.`;
</script>

<div class="page">
	<header class="header">
		<h1>CalcMark WYSIWYG Editor</h1>
		<p>Textarea + overlay architecture (server-side processing)</p>
	</header>

	<main class="editor-container">
		<WysiwygCalcMarkEditor initialText={SAMPLE_DOCUMENT} />
	</main>

	<footer class="footer">
		<p>Test footer - 10px height</p>
	</footer>
</div>

<style>
	/* Reset body margin for this page */
	:global(body) {
		margin: 0;
		padding: 0;
	}

	/* BULLETPROOF LAYOUT - Nothing can break this */
	.page {
		/* Fixed viewport height grid */
		display: grid;
		grid-template-rows: auto 1fr 10px;
		height: 100vh;
		width: 100vw;
		margin: 0;
		padding: 0;
		background: #f5f5f5;
		overflow: hidden;
	}

	.header {
		/* Row 1: Auto height based on content */
		grid-row: 1;
		padding: 12px 20px;
		background: white;
		border-bottom: 1px solid #e5e7eb;
		text-align: center;
	}

	.editor-container {
		/* Row 2: Takes all remaining space (1fr) */
		grid-row: 2;
		/* CRITICAL: Constrain height to prevent overflow */
		min-height: 0;
		overflow: hidden;
		/* Pass constraints to child */
		display: flex;
		flex-direction: column;
	}

	.footer {
		/* Row 3: Fixed 10px height */
		grid-row: 3;
		background: #dc2626;
		border-top: 2px solid #991b1b;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.footer p {
		margin: 0;
		font-size: 7px;
		line-height: 1;
		color: white;
		font-weight: 600;
		white-space: nowrap;
	}

	h1 {
		margin: 0 0 4px 0;
		font-size: 18px;
		font-weight: 600;
		color: #1e293b;
	}

	.header p {
		margin: 0;
		font-size: 12px;
		color: #64748b;
	}
</style>
