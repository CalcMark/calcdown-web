<script lang="ts">
	import TestFixtureLayout from '$lib/components/TestFixtureLayout.svelte';

	const DEPENDENCIES_DOC = `# Dependent Calculations

## Base Values
a = 10
b = 20

## First Level
c = a + b
d = a * 2

## Second Level
e = c + d
f = c * d

## Third Level
total = e + f

> Each variable depends on previous calculations`;
</script>

<svelte:head>
	<title>Dependent Calculations Test Fixture</title>
</svelte:head>

<TestFixtureLayout
	title="Dependent Calculations"
	description="Tests chained variable dependencies and evaluation order"
	initialText={DEPENDENCIES_DOC}
/>
