// Entry for `node --test test/`. Node 22 resolves the folder to this file.
// It imports every *.test.mjs / *.test.js file in this folder. Each import registers its tests with node:test.
import { readdirSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
for (const f of readdirSync(dir).filter((x) => /\.test\.m?js$/.test(x)).sort()) await import(new URL(f, dir));
