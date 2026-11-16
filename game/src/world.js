// The simulation: player, Glooms, bolts, sparks and waves, advanced in
// fixed steps by the main loop. It owns no drawing and no sound of its
// own; it reports moments worth celebrating through the fx object the
// main loop hands it ({ audio, particles }), and the renderer reads the
// state it leaves behind.

import {
  ARENA, PLAYER, ENEMIES, WAVE_SECONDS,
  xpForLevel, spawnInterval, enemyHpScale, unlockedKinds,
} from './config.js';
import { rollChoices } from './upgrades.js';

const MAX_ENEMIES = 130;

export function createWorld(rng) {
  return {
    rng,
    phase: 'ready', // ready | playing | over
    time: 0,
    wave: 1,
    waveTime: 0,
    spawnTimer: 0.6,
    score: 0,
    kills: 0,
    sparksCollected: 0,
    player: null,
    stats: null,
    owned: new Map(),
    enemies: [],
    projectiles: [],
    sparks: [],
    pendingLevels: 0,
    choices: null,
    banner: null,
    shake: 0,
    wispAngle: 0,
    wispPositions: [],
  };
}

export function startRun(world) {
  const rng = world.rng;
  world.phase = 'playing';
  world.time = 0;
  world.wave = 1;
  world.waveTime = 0;
  world.spawnTimer = 0.9;
  world.score = 0;
  world.kills = 0;
  world.sparksCollected = 0;
  world.enemies.length = 0;
  world.projectiles.length = 0;
  world.sparks.length = 0;
  world.pendingLevels = 0;
  world.choices = null;
  world.shake = 0;
  world.wispAngle = 0;
  world.wispPositions = [];
  world.owned = new Map();
  world.stats = {
    damage: PLAYER.baseDamage,
    fireRate: PLAYER.baseFireRate,
    moveSpeed: PLAYER.baseSpeed,
    projectiles: 1,
    pierce: 0,
    magnet: 74,
    maxHp: PLAYER.baseHp,
    wisps: 0,
    regen: 0,
  };
  world.player = {
    x: ARENA.x + ARENA.w / 2,
    y: ARENA.y + ARENA.h / 2,
    hp: PLAYER.baseHp,
    level: 1,
    xp: 0,
    xpNeed: xpForLevel(1),
    fireCooldown: 0,
    invuln: 0,
    aimX: 1,
    aimY: 0,
    moving: false,
  };
  world.banner = { title: 'WAVE 1', sub: 'The Glooms are coming. Hold the Hearth.', t: 2.4 };
  rng.next(); // keep the stream warm; scenes stay reproducible
}

// --- spawning ---------------------------------------------------------------

function spawnPoint(rng) {
  const side = rng.int(0, 3);
  const m = 26;
  if (side === 0) return { x: rng.range(ARENA.x + m, ARENA.x + ARENA.w - m), y: ARENA.y + m };
  if (side === 1) return { x: rng.range(ARENA.x + m, ARENA.x + ARENA.w - m), y: ARENA.y + ARENA.h - m };
  if (side === 2) return { x: ARENA.x + m, y: rng.range(ARENA.y + m, ARENA.y + ARENA.h - m) };
  return { x: ARENA.x + ARENA.w - m, y: rng.range(ARENA.y + m, ARENA.y + ARENA.h - m) };
}

function spawnEnemy(world, kind, x, y) {
  const base = ENEMIES[kind];
  const hp = Math.max(1, Math.round(base.hp * enemyHpScale(world.wave)));
  world.enemies.push({
    kind,
    x, y,
    hp, maxHp: hp,
    radius: base.radius,
    speed: base.speed * world.rng.range(0.88, 1.12),
    touch: base.touch,
    score: base.score,
    xp: base.xp,
    color: base.color,
    flash: 0,
    touchCooldown: 0,
    wispHitT: 0,
    dashT: world.rng.range(0.6, 1.8),
    dashState: 'chase', // chase | windup | dash
    dashVx: 0, dashVy: 0,
    phase: world.rng.range(0, Math.PI * 2),
  });
}

function director(world, dt) {
  world.spawnTimer -= dt;
  if (world.spawnTimer > 0) return;
  world.spawnTimer = spawnInterval(world.wave) * world.rng.range(0.75, 1.25);
  if (world.enemies.length >= MAX_ENEMIES) return;
  const kind = world.rng.pick(unlockedKinds(world.wave));
  const p = spawnPoint(world.rng);
  spawnEnemy(world, kind, p.x, p.y);
}

// --- combat -----------------------------------------------------------------

function fireBolts(world, fx) {
  const { player, stats } = world;
  const n = stats.projectiles;
  const baseAngle = Math.atan2(player.aimY, player.aimX);
  for (let i = 0; i < n; i++) {
    const angle = baseAngle + (i - (n - 1) / 2) * 0.085;
    world.projectiles.push({
      x: player.x + Math.cos(angle) * 18,
      y: player.y + Math.sin(angle) * 18,
      vx: Math.cos(angle) * PLAYER.projectileSpeed,
      vy: Math.sin(angle) * PLAYER.projectileSpeed,
      pierceLeft: stats.pierce,
      life: 1.15,
      hitSet: new Set(),
    });
  }
  fx.particles.trail(player.x + Math.cos(baseAngle) * 22, player.y + Math.sin(baseAngle) * 22, '#ffcf8a');
  fx.audio.shoot();
}

function dropSparks(world, x, y, count) {
  for (let i = 0; i < count; i++) {
    const angle = world.rng.range(0, Math.PI * 2);
    const v = world.rng.range(30, 130);
    world.sparks.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      t: world.rng.range(0, Math.PI * 2),
    });
  }
}

function killEnemy(world, enemy, fx) {
  world.kills += 1;
  world.score += enemy.score;
  dropSparks(world, enemy.x, enemy.y, enemy.xp);
  fx.particles.burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'bulwark' ? 26 : 12, 230, 0.5, 3.4);
  if (enemy.kind === 'bulwark' || enemy.kind === 'splitter') fx.particles.ring(enemy.x, enemy.y, enemy.color);
  fx.particles.text(enemy.x, enemy.y - enemy.radius - 4, `+${enemy.score}`, '#ffe9b0', 14);
  fx.audio.enemyDie();
  if (enemy.kind === 'splitter') {
    for (let i = 0; i < 2; i++) {
      spawnEnemy(world, 'mite', enemy.x + world.rng.range(-16, 16), enemy.y + world.rng.range(-16, 16));
    }
  }
}

function hurtPlayer(world, enemy, fx) {
  const { player, stats } = world;
  player.hp -= enemy.touch;
  player.invuln = PLAYER.invulnSeconds;
  enemy.touchCooldown = 0.85;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  player.x += (dx / d) * 22;
  player.y += (dy / d) * 22;
  enemy.x -= (dx / d) * 10;
  enemy.y -= (dy / d) * 10;
  world.shake = Math.min(13, world.shake + 7);
  fx.particles.burst(player.x, player.y, '#ff5d6c', 14, 210, 0.45, 3.2);
  fx.audio.hurt();
  if (player.hp <= 0) {
    player.hp = 0;
    world.phase = 'over';
    fx.particles.burst(player.x, player.y, '#ffb347', 46, 320, 0.9, 4);
    fx.particles.ring(player.x, player.y, '#ffb347');
    fx.audio.gameover();
  }
  void stats;
}

function gainXp(world, fx) {
  const { player } = world;
  player.xp += 1;
  world.sparksCollected += 1;
  world.score += 2;
  fx.audio.pickup();
  while (player.xp >= player.xpNeed) {
    player.xp -= player.xpNeed;
    player.level += 1;
    player.xpNeed = xpForLevel(player.level);
    world.pendingLevels += 1;
    fx.particles.ring(player.x, player.y, '#ffd76a');
    fx.particles.text(player.x, player.y - 30, 'LEVEL UP', '#ffd76a', 19);
    fx.audio.levelup();
  }
}

// --- per-frame update ---------------------------------------------------------

export function updateWorld(world, input, dt, fx) {
  if (world.phase !== 'playing') return;
  const { player, stats } = world;
  const rng = world.rng;

  world.time += dt;
  world.score += dt * 5; // survival trickle
  world.waveTime += dt;
  if (world.waveTime >= WAVE_SECONDS) {
    world.waveTime -= WAVE_SECONDS;
    world.wave += 1;
    world.banner = { title: `WAVE ${world.wave}`, sub: pickWaveLine(world.wave), t: 2.4 };
    fx.audio.waveStart();
  }
  if (world.banner) {
    world.banner.t -= dt;
    if (world.banner.t <= 0) world.banner = null;
  }
  world.shake = Math.max(0, world.shake - dt * 26);
  player.invuln = Math.max(0, player.invuln - dt);
  player.fireCooldown -= dt;

  // Movement and aim.
  const move = input.moveVector();
  player.moving = move.x !== 0 || move.y !== 0;
  player.x += move.x * stats.moveSpeed * dt;
  player.y += move.y * stats.moveSpeed * dt;
  player.x = clamp(player.x, ARENA.x + PLAYER.radius, ARENA.x + ARENA.w - PLAYER.radius);
  player.y = clamp(player.y, ARENA.y + PLAYER.radius, ARENA.y + ARENA.h - PLAYER.radius);
  const aimDx = input.mouseX - player.x;
  const aimDy = input.mouseY - player.y;
  if (aimDx !== 0 || aimDy !== 0) {
    const d = Math.hypot(aimDx, aimDy);
    player.aimX = aimDx / d;
    player.aimY = aimDy / d;
  }
  if (stats.regen > 0) player.hp = Math.min(stats.maxHp, player.hp + stats.regen * dt);
  if (player.moving && rng.chance(0.35)) fx.particles.trail(player.x, player.y + 10, '#7a4a21');

  // Firing.
  if ((input.mouseDown || input.pressed('Space')) && player.fireCooldown <= 0) {
    player.fireCooldown = 1 / stats.fireRate;
    fireBolts(world, fx);
  }

  director(world, dt);

  // Orbit wisps.
  world.wispAngle += dt * 2.7;
  world.wispPositions = [];
  for (let i = 0; i < stats.wisps; i++) {
    const a = world.wispAngle + (i * Math.PI * 2) / Math.max(1, stats.wisps);
    world.wispPositions.push({ x: player.x + Math.cos(a) * 54, y: player.y + Math.sin(a) * 54 });
  }

  updateEnemies(world, dt, fx);
  updateProjectiles(world, dt, fx);
  updateSparks(world, dt, fx);
}

function updateEnemies(world, dt, fx) {
  const { player } = world;
  const enemies = world.enemies;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.flash = Math.max(0, e.flash - dt);
    e.touchCooldown = Math.max(0, e.touchCooldown - dt);
    e.wispHitT = Math.max(0, e.wispHitT - dt);
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;

    if (e.kind === 'dart') {
      e.dashT -= dt;
      if (e.dashState === 'chase' && e.dashT <= 0) {
        e.dashState = 'windup';
        e.dashT = 0.34;
        e.dashVx = ux;
        e.dashVy = uy;
      } else if (e.dashState === 'windup' && e.dashT <= 0) {
        e.dashState = 'dash';
        e.dashT = 0.42;
      } else if (e.dashState === 'dash' && e.dashT <= 0) {
        e.dashState = 'chase';
        e.dashT = world.rng.range(1.1, 2.1);
      }
    }

    let vx = ux * e.speed;
    let vy = uy * e.speed;
    if (e.dashState === 'windup') {
      vx *= 0.25;
      vy *= 0.25;
    } else if (e.dashState === 'dash') {
      vx = e.dashVx * e.speed * 3.4;
      vy = e.dashVy * e.speed * 3.4;
    } else if (e.kind === 'shade' || e.kind === 'mite') {
      const wobble = Math.sin(world.time * 3.1 + e.phase) * 0.35;
      vx += -uy * e.speed * wobble;
      vy += ux * e.speed * wobble;
    }
    e.x += vx * dt;
    e.y += vy * dt;

    // Wisps sear what they touch.
    if (world.wispPositions.length > 0 && e.wispHitT <= 0) {
      for (const w of world.wispPositions) {
        if (Math.hypot(w.x - e.x, w.y - e.y) < e.radius + 11) {
          e.hp -= 1;
          e.flash = 0.08;
          e.wispHitT = 0.38;
          fx.particles.burst(e.x, e.y, '#9ad1ff', 3, 120, 0.3, 2.4);
          if (e.hp <= 0) killEnemy(world, e, fx);
          break;
        }
      }
      if (e.hp <= 0) {
        enemies.splice(i, 1);
        continue;
      }
    }

    // Contact with the player.
    if (dist < e.radius + PLAYER.radius && e.touchCooldown <= 0 && player.invuln <= 0 && world.phase === 'playing') {
      hurtPlayer(world, e, fx);
    }
  }

  // Gentle separation so a horde reads as bodies, not a stack.
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const rr = a.radius + b.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0.01 && d2 < rr * rr) {
        const d = Math.sqrt(d2);
        const push = ((rr - d) / d) * 0.5 * Math.min(1, dt * 8);
        a.x -= dx * push * 0.5;
        a.y -= dy * push * 0.5;
        b.x += dx * push * 0.5;
        b.y += dy * push * 0.5;
      }
    }
  }
}

function updateProjectiles(world, dt, fx) {
  const list = world.projectiles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    let dead = p.life <= 0 || p.x < ARENA.x - 30 || p.x > ARENA.x + ARENA.w + 30 || p.y < ARENA.y - 30 || p.y > ARENA.y + ARENA.h + 30;
    if (!dead) {
      for (let j = world.enemies.length - 1; j >= 0; j--) {
        const e = world.enemies[j];
        if (p.hitSet.has(e)) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const rr = e.radius + PLAYER.projectileRadius;
        if (dx * dx + dy * dy < rr * rr) {
          p.hitSet.add(e);
          e.hp -= world.stats.damage;
          e.flash = 0.09;
          const kb = e.kind === 'bulwark' ? 14 : 46;
          const d = Math.hypot(p.vx, p.vy) || 1;
          e.x += (p.vx / d) * kb * 0.12;
          e.y += (p.vy / d) * kb * 0.12;
          fx.particles.burst(p.x, p.y, '#ffcf8a', 3, 130, 0.28, 2.4);
          fx.particles.text(e.x, e.y - e.radius - 2, `${world.stats.damage}`, '#ffd9a0', 13);
          fx.audio.hit();
          if (e.hp <= 0) {
            killEnemy(world, e, fx);
            world.enemies.splice(j, 1);
          }
          if (p.pierceLeft > 0) {
            p.pierceLeft -= 1;
          } else {
            dead = true;
          }
          break;
        }
      }
    }
    if (dead) {
      list[i] = list[list.length - 1];
      list.pop();
    }
  }
}

function updateSparks(world, dt, fx) {
  const { player, stats } = world;
  const list = world.sparks;
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    s.t += dt * 5;
    const dx = player.x - s.x;
    const dy = player.y - s.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < stats.magnet) {
      const pull = 640 * (1 - dist / (stats.magnet * 1.6));
      s.vx += (dx / dist) * pull * dt * 3.2;
      s.vy += (dy / dist) * pull * dt * 3.2;
    }
    s.vx *= Math.max(0, 1 - 3.4 * dt);
    s.vy *= Math.max(0, 1 - 3.4 * dt);
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (dist < PLAYER.radius + 12 && world.phase === 'playing') {
      fx.particles.burst(s.x, s.y, '#ffd76a', 3, 90, 0.3, 2.2);
      gainXp(world, fx);
      list[i] = list[list.length - 1];
      list.pop();
    }
  }
}

// --- level-ups ----------------------------------------------------------------

export function beginLevelChoice(world) {
  world.choices = rollChoices(world.rng, world.owned);
  return world.choices;
}

export function chooseUpgrade(world, index, fx) {
  if (!world.choices || !world.choices[index]) return world.pendingLevels;
  const choice = world.choices[index];
  choice.apply(world.stats, world);
  world.owned.set(choice.id, (world.owned.get(choice.id) || 0) + 1);
  world.pendingLevels = Math.max(0, world.pendingLevels - 1);
  world.choices = world.pendingLevels > 0 ? rollChoices(world.rng, world.owned) : null;
  fx.audio.choose();
  return world.pendingLevels;
}

// --- helpers --------------------------------------------------------------------

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function pickWaveLine(wave) {
  const lines = [
    'The dark deepens.',
    'They smell the Hearth now.',
    'Hold the light, Warden.',
    'More shapes in the gloom.',
    'The night is not done with you.',
  ];
  return lines[(wave - 2) % lines.length] || lines[0];
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
