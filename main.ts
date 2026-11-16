// Emberfall's hand-in program (Node 22, standard library only).
//
// The game itself is the plain static site in game/ — index.html and its
// ES modules, no build step, nothing fetched. This program copies game/
// and screenshots/ into the output directory and writes dossier.json
// there with the vendored make.fun library, byte for byte the way the
// scorer builds it, under the gate's own caps. It runs twice in the
// grader and must write the same bytes both times, so it uses no clock,
// no randomness and no environment but the one output override below.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html is missing: the game must live in game/');
}

mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the scorer's (its gate reference): at most 4 screenshots
// of 256 KiB, at most 993 files and 48 MiB under game/, paths of at most
// 1000 bytes, and 160 KiB of source text in the dossier.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(
  `emberfall: handed in ${countFiles(join(outputDir, 'game'))} game files, ` +
    `${countFiles(join(outputDir, 'screenshots'))} screenshots, dossier ${dossier.length} bytes ` +
    `-> ${outputDir}`,
);
