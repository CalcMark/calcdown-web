<script lang="ts">
	import { onMount } from 'svelte';

	const SAMPLE_DOC = `# Test
price = $100
tax = 10%`;

	type Block = { id: string; type: string; content: string };

	let blocks = $state<Block[]>([
		{ id: 'initial', type: 'markdown', content: SAMPLE_DOC }
	]);

	onMount(async () => {
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 100));

		// Update blocks
		blocks = [
			{ id: 'b1', type: 'markdown', content: '# Test' },
			{ id: 'b2', type: 'calculation', content: 'price = $100' },
			{ id: 'b3', type: 'calculation', content: 'tax = 10%' }
		];

		console.log('[Simple] Updated blocks:', blocks.length);
	});
</script>

<h1>Simple Editor ({blocks.length} blocks)</h1>

<div class="editor-content">
	{#each blocks as block (block.id)}
		<div class="block {block.type}">
			{block.content}
		</div>
	{/each}
</div>

<style>
	.block {
		padding: 8px;
		margin: 4px 0;
	}
	.markdown {
		background: #f5f5f5;
	}
	.calculation {
		background: #e0f2fe;
	}
</style>
