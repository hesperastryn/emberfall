// Emberfall's entry point: owns the canvas, the clock and the screen
// state machine (title, playing, level-up choice, game over), and wires
// the simulation, the renderer, the input and the sound bank together.

import { VIEW_W, VIEW_H } from './config.js';
import { makeRng } from './random.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { Particles } from './particles.js';
import { createWorld, startRun, updateWorld, beginLevelChoice, chooseUpgrade } from './world.js';
import { drawScene, cardRect } from './render.js';
import { parseShot, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const shot = parseShot(window.location.search);
const rng = makeRng(shot ? shot.seed * 7919 + 13 : (Date.now() % 2147483647) + 1);

const input = new Input(canvas);
input.attach();
const audio = new SoundBank();
const particles = new Particles(rng);
const fx = { audio, particles };
const world = createWorld(rng);

const ui = {
  screen: 'title',
  time: 0,
  hoverCard: -1,
  muted: false,
  paused: false,
  best: loadBest(),
  particles,
};

let overAt = -10; // ui.time when the run ended, against click-through

// A small handle for the maker's own playtesting tools: the live world,
// the screen state and the effects bank, readable from the console.
window.__emberfall = { world, ui, fx };

function loadBest() {
  try {
    return Number(window.localStorage.getItem('emberfall-best') || 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest() {
  ui.best = Math.max(ui.best, Math.floor(world.score));
  try {
    window.localStorage.setItem('emberfall-best', String(ui.best));
  } catch {
    // A private window forgets; the run still counts.
  }
}

function beginRun() {
  audio.unlock();
  startRun(world);
  ui.screen = 'playing';
  ui.paused = false;
  audio.click();
}

function cardAt(x, y) {
  for (let i = 0; i < 3; i++) {
    const r = cardRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

function pickCard(index) {
  // chooseUpgrade applies the gift and re-rolls while levels remain.
  const left = chooseUpgrade(world, index, fx);
  if (left <= 0) ui.screen = 'playing';
}

function handleClick() {
  audio.unlock();
  if (ui.screen === 'title') {
    beginRun();
  } else if (ui.screen === 'levelup') {
    const index = cardAt(input.mouseX, input.mouseY);
    if (index >= 0) pickCard(index);
  } else if (ui.screen === 'gameover') {
    if (ui.time - overAt > 0.7) beginRun();
  }
}

function handleKeys() {
  if (input.pressed('KeyM') && !handleKeys.mWas) {
    ui.muted = audio.toggleMute();
  }
  handleKeys.mWas = input.pressed('KeyM');

  if (ui.screen === 'title' && (input.pressed('Enter') || input.pressed('Space'))) beginRun();
  else if (ui.screen === 'gameover' && input.pressed('KeyR') && ui.time - overAt > 0.4) beginRun();
  else if (ui.screen === 'levelup') {
    if (input.pressed('Digit1')) pickCard(0);
    else if (input.pressed('Digit2')) pickCard(1);
    else if (input.pressed('Digit3')) pickCard(2);
  } else if (ui.screen === 'playing' && input.pressed('KeyP') && !handleKeys.pWas) {
    ui.paused = !ui.paused;
  }
  handleKeys.pWas = input.pressed('KeyP');
}
handleKeys.mWas = false;
handleKeys.pWas = false;

function step(dt) {
  ui.time += dt;
  if (input.clicked) handleClick();
  handleKeys();

  if (ui.screen === 'title') {
    // Ambient embers rise off the Hearth while the title waits.
    if (rng.chance(0.3)) particles.trail(VIEW_W / 2 + rng.range(-16, 16), 430, '#ffb347');
    particles.update(dt);
  } else if (ui.screen === 'playing') {
    if (!ui.paused) {
      updateWorld(world, input, dt, fx);
      particles.update(dt);
      if (world.phase === 'over') {
        ui.screen = 'gameover';
        overAt = ui.time;
        saveBest();
      } else if (world.pendingLevels > 0) {
        if (!world.choices) beginLevelChoice(world);
        ui.screen = 'levelup';
      }
    }
  } else if (ui.screen === 'levelup') {
    ui.hoverCard = cardAt(input.mouseX, input.mouseY);
    particles.update(dt);
  } else if (ui.screen === 'gameover') {
    particles.update(dt);
  }
  input.endFrame();
}

function frame() {
  drawScene(ctx, world, ui);
  if (ui.paused && ui.screen === 'playing') {
    ctx.fillStyle = 'rgba(5, 6, 16, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.font = '700 40px Georgia, serif';
    ctx.fillStyle = '#f2ead8';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2);
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Press P to return to the fight', VIEW_W / 2, VIEW_H / 2 + 34);
  }
}

// Screenshot mode: stage one deterministic scene, draw it, and stop.
if (shot) {
  const staged = stageShot(world, fx, shot);
  ui.screen = staged.screen;
  ui.hoverCard = staged.hoverCard;
  ui.time = 1.7;
  if (staged.screen === 'gameover') ui.best = Math.floor(world.score);
  frame();
  window.__emberfallShotReady = true;
} else {
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.033, Math.max(0.0001, (now - last) / 1000));
    last = now;
    step(dt);
    frame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
