import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render editor heading', async () => {
		render(Page);

		// The new inline editor has an H1 with "CalcMark Editor (MVP)"
		const heading = page.getByRole('heading', { name: /CalcMark Editor/i });
		await expect.element(heading).toBeInTheDocument();
	});
});
