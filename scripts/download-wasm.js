#!/usr/bin/env node

/**
 * Downloads CalcMark WASM binaries from GitHub releases
 * Version is controlled by calcmark-version.json in project root
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_REPO = 'CalcMark/go-calcmark';
const WASM_DIR = path.join(process.cwd(), 'src', 'lib', 'wasm');
const VERSION_LOCK_FILE = path.join(WASM_DIR, '.calcmark-version');

// Files to download with their GitHub release names and local names
const FILES = [
	{ release: 'calcmark-{version}.wasm', local: 'calcmark.wasm' },
	{ release: 'wasm_exec.js', local: 'wasm_exec.js' }
];

/**
 * Read version from calcmark-version.json
 */
function getVersion() {
	try {
		const versionPath = path.join(process.cwd(), 'calcmark-version.json');
		const config = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
		return config.version;
	} catch (error) {
		console.error('❌ Failed to read calcmark-version.json:', error);
		process.exit(1);
	}
}

/**
 * Download a file from URL to destination
 */
function downloadFile(url, dest) {
	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(dest);

		https
			.get(url, (response) => {
				if (response.statusCode === 302 || response.statusCode === 301) {
					// Follow redirect
					const redirectUrl = response.headers.location;
					if (!redirectUrl) {
						reject(new Error('Redirect without location header'));
						return;
					}
					https.get(redirectUrl, (redirectResponse) => {
						if (redirectResponse.statusCode !== 200) {
							reject(
								new Error(
									`Failed to download: ${redirectResponse.statusCode} ${redirectResponse.statusMessage}`
								)
							);
							return;
						}
						redirectResponse.pipe(file);
						file.on('finish', () => {
							file.close();
							resolve();
						});
					});
					return;
				}

				if (response.statusCode !== 200) {
					reject(
						new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`)
					);
					return;
				}

				response.pipe(file);
				file.on('finish', () => {
					file.close();
					resolve();
				});
			})
			.on('error', (err) => {
				fs.unlink(dest, () => {}); // Clean up on error
				reject(err);
			});

		file.on('error', (err) => {
			fs.unlink(dest, () => {}); // Clean up on error
			reject(err);
		});
	});
}

/**
 * Get the currently downloaded version (if any)
 */
function getDownloadedVersion() {
	try {
		if (fs.existsSync(VERSION_LOCK_FILE)) {
			return fs.readFileSync(VERSION_LOCK_FILE, 'utf-8').trim();
		}
	} catch (error) {
		// Ignore errors, treat as no version
	}
	return null;
}

/**
 * Save the downloaded version to lock file
 */
function saveDownloadedVersion(version) {
	fs.writeFileSync(VERSION_LOCK_FILE, version, 'utf-8');
}

/**
 * Check if WASM files already exist and are for the correct version
 */
function wasmFilesExist(targetVersion) {
	// Check if all files exist
	const allFilesExist = FILES.every((file) => {
		const filePath = path.join(WASM_DIR, file.local);
		if (!fs.existsSync(filePath)) return false;
		const stats = fs.statSync(filePath);
		// Check if file has reasonable size (WASM should be > 1MB)
		if (file.local.endsWith('.wasm') && stats.size < 1000000) return false;
		return true;
	});

	if (!allFilesExist) return false;

	// Check if the downloaded version matches the target version
	const downloadedVersion = getDownloadedVersion();
	return downloadedVersion === targetVersion;
}

/**
 * Clean WASM files
 */
function cleanWasmFiles() {
	console.log('🧹 Cleaning WASM files...\n');

	let filesRemoved = 0;

	// Remove WASM files
	FILES.forEach((file) => {
		const filePath = path.join(WASM_DIR, file.local);
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
			console.log(`  ✓ Removed ${file.local}`);
			filesRemoved++;
		}
	});

	// Remove version lock
	if (fs.existsSync(VERSION_LOCK_FILE)) {
		fs.unlinkSync(VERSION_LOCK_FILE);
		console.log(`  ✓ Removed .calcmark-version`);
		filesRemoved++;
	}

	if (filesRemoved === 0) {
		console.log('  No files to clean\n');
	} else {
		console.log(`\n✅ Cleaned ${filesRemoved} file(s)\n`);
	}
}

/**
 * Main download function
 */
async function main() {
	// Check for --clean flag
	if (process.argv.includes('--clean')) {
		cleanWasmFiles();
		process.exit(0);
	}

	console.log('📦 CalcMark WASM Download Script\n');

	const version = getVersion();
	const downloadedVersion = getDownloadedVersion();

	console.log(`📌 Target version: ${version}`);
	if (downloadedVersion) {
		console.log(`📦 Downloaded version: ${downloadedVersion}`);
	}

	// Check if files already exist for this version
	if (wasmFilesExist(version)) {
		console.log('✅ WASM files already exist for this version, skipping download');
		console.log(`   Current: ${downloadedVersion}`);
		console.log('   To force re-download, run: npm run wasm:clean\n');
		return;
	}

	if (downloadedVersion && downloadedVersion !== version) {
		console.log(`🔄 Version changed: ${downloadedVersion} → ${version}`);
		console.log('   Downloading new version...\n');
	}

	console.log(`📂 Output directory: ${WASM_DIR}\n`);

	// Ensure WASM directory exists
	if (!fs.existsSync(WASM_DIR)) {
		fs.mkdirSync(WASM_DIR, { recursive: true });
	}

	// Download each file
	for (const file of FILES) {
		// Strip 'v' prefix from version for filename (v0.1.23 -> 0.1.23)
		const versionNumber = version.startsWith('v') ? version.slice(1) : version;
		const releaseFileName = file.release.replace('{version}', versionNumber);
		const url = `https://github.com/${GITHUB_REPO}/releases/download/${version}/${releaseFileName}`;
		const dest = path.join(WASM_DIR, file.local);

		console.log(`⬇️  Downloading ${file.local}...`);
		console.log(`   From: ${url}`);

		try {
			await downloadFile(url, dest);
			const stats = fs.statSync(dest);
			const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
			console.log(`✅ Downloaded ${file.local} (${sizeMB} MB)\n`);
		} catch (error) {
			console.error(`❌ Failed to download ${file.local}:`, error);
			process.exit(1);
		}
	}

	// Save the downloaded version
	saveDownloadedVersion(version);

	console.log('🎉 All WASM files downloaded successfully!\n');
	console.log(`💾 Version lock saved: ${version}\n`);
}

main().catch((error) => {
	console.error('❌ Script failed:', error);
	process.exit(1);
});
