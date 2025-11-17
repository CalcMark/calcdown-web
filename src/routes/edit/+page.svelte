<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';

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
	<main class="editor-container">
		<Editor initialText={SAMPLE_DOCUMENT} />
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
		/* Fixed viewport height grid - navigation is now in root layout */
		display: grid;
		grid-template-rows: 1fr 10px;
		height: 100vh;
		width: 100vw;
		margin: 0;
		padding: 0;
		background: #f5f5f5;
		overflow: hidden;
	}

	.editor-container {
		/* Row 1: Takes all remaining space (1fr) */
		grid-row: 1;
		/* CRITICAL: Constrain height to prevent overflow */
		min-height: 0;
		overflow: hidden;
		/* Pass constraints to child */
		display: flex;
		flex-direction: column;
	}

	.footer {
		/* Row 2: Fixed 10px height */
		grid-row: 2;
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
</style>
