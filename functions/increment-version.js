#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the public/version.json (relative to this script in functions/)
const versionFile = path.join(__dirname, '..', 'public', 'version.json');

function readVersion(file) {
  if (!fs.existsSync(file)) return { version: '0.0.0' };
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read or parse version file:', err.message);
    return { version: '0.0.0' };
  }
}

function writeVersion(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function bumpPatch(v) {
  const parts = String(v).split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] = parts[2] + 1;
  return parts.join('.');
}

function main() {
  try {
    const current = readVersion(versionFile);
    const old = current.version || '0.0.0';
    const next = bumpPatch(old);
    const out = { ...current, version: next };
    // Ensure directory exists
    const dir = path.dirname(versionFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    writeVersion(versionFile, out);
    console.log(`Version bumped: ${old} -> ${next}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to bump version:', err);
    process.exit(2);
  }
}

main();
