<script lang="ts">
	import TestFixtureLayout from '$lib/components/TestFixtureLayout.svelte';

	const BUDGET_DOC = `# Budget Calculator

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

<svelte:head>
	<title>Budget Calculator Test Fixture</title>
</svelte:head>

<TestFixtureLayout
	title="Budget Calculator"
	description="Standard test document with markdown headings, currency calculations, and gutter results"
	initialText={BUDGET_DOC}
/>
