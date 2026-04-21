#!/usr/bin/env bun
// Build script: produces a self-contained binary + client/ assets
// Usage: bun run build-binary.mjs [outfile]
//
// The binary reads STATIC_DIR env var (falls back to dir containing the binary).
// In Nix, STATIC_DIR is set by makeWrapper to the store path of the client/ dir.

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const repoRoot = new URL('./', import.meta.url).pathname;
const handlerPath = path.join(repoRoot, 'build/handler.js');
const outfile = process.argv[2] ?? path.join(repoRoot, 'kanidm-manager');

// 1. Build SvelteKit app
console.log('Building SvelteKit app...');
execSync('bun run build', { cwd: repoRoot, stdio: 'inherit' });

// 2. Patch handler.js to support STATIC_DIR env var for asset path override
const handler = readFileSync(handlerPath, 'utf8');
const patched = handler.replace(
	/const dir = path\.dirname\(fileURLToPath\(import\.meta\.url\)\);/,
	'const dir = process.env.STATIC_DIR || path.dirname(fileURLToPath(import.meta.url));'
);
if (patched === handler) {
	// Already patched or changed upstream — check for our marker
	if (!handler.includes('STATIC_DIR')) {
		console.error('ERROR: Could not patch handler.js — pattern not found');
		process.exit(1);
	}
	console.log('handler.js already patched, skipping');
} else {
	writeFileSync(handlerPath, patched);
	console.log('Patched handler.js to support STATIC_DIR');
}

// 3. Compile binary
console.log(`Compiling binary → ${outfile}`);
execSync(`bun build ./build/index.js --compile --outfile ${outfile}`, {
	cwd: repoRoot,
	stdio: 'inherit'
});

console.log(`\nDone! Binary: ${outfile}`);
console.log(`Run with: STATIC_DIR=./build KANIDM_BASE_URL=https://... ORIGIN=https://... PORT=3000 ${outfile}`);
