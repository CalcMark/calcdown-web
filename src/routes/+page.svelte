<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';

	async function startEditing() {
		await invalidateAll();
		// Simple navigation to /edit - no data loading needed, disable resolve warning
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto('/edit');
	}
</script>

<svelte:head>
	<title>CalcDown - Calculations Meet Markdown</title>
</svelte:head>

<div class="landing-page">
	<header class="hero">
		<div class="hero-content">
			<h1>CalcDown</h1>
			<p class="tagline">Where calculations meet markdown</p>
			<p class="description">
				A powerful editor that seamlessly blends calculations with markdown formatting. Write
				documents, perform calculations, and see results in real-time.
			</p>
			<div class="cta-buttons">
				<button class="primary-button" onclick={startEditing}>Start Editing</button>
				<a href="https://github.com/CalcMark/go-calcmark" class="secondary-button" target="_blank"
					>Learn More</a
				>
			</div>
		</div>
	</header>

	<section class="features">
		<div class="feature-grid">
			<div class="feature">
				<div class="feature-icon">📝</div>
				<h3>Markdown Support</h3>
				<p>Full markdown formatting with headings, lists, links, and more</p>
			</div>
			<div class="feature">
				<div class="feature-icon">🧮</div>
				<h3>Live Calculations</h3>
				<p>See calculation results instantly as you type</p>
			</div>
			<div class="feature">
				<div class="feature-icon">🌍</div>
				<h3>Unicode Variables</h3>
				<p>Use emoji and international characters as variable names</p>
			</div>
			<div class="feature">
				<div class="feature-icon">💰</div>
				<h3>Multi-Currency</h3>
				<p>Support for $, €, £, ¥ and ISO currency codes</p>
			</div>
		</div>
	</section>

	<footer class="landing-footer">
		<p>Built with <a href="https://kit.svelte.dev" target="_blank">SvelteKit</a></p>
		<p>
			Powered by <a href="https://github.com/CalcMark/go-calcmark" target="_blank">CalcMark</a>
		</p>
	</footer>
</div>

<style>
	.landing-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(to bottom, #f8fafc 0%, #e0f2fe 100%);
	}

	.hero {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.hero-content {
		max-width: 48rem;
	}

	h1 {
		font-size: 4rem;
		font-weight: 700;
		color: #0ea5e9;
		margin: 0 0 1rem 0;
		letter-spacing: -0.025em;
	}

	.tagline {
		font-size: 1.5rem;
		color: #475569;
		margin: 0 0 2rem 0;
		font-weight: 500;
	}

	.description {
		font-size: 1.125rem;
		color: #64748b;
		line-height: 1.75;
		margin: 0 0 3rem 0;
	}

	.cta-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.primary-button,
	.secondary-button {
		padding: 1rem 2rem;
		border-radius: 0.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s;
		cursor: pointer;
		border: none;
		display: inline-block;
	}

	.primary-button {
		background: #0ea5e9;
		color: white;
	}

	.primary-button:hover {
		background: #0284c7;
		transform: translateY(-2px);
		box-shadow: 0 10px 20px rgba(14, 165, 233, 0.3);
	}

	.secondary-button {
		background: white;
		color: #0ea5e9;
		border: 2px solid #0ea5e9;
	}

	.secondary-button:hover {
		background: #f0f9ff;
		transform: translateY(-2px);
		box-shadow: 0 10px 20px rgba(14, 165, 233, 0.2);
	}

	.features {
		padding: 4rem 2rem;
		background: white;
	}

	.feature-grid {
		max-width: 64rem;
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 2rem;
	}

	.feature {
		text-align: center;
		padding: 2rem;
		border-radius: 0.5rem;
		transition: transform 0.2s;
	}

	.feature:hover {
		transform: translateY(-4px);
	}

	.feature-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.feature h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0 0 0.5rem 0;
	}

	.feature p {
		color: #64748b;
		line-height: 1.5;
		margin: 0;
	}

	.landing-footer {
		padding: 2rem;
		text-align: center;
		color: #64748b;
		font-size: 0.875rem;
		background: white;
		border-top: 1px solid #e2e8f0;
	}

	.landing-footer p {
		margin: 0.25rem 0;
	}

	.landing-footer a {
		color: #0ea5e9;
		text-decoration: none;
		font-weight: 500;
	}

	.landing-footer a:hover {
		text-decoration: underline;
	}

	@media (max-width: 48rem) {
		h1 {
			font-size: 2.5rem;
		}

		.tagline {
			font-size: 1.25rem;
		}

		.description {
			font-size: 1rem;
		}

		.hero {
			padding: 2rem 1rem;
		}

		.features {
			padding: 2rem 1rem;
		}

		.feature-grid {
			grid-template-columns: 1fr;
		}
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
	}
</style>
