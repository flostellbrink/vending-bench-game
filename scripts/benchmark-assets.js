import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { glassMap } from './glass-map.js';
import { resolve } from 'node:path';

const releases = JSON.parse(readFileSync('releases.json'));
mkdirSync('public', { recursive: true });
writeFileSync('public/glass-map.png',glassMap());
mkdirSync('public/python', { recursive: true });
for (const file of ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm',
  'pyodide-lock.json', 'python_stdlib.zip']) {
  cpSync('node_modules/pyodide/' + file, 'public/python/' + file);
}
cpSync('releases.json', 'public/releases.json');
for (const release of releases) {
  const prefix = release.revision + ':' + release.engine;
  execFileSync('git', ['-C', 'vendor/vending-bench', 'archive', '--format=zip',
    '--output', resolve('public', release.id + '.zip'), prefix, 'vending']);
}
for (const name of ['NOTICE', 'LICENSE']) {
  cpSync('vendor/vending-bench/' + name, 'public/' + name);
}
