#!/usr/bin/env node
/**
 * Verify WASM compression after build
 * Run this after `npm run build` to check compression ratios
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';

async function findWasmFiles(dir) {
	const files = [];

	try {
		const entries = await readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);

			if (entry.isDirectory()) {
				files.push(...await findWasmFiles(fullPath));
			} else if (entry.name.endsWith('.wasm')) {
				files.push(fullPath);
			}
		}
	} catch (error) {
		// Directory doesn't exist or can't be read
	}

	return files;
}

async function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
	console.log('🔍 Checking for WASM files in build output...\n');

	const wasmFiles = await findWasmFiles('.svelte-kit/output');

	if (wasmFiles.length === 0) {
		console.log('❌ No WASM files found. Run `npm run build` first.');
		process.exit(1);
	}

	for (const wasmPath of wasmFiles) {
		const stats = await stat(wasmPath);
		const brPath = wasmPath + '.br';
		const gzPath = wasmPath + '.gz';

		let brStats, gzStats;
		try {
			brStats = await stat(brPath);
		} catch {}
		try {
			gzStats = await stat(gzPath);
		} catch {}

		console.log(`📦 ${wasmPath.replace('.svelte-kit/output/', '')}`);
		console.log(`   Original:  ${await formatBytes(stats.size)}`);

		if (brStats) {
			const ratio = ((1 - brStats.size / stats.size) * 100).toFixed(1);
			console.log(`   Brotli:    ${await formatBytes(brStats.size)} (${ratio}% smaller) ✅`);
		} else {
			console.log(`   Brotli:    Not found ❌`);
		}

		if (gzStats) {
			const ratio = ((1 - gzStats.size / stats.size) * 100).toFixed(1);
			console.log(`   Gzip:      ${await formatBytes(gzStats.size)} (${ratio}% smaller) ✅`);
		} else {
			console.log(`   Gzip:      Not found ❌`);
		}

		console.log('');
	}

	console.log('✅ Compression verification complete!');
	console.log('\nℹ️  Note: Vercel will serve these files with automatic compression.');
	console.log('    If you migrate to another host, ensure it serves pre-compressed files.');
}

main().catch(console.error);
