<script lang="ts">
	import Editor from './Editor.svelte';

	interface Props {
		title: string;
		description?: string;
		initialText: string;
	}

	let { title, description, initialText }: Props = $props();
</script>

<div class="test-fixture">
	<div class="fixture-header">
		<h1>{title}</h1>
		{#if description}
			<p class="description">{description}</p>
		{/if}
		<a href="/test" class="back-link">← Back to Test Index</a>
	</div>

	<div class="editor-wrapper">
		<Editor {initialText} />
	</div>
</div>

<style>
	/* Reset for consistent testing */
	:global(body) {
		margin: 0;
		padding: 0;
	}

	.test-fixture {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100vh;
		width: 100vw;
		overflow: hidden;
	}

	.fixture-header {
		grid-row: 1;
		padding: 0.75rem 1.5rem;
		background: #fffbeb;
		border-bottom: 2px solid #fbbf24;
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	h1 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #92400e;
	}

	.description {
		margin: 0;
		font-size: 0.875rem;
		color: #78350f;
		flex: 1;
		min-width: 200px;
	}

	.back-link {
		font-size: 0.875rem;
		color: #92400e;
		text-decoration: none;
		white-space: nowrap;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.editor-wrapper {
		grid-row: 2;
		min-height: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
</style>
