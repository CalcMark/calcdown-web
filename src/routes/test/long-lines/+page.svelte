<script lang="ts">
	import TestFixtureLayout from '$lib/components/TestFixtureLayout.svelte';

	const LONG_LINES_DOC = `# Text Wrapping Test

very_long_variable_name_that_will_cause_wrapping_in_narrow_viewports = 12345

## Long Calculation
price_per_unit = $150
quantity_ordered = 42
shipping_cost = $25
tax_rate = 0.08
subtotal = price_per_unit * quantity_ordered
tax_amount = subtotal * tax_rate
total_with_shipping_and_tax = subtotal + shipping_cost + tax_amount

This is a very long line of markdown text that will definitely wrap when the viewport becomes narrow, allowing us to test how the editor handles text wrapping and cursor positioning in wrapped content.`;
</script>

<svelte:head>
	<title>Long Lines Test Fixture</title>
</svelte:head>

<TestFixtureLayout
	title="Long Lines & Text Wrapping"
	description="Tests word wrap, line alignment, and cursor positioning with long lines"
	initialText={LONG_LINES_DOC}
/>
