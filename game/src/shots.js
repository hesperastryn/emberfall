// Screenshot scenes. The maker captures the game's own frames from a
// browser; a `?shot=<name>&seed=<n>` address stages one deterministic
// scene with the game's real simulation — a short scripted run for the
// action shots — and the main loop renders it without advancing time.
// Nothing here edits an image: every pixel is the game drawing itself.

import { startRun, updateWorld, beginLevelChoice, chooseUpgrade } from './world.js';

export function parseShot(search) {
  const params = new URLSearchParams(search);
  const name = params.get('shot');
  if (!name) return null;
  const seed = Number(params.get('seed') || '7');
  return { name, seed: Number.isFinite(seed) ? seed : 7 };
}

// A fake input that plays the game on rails: it strafes in a slow
// circle, aims at the nearest Gloom and keeps the trigger held.
function scriptedInput(world, step) {
  const angle = step * 0.011;
  let aimX = world.player.x + Math.cos(angle * 2.3) * 220;
  let aimY = world.player.y + Math.sin(angle * 2.3) * 220;
  let nearest = null;
  let best = Infinity;
  for (const e of world.enemies) {
    const d = (e.x - world.player.x) ** 2 + (e.y - world.player.y) ** 2;
    if (d < best) { best = d; nearest = e; }
  }
  if (nearest) {
    aimX = nearest.x;
    aimY = nearest.y;
  }
  return {
    mouseX: aimX,
    mouseY: aimY,
    mouseDown: true,
    moveVector: () => ({ x: Math.cos(angle), y: Math.sin(angle) * 0.8 }),
    pressed: () => false,
  };
}

// Run the real simulation for `seconds` of game time, spending any
// level-up on the first gift so the run never stalls on the choice.
function simulate(world, fx, seconds) {
  const dt = 1 / 60;
  const steps = Math.floor(seconds / dt);
  for (let s = 0; s < steps; s++) {
    if (world.phase !== 'playing') break;
    updateWorld(world, scriptedInput(world, s), dt, fx);
    if (world.pendingLevels > 0) {
      beginLevelChoice(world);
      chooseUpgrade(world, 0, fx);
    }
  }
}

// The final beat of the action scene: the Warden plants his feet and
// fires while the horde closes in — bolts, sparks and Glooms together.
function standAndFight(world, fx, seconds) {
  const dt = 1 / 60;
  const steps = Math.floor(seconds / dt);
  for (let s = 0; s < steps; s++) {
    if (world.phase !== 'playing') break;
    let aimX = world.player.x + 200;
    let aimY = world.player.y;
    let nearest = null;
    let best = Infinity;
    for (const e of world.enemies) {
      const d = (e.x - world.player.x) ** 2 + (e.y - world.player.y) ** 2;
      if (d < best) { best = d; nearest = e; }
    }
    if (nearest) {
      aimX = nearest.x;
      aimY = nearest.y;
    }
    updateWorld(world, {
      mouseX: aimX,
      mouseY: aimY,
      mouseDown: true,
      moveVector: () => ({ x: 0, y: 0 }),
      pressed: () => false,
    }, dt, fx);
    if (world.pendingLevels > 0) {
      beginLevelChoice(world);
      chooseUpgrade(world, 0, fx);
    }
  }
}

export function stageShot(world, fx, shot) {
  if (shot.name === 'title') {
    return { screen: 'title', hoverCard: -1 };
  }
  startRun(world);
  if (shot.name === 'play') {
    simulate(world, fx, 20);
    standAndFight(world, fx, 2.2);
    if (world.phase !== 'playing') {
      world.phase = 'playing';
      world.player.hp = 72;
    }
    world.banner = null;
    // A few unclaimed sparks near the Warden read as treasure mid-fight.
    for (let i = 0; i < 5; i++) {
      world.sparks.push({
        x: world.player.x + 60 + i * 22,
        y: world.player.y + 44 - (i % 2) * 18,
        vx: 0, vy: 0, t: i * 1.3,
      });
    }
    return { screen: 'playing', hoverCard: -1 };
  }
  if (shot.name === 'levelup') {
    simulate(world, fx, 15);
    if (world.phase !== 'playing') {
      world.phase = 'playing';
      world.player.hp = 58;
    }
    if (world.pendingLevels === 0) {
      world.player.level += 1;
      world.pendingLevels = 1;
    }
    world.choices = beginLevelChoice(world);
    world.banner = null;
    return { screen: 'levelup', hoverCard: 1 };
  }
  // 'end': a long run played to its fall — every number on the results
  // screen is the simulation's own; only the last blow is finished by
  // hand if the scripted Warden is still standing.
  simulate(world, fx, 50);
  if (world.phase === 'playing') {
    world.player.hp = 0;
    world.phase = 'over';
  }
  fx.particles.burst(world.player.x, world.player.y, '#ffb347', 40, 300, 0.9, 4);
  fx.particles.ring(world.player.x, world.player.y, '#ffb347');
  return { screen: 'gameover', hoverCard: -1 };
}
