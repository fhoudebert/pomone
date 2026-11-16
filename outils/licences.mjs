#!/usr/bin/env node
// Contrôle des licences des dépendances distribuées (npm hors développement, crates Rust).
// Échoue si une licence sort de la liste admise : npm run licences
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Licences permissives, plus MPL-2.0 (copyleft limité au fichier, apporté par le moteur CSS de Tauri).
const ADMISES = new Set(['MIT', 'MIT-0', 'Apache-2.0', 'Apache-2.0 WITH LLVM-exception', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD',
  'Zlib', 'Unicode-3.0', 'Unicode-DFS-2016', 'CC0-1.0', 'Unlicense', 'BSL-1.0', 'MPL-2.0', 'CDLA-Permissive-2.0']);

/** Expression SPDX simple : « A OR B » admise si l'une l'est, « A AND B » si toutes le sont. */
function admise(expr) {
  const e = String(expr ?? '').replace(/[()]/g, ' ').replace(/\//g, ' OR ').trim();
  if (!e) return false;
  return e.split(/\s+OR\s+/i).some((ou) => ou.split(/\s+AND\s+/i).every((l) => ADMISES.has(l.trim())));
}

const refus = [];
let total = 0;

const arbre = JSON.parse(execFileSync('npm', ['ls', '--omit=dev', '--all', '--json'], { encoding: 'utf8', maxBuffer: 1 << 26, shell: process.platform === 'win32' }));
const vus = new Set();
(function parcourir(deps, chemin) {
  for (const [nom, d] of Object.entries(deps ?? {})) {
    if (!vus.has(`${nom}@${d.version}`)) {
      vus.add(`${nom}@${d.version}`);
      let licence = '';
      try { licence = JSON.parse(readFileSync(`node_modules/${nom}/package.json`, 'utf8')).license; } catch { /* dépendance facultative absente */ continue; }
      total++;
      if (!admise(licence)) refus.push(`npm   ${nom}@${d.version} : ${licence || 'licence absente'}`);
    }
    parcourir(d.dependencies, `${chemin}/${nom}`);
  }
})(arbre.dependencies, '');

if (!process.argv.includes('--sans-rust')) {
  const meta = JSON.parse(execFileSync('cargo', ['metadata', '--format-version', '1', '--locked', '--manifest-path', 'src-tauri/Cargo.toml'], { encoding: 'utf8', maxBuffer: 1 << 28 }));
  for (const p of meta.packages) {
    if (p.source === null) continue; // Pomone lui-même
    total++;
    if (!admise(p.license)) refus.push(`crate ${p.name}@${p.version} : ${p.license || 'licence absente'}`);
  }
}

if (refus.length) {
  console.error(`${refus.length} dépendance(s) hors liste admise :\n${refus.join('\n')}`);
  process.exit(1);
}
console.log(`${total} dépendances contrôlées, toutes sous licence admise.`);
