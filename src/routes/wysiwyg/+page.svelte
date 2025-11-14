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
	<div class="header">
		<h1>CalcMark WYSIWYG Editor</h1>
		<p>Textarea + overlay architecture (server-side processing)</p>
	</div>

	<WysiwygCalcMarkEditor initialText={SAMPLE_DOCUMENT} />
</div>

<style>
	.page {
		min-height: 100vh;
		background: #f5f5f5;
	}

	.header {
		padding: 20px;
		background: white;
		border-bottom: 1px solid #e5e7eb;
		text-align: center;
	}

	h1 {
		margin: 0 0 8px 0;
		font-size: 24px;
		font-weight: 600;
		color: #1e293b;
	}

	p {
		margin: 0;
		font-size: 14px;
		color: #64748b;
	}
</style>
