import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

export function findLikeC4Bin() {
  const local = join(root, 'node_modules', 'likec4', 'bin', 'likec4.mjs');
  if (existsSync(local)) return local;

  const npxRoot = join(homedir(), '.npm', '_npx');
  if (existsSync(npxRoot)) {
    const candidates = readdirSync(npxRoot)
      .map(dir => join(npxRoot, dir, 'node_modules', 'likec4', 'bin', 'likec4.mjs'))
      .filter(existsSync)
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    if (candidates[0]) return candidates[0];
  }

  return null;
}

export function runLikeC4(args, options = {}) {
  const bin = findLikeC4Bin();
  const command = bin ? process.execPath : 'npx';
  const commandArgs = bin ? [bin, ...args] : ['--yes', 'likec4', ...args];
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: root,
      stdio: 'inherit',
      shell: false,
      ...options
    });
    child.on('exit', code => {
      code === 0 ? resolvePromise() : reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runLikeC4(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
