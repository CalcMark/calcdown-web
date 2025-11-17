<script lang="ts">
	import TestFixtureLayout from '$lib/components/TestFixtureLayout.svelte';
</script>

<svelte:head>
	<title>Empty Editor Test Fixture</title>
</svelte:head>

<TestFixtureLayout
	title="Empty Editor"
	description="Blank starting state for testing user interaction, typing, and cursor behavior"
	initialText=""
/>
