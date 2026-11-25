// Minimal syntax check for every .js/.jsx file under src/ — parses each one
// with Babel (JSX + modern JS syntax) and fails loudly on any parse error.
// Not a full ESLint setup, just a fast guard against typos/unbalanced JSX
// before shipping.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@babel/parser";

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.jsx?$/.test(entry.name) ? [path] : [];
  });
}

const files = sourceFiles("src").sort();
let failed = false;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  try {
    parse(source, {
      sourceType: "module",
      plugins: ["jsx"],
    });
  } catch (e) {
    console.error(`Parse error in ${file}: ${e.message}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`OK: JSX parses (${files.length} files)`);
