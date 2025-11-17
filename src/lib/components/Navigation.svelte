<script lang="ts">
	import { page } from '$app/stores';
</script>

<nav class="nav">
	<div class="nav-container">
		<div class="nav-left">
			<a href="/" class="nav-logo" aria-label="Home">CalcDown</a>
		</div>

		<div class="nav-center">
			<a href="/edit" class="nav-link" class:active={$page.url.pathname === '/edit'}>New</a>
		</div>

		<div class="nav-right">
			<!-- Placeholder for future auth buttons -->
		</div>
	</div>
</nav>

<style>
	.nav {
		/* CSS Variables - customize these to change the entire nav appearance */
		--nav-height: 3rem;
		--nav-bg: #ffffff;
		--nav-border: #e5e7eb;
		--nav-padding-x: 1.5rem;
		--nav-gap: 2rem;

		/* Logo styling */
		--logo-font-size: 1.125rem;
		--logo-font-weight: 600;
		--logo-color: #1e293b;
		--logo-hover-color: #0f172a;

		/* Link styling */
		--link-font-size: 0.875rem;
		--link-font-weight: 500;
		--link-color: #64748b;
		--link-hover-color: #1e293b;
		--link-active-color: #0f172a;
		--link-active-bg: #f1f5f9;
		--link-padding-x: 0.75rem;
		--link-padding-y: 0.5rem;
		--link-border-radius: 0.375rem;

		/* Layout */
		height: var(--nav-height);
		background: var(--nav-bg);
		border-bottom: 1px solid var(--nav-border);
		position: sticky;
		top: 0;
		z-index: 1000;
	}

	.nav-container {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		height: 100%;
		max-width: 100%;
		padding: 0 var(--nav-padding-x);
		gap: var(--nav-gap);
	}

	.nav-left {
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}

	.nav-center {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.nav-logo {
		font-size: var(--logo-font-size);
		font-weight: var(--logo-font-weight);
		color: var(--logo-color);
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.nav-logo:hover {
		color: var(--logo-hover-color);
	}

	.nav-link {
		font-size: var(--link-font-size);
		font-weight: var(--link-font-weight);
		color: var(--link-color);
		text-decoration: none;
		padding: var(--link-padding-y) var(--link-padding-x);
		border-radius: var(--link-border-radius);
		transition: all 0.15s ease;
	}

	.nav-link:hover {
		color: var(--link-hover-color);
		background: var(--link-active-bg);
	}

	.nav-link.active {
		color: var(--link-active-color);
		background: var(--link-active-bg);
	}
</style>
