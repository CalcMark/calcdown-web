<script lang="ts">
	import TestFixtureLayout from '$lib/components/TestFixtureLayout.svelte';

	// Generate a document long enough to force scrolling in typical viewports
	const SCROLLING_DOC = `# Long Document for Scroll Testing

## Section 1: Introduction
This document is intentionally long to test scrolling behavior.
The editor should handle scroll positions correctly.

## Section 2: Calculations Start
base_value = 100
multiplier = 1.5
result_1 = base_value * multiplier

## Section 3: More Data
price_per_unit = $45
quantity = 12
subtotal = price_per_unit * quantity

## Section 4: Tax Calculations
tax_rate = 0.08
tax_amount = subtotal * tax_rate
total_with_tax = subtotal + tax_amount

## Section 5: Shipping
shipping_base = $10
shipping_weight = 5
shipping_cost = shipping_base + (shipping_weight * $2)

## Section 6: Final Totals
grand_total = total_with_tax + shipping_cost

## Section 7: Discounts
discount_rate = 0.15
discount_amount = grand_total * discount_rate
final_price = grand_total - discount_amount

## Section 8: Additional Items
item_a = $25
item_b = $30
item_c = $15
items_total = item_a + item_b + item_c

## Section 9: Combined Total
everything_total = final_price + items_total

## Section 10: Percentages
percentage_saved = discount_amount / grand_total

## Section 11: More Calculations
monthly_payment = everything_total / 12
weekly_payment = everything_total / 52

## Section 12: Yearly Projections
yearly_total = everything_total * 12
five_year_total = yearly_total * 5

## Section 13: Unit Economics
cost_per_item = everything_total / 20
profit_margin = 0.25
selling_price = cost_per_item / (1 - profit_margin)

## Section 14: Volume Discounts
bulk_quantity = 100
bulk_discount = 0.20
bulk_unit_price = selling_price * (1 - bulk_discount)
bulk_revenue = bulk_unit_price * bulk_quantity

## Section 15: End of Document
This is the end of the scrolling test document.
Total lines should exceed typical viewport height.`;
</script>

<svelte:head>
	<title>Scrolling Test Fixture</title>
</svelte:head>

<TestFixtureLayout
	title="Scrolling Test"
	description="Long document that forces viewport scrolling for cursor and scroll position tests"
	initialText={SCROLLING_DOC}
/>
