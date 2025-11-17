import { paraglideVitePlugin } from '@inlang/paraglide-js';
import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
	plugins: [
		sveltekit(),
		devtoolsJson(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		}),
		// Brotli compression for WASM files (better compression)
		compression({
			algorithm: 'brotliCompress',
			include: /\.(wasm)$/,
			threshold: 1024,
			deleteOriginalAssets: false
		}),
		// Gzip compression for WASM files (broader compatibility)
		compression({
			algorithm: 'gzip',
			include: /\.(wasm)$/,
			threshold: 1024,
			deleteOriginalAssets: false
		})
	],
	assetsInclude: ['**/*.wasm'],
	// Ensure WASM files are treated as external assets in SSR
	ssr: {
		noExternal: []
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
