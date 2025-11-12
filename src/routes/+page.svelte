<script>
	import InlineCalcMarkEditor from '$lib/components/InlineCalcMarkEditor.svelte';
</script>

<div class="app">
	<InlineCalcMarkEditor />
</div>

<style>
	.app {
		min-height: 100vh;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		background: #f5f5f5;
	}
</style>
