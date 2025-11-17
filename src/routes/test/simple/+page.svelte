<script lang="ts">
	import TestFixtureLayout from '$lib/components/TestFixtureLayout.svelte';

	const SIMPLE_DOC = `x = 5
y = 10
total = x + y`;
</script>

<svelte:head>
	<title>Simple Calculation Test Fixture</title>
</svelte:head>

<TestFixtureLayout
	title="Simple Calculation"
	description="Minimal 3-line calculation for precision testing of cursor, gutter, and line alignment"
	initialText={SIMPLE_DOC}
/>
