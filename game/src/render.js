// Every pixel of Emberfall: arena, entities, HUD, menus and overlays.
// The simulation never draws; it leaves state in the world and this file
// reads it. Layout constants the main loop needs for clicks (the level-up
// cards) are exported from here so drawing and hit-testing cannot drift.

import { VIEW_W, VIEW_H, ARENA, PLAYER, COLORS } from './config.js';
import { formatTime } from './world.js';

const DISPLAY = '"Georgia", "Times New Roman", serif';
const BODY = '"Segoe UI", system-ui, -apple-system, sans-serif';

export const CARD_W = 300;
export const CARD_H = 216;
export const CARD_Y = 296;
export function cardRect(index) {
  const gap = 28;
  const total = CARD_W * 3 + gap * 2;
  return { x: (VIEW_W - total) / 2 + index * (CARD_W + gap), y: CARD_Y, w: CARD_W, h: CARD_H };
}

export function drawScene(ctx, world, ui) {
  ctx.save();
  if (world.shake > 0.2) {
    const t = ui.time * 91;
    ctx.translate(Math.sin(t * 1.3) * world.shake * 0.5, Math.cos(t * 1.7) * world.shake * 0.5);
  }
  drawStage(ctx, world, ui);
  if (ui.screen === 'title') {
    drawTitleAmbient(ctx, world, ui);
    if (ui.particles) ui.particles.draw(ctx);
    drawTitle(ctx, world, ui);
  } else {
    drawEntities(ctx, world, ui);
    if (ui.particles) ui.particles.draw(ctx);
    drawHud(ctx, world, ui);
    if (world.banner && ui.screen === 'playing') drawBanner(ctx, world);
    if (ui.screen === 'levelup') drawLevelUp(ctx, world, ui);
    if (ui.screen === 'gameover') drawGameOver(ctx, world, ui);
  }
  ctx.restore();
  drawVignette(ctx, world, ui);
}

// --- stage --------------------------------------------------------------------

function drawStage(ctx, world, ui) {
  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);

  // The Hearth's glow at the arena's heart.
  const cx = ARENA.x + ARENA.w / 2;
  const cy = ARENA.y + ARENA.h / 2;
  const glow = ctx.createRadialGradient(cx, cy, 40, cx, cy, 520);
  glow.addColorStop(0, 'rgba(255, 150, 60, 0.16)');
  glow.addColorStop(0.55, 'rgba(255, 120, 50, 0.05)');
  glow.addColorStop(1, 'rgba(255, 120, 50, 0)');
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  ctx.fillStyle = glow;
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);

  // Floor runes: a quiet grid of dots and rings.
  ctx.fillStyle = COLORS.floorLine;
  for (let gx = ARENA.x + 48; gx < ARENA.x + ARENA.w - 20; gx += 64) {
    for (let gy = ARENA.y + 48; gy < ARENA.y + ARENA.h - 20; gy += 64) {
      ctx.beginPath();
      ctx.arc(gx, gy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(120, 110, 200, 0.10)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 120 + Math.sin(ui.time * 0.8) * 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 190, 0, Math.PI * 2);
  ctx.stroke();

  // The Hearth stone at the centre.
  ctx.fillStyle = '#241a38';
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.frame;
  ctx.lineWidth = 2;
  ctx.stroke();
  drawFlame(ctx, cx, cy - 6, 15 + Math.sin(ui.time * 6) * 2.2, ui.time);

  // Frame.
  ctx.strokeStyle = COLORS.frame;
  ctx.lineWidth = 3;
  ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  ctx.fillStyle = COLORS.frame;
  for (const [fx, fy] of [[ARENA.x, ARENA.y], [ARENA.x + ARENA.w, ARENA.y], [ARENA.x, ARENA.y + ARENA.h], [ARENA.x + ARENA.w, ARENA.y + ARENA.h]]) {
    ctx.beginPath();
    ctx.arc(fx, fy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFlame(ctx, x, y, size, t) {
  const flick = Math.sin(t * 11) * size * 0.08;
  ctx.save();
  ctx.translate(x, y);
  const grad = ctx.createLinearGradient(0, size, 0, -size * 1.6);
  grad.addColorStop(0, '#ff7847');
  grad.addColorStop(0.6, '#ffb347');
  grad.addColorStop(1, '#ffe9a8');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.7);
  ctx.bezierCurveTo(-size * 0.62, size * 0.2, -size * 0.3, -size * 0.7 + flick, 0, -size * 1.5);
  ctx.bezierCurveTo(size * 0.34, -size * 0.66 - flick, size * 0.62, size * 0.2, 0, size * 0.7);
  ctx.fill();
  ctx.restore();
}

// --- title ----------------------------------------------------------------------

function drawTitleAmbient(ctx, world, ui) {
  // A few Glooms drift across the dark behind the title, and sparks rise.
  const t = ui.time;
  const spots = [
    { x: 190, y: 470, r: 21, c: '#e06ba8', p: 0.4 },
    { x: 1050, y: 440, r: 16, c: '#8b7fd4', p: 1.7 },
    { x: 920, y: 545, r: 11, c: '#4fd8c8', p: 3.1 },
    { x: 300, y: 560, r: 13, c: '#8b7fd4', p: 2.2 },
    { x: 1120, y: 560, r: 26, c: '#6a5acd', p: 5.0 },
  ];
  for (const s of spots) {
    const bobY = Math.sin(t * 0.9 + s.p) * 9;
    drawGloomBody(ctx, { kind: 'shade', x: s.x, y: s.y + bobY, radius: s.r, color: s.c, flash: 0, phase: s.p }, t, 640, 380);
  }
  void world;
}

function drawTitle(ctx, world, ui) {
  const cx = VIEW_W / 2;
  drawFlame(ctx, cx, 148, 30 + Math.sin(ui.time * 5) * 3, ui.time);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#2a1e12';
  ctx.font = '700 92px ' + DISPLAY;
  ctx.fillText('EMBERFALL', cx + 3, 265 + 3);
  const grad = ctx.createLinearGradient(0, 190, 0, 270);
  grad.addColorStop(0, '#ffe9a8');
  grad.addColorStop(0.55, '#ffb347');
  grad.addColorStop(1, '#ff7847');
  ctx.fillStyle = grad;
  ctx.fillText('EMBERFALL', cx, 265);

  ctx.font = 'italic 23px ' + DISPLAY;
  ctx.fillStyle = COLORS.text;
  ctx.fillText('Guard the Hearth. Outlast the Gloom.', cx, 308);

  ctx.font = '17px ' + BODY;
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('Waves of Glooms rush the arena. Blast them into sparks, gather the sparks,', cx, 356);
  ctx.fillText('and spend each level on a gift — more bolts, piercing flames, a circling wisp.', cx, 382);
  ctx.fillText('Fall, and the night takes the Hearth. How long can your ember burn?', cx, 408);

  // Controls panel.
  const pw = 560;
  const px = cx - pw / 2;
  const py = 448;
  roundRect(ctx, px, py, pw, 108, 12);
  ctx.fillStyle = 'rgba(26, 32, 64, 0.88)';
  ctx.fill();
  ctx.strokeStyle = COLORS.cardEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = '16px ' + BODY;
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'left';
  ctx.fillText('Move', px + 36, py + 36);
  ctx.fillText('Aim', px + 36, py + 64);
  ctx.fillText('Fire', px + 36, py + 92);
  ctx.fillStyle = COLORS.spark;
  ctx.fillText('W A S D  or  arrow keys', px + 130, py + 36);
  ctx.fillText('Mouse', px + 130, py + 64);
  ctx.fillText('Hold mouse button  or  Space', px + 130, py + 92);
  ctx.textAlign = 'center';

  const pulse = 0.72 + Math.sin(ui.time * 3.2) * 0.28;
  ctx.globalAlpha = pulse;
  ctx.font = '700 24px ' + BODY;
  ctx.fillStyle = '#ffd76a';
  ctx.fillText('Click or press Enter to kindle the Hearth', cx, 622);
  ctx.globalAlpha = 1;

  ctx.font = '14px ' + BODY;
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('M — mute · P — pause · Survive, score, and grow stronger every wave', cx, 668);
  void world;
}

// --- entities -------------------------------------------------------------------

function drawEntities(ctx, world, ui) {
  for (const s of world.sparks) drawSpark(ctx, s, ui.time);
  for (const p of world.projectiles) drawBolt(ctx, p);
  for (const e of world.enemies) drawGloomBody(ctx, e, ui.time, world.player.x, world.player.y);
  for (const e of world.enemies) {
    if ((e.kind === 'bulwark' || e.kind === 'splitter') && e.hp < e.maxHp) drawMiniHp(ctx, e);
  }
  if (world.phase !== 'over') drawPlayer(ctx, world, ui);
  for (const w of world.wispPositions) drawWisp(ctx, w, ui.time);
}

function drawSpark(ctx, s, t) {
  const pulse = 1 + Math.sin(s.t * 2.2) * 0.18;
  ctx.save();
  ctx.translate(s.x, s.y + Math.sin(s.t * 3) * 1.6);
  ctx.rotate(Math.PI / 4 + s.t * 0.7);
  ctx.fillStyle = '#ffd76a';
  const r = 5.2 * pulse;
  ctx.fillRect(-r / 1.6, -r / 1.6, r * 1.25, r * 1.25);
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 215, 106, 0.25)';
  ctx.beginPath();
  ctx.arc(s.x, s.y, 10 * pulse, 0, Math.PI * 2);
  ctx.fill();
  void t;
}

function drawBolt(ctx, p) {
  const back = 15;
  const d = Math.hypot(p.vx, p.vy) || 1;
  const bx = p.x - (p.vx / d) * back;
  const by = p.y - (p.vy / d) * back;
  ctx.strokeStyle = 'rgba(255, 150, 70, 0.55)';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 3.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawGloomBody(ctx, e, t, lookX, lookY) {
  const squash = 1 + Math.sin(t * 5 + e.phase) * 0.05;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(1, squash);
  ctx.fillStyle = e.color;
  if (e.kind === 'bulwark') {
    polygon(ctx, 0, 0, e.radius, 6, e.phase * 0.2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230, 225, 255, 0.35)';
    ctx.lineWidth = 2;
    polygon(ctx, 0, 0, e.radius * 0.66, 6, e.phase * 0.2);
    ctx.stroke();
  } else if (e.kind === 'splitter') {
    for (const [ox, oy, r] of [[0, 0, e.radius * 0.78], [-e.radius * 0.5, e.radius * 0.3, e.radius * 0.5], [e.radius * 0.52, e.radius * 0.28, e.radius * 0.46]]) {
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (e.kind === 'dart') {
    const ang = Math.atan2(lookY - e.y, lookX - e.x);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(e.radius * 1.25, 0);
    ctx.quadraticCurveTo(-e.radius * 0.4, -e.radius * 0.85, -e.radius * 1.05, 0);
    ctx.quadraticCurveTo(-e.radius * 0.4, e.radius * 0.85, e.radius * 1.25, 0);
    ctx.fill();
    ctx.rotate(-ang);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  // Eyes that watch the Warden.
  const look = Math.atan2(lookY - e.y, lookX - e.x);
  const ex = Math.cos(look) * e.radius * 0.22;
  const ey = Math.sin(look) * e.radius * 0.22;
  const gap = e.radius * 0.34;
  const perpX = Math.cos(look + Math.PI / 2) * gap;
  const perpY = Math.sin(look + Math.PI / 2) * gap;
  ctx.fillStyle = '#0e0a24';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(ex + perpX * s, ey + perpY * s, Math.max(2.2, e.radius * 0.15), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (e.flash > 0) {
    ctx.globalAlpha = Math.min(0.85, e.flash * 9);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (e.kind === 'dart' && e.dashState === 'windup') {
    ctx.strokeStyle = 'rgba(120, 255, 240, ' + (0.4 + 0.4 * Math.sin(t * 40)) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMiniHp(ctx, e) {
  const w = e.radius * 1.7;
  const frac = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = 'rgba(8, 8, 20, 0.65)';
  ctx.fillRect(e.x - w / 2, e.y - e.radius - 13, w, 5);
  ctx.fillStyle = '#ff8fa0';
  ctx.fillRect(e.x - w / 2, e.y - e.radius - 13, w * frac, 5);
}

function drawPlayer(ctx, world, ui) {
  const p = world.player;
  const blink = p.invuln > 0 && Math.sin(ui.time * 34) > 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (blink) ctx.globalAlpha = 0.45;

  // Aim chevron.
  ctx.fillStyle = 'rgba(255, 215, 140, 0.8)';
  ctx.save();
  ctx.rotate(Math.atan2(p.aimY, p.aimX));
  ctx.beginPath();
  ctx.moveTo(PLAYER.radius + 9, 0);
  ctx.lineTo(PLAYER.radius + 2, -4.5);
  ctx.lineTo(PLAYER.radius + 2, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Cloak.
  const grad = ctx.createLinearGradient(0, -16, 0, 18);
  grad.addColorStop(0, '#ff9a3d');
  grad.addColorStop(1, '#c33d21');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.quadraticCurveTo(15, -6, 12, 14);
  ctx.quadraticCurveTo(6, 19, 0, 17);
  ctx.quadraticCurveTo(-6, 19, -12, 14);
  ctx.quadraticCurveTo(-15, -6, 0, -17);
  ctx.fill();
  // Hood shadow and ember eyes.
  ctx.fillStyle = '#33160c';
  ctx.beginPath();
  ctx.arc(0, -6, 8.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(-3.2, -6, 1.7, 0, Math.PI * 2);
  ctx.arc(3.2, -6, 1.7, 0, Math.PI * 2);
  ctx.fill();
  drawFlame(ctx, 0, -17, 8.5 + Math.sin(ui.time * 9) * 1.2, ui.time);
  ctx.restore();
}

function drawWisp(ctx, w, t) {
  ctx.fillStyle = 'rgba(140, 200, 255, 0.28)';
  ctx.beginPath();
  ctx.arc(w.x, w.y, 11 + Math.sin(t * 7 + w.x) * 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cfe9ff';
  ctx.beginPath();
  ctx.arc(w.x, w.y, 4.6, 0, Math.PI * 2);
  ctx.fill();
}

// --- HUD and overlays -------------------------------------------------------------

function drawHud(ctx, world, ui) {
  const p = world.player;
  // Experience ribbon across the very top.
  ctx.fillStyle = 'rgba(10, 12, 26, 0.85)';
  ctx.fillRect(0, 0, VIEW_W, 54);
  ctx.fillStyle = '#232a52';
  ctx.fillRect(0, 50, VIEW_W, 4);
  ctx.fillStyle = COLORS.xp;
  ctx.fillRect(0, 50, VIEW_W * Math.min(1, p.xp / p.xpNeed), 4);

  ctx.textAlign = 'left';
  ctx.font = '700 16px ' + BODY;
  ctx.fillStyle = COLORS.text;
  // Health.
  ctx.fillText('HEARTH', 26, 33);
  bar(ctx, 108, 20, 240, 15, p.hp / world.stats.maxHp, COLORS.hp);
  ctx.font = '700 14px ' + BODY;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`${Math.ceil(p.hp)} / ${world.stats.maxHp}`, 358, 33);
  // Level.
  ctx.font = '700 16px ' + BODY;
  ctx.fillStyle = COLORS.spark;
  ctx.fillText(`LEVEL ${p.level}`, 520, 33);
  ctx.font = '14px ' + BODY;
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`next at ${p.xpNeed - p.xp} sparks`, 622, 33);

  // Score block, right aligned.
  ctx.textAlign = 'right';
  ctx.font = '700 21px ' + BODY;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`SCORE ${Math.floor(world.score)}`, VIEW_W - 26, 35);
  ctx.font = '600 14px ' + BODY;
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`WAVE ${world.wave} · ${formatTime(world.time)} · ${world.kills} felled`, VIEW_W - 26, 72 - 20);

  // Bottom hints.
  ctx.textAlign = 'left';
  ctx.font = '13px ' + BODY;
  ctx.fillStyle = 'rgba(154, 163, 199, 0.75)';
  ctx.fillText('WASD move · mouse aim · hold to fire', 26, VIEW_H - 16);
  ctx.textAlign = 'right';
  ctx.fillText(ui.muted ? 'M — sound off' : 'M — sound on', VIEW_W - 26, VIEW_H - 16);
  ctx.textAlign = 'left';
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, Math.max(8, w * Math.min(1, frac)), h, 6);
    ctx.fill();
  }
}

function drawBanner(ctx, world) {
  const b = world.banner;
  const a = Math.min(1, b.t / 0.5, (2.4 - b.t) / 0.4 + 0.4);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.textAlign = 'center';
  ctx.font = '700 44px ' + DISPLAY;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(b.title, VIEW_W / 2, 168);
  ctx.font = 'italic 18px ' + DISPLAY;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(b.sub, VIEW_W / 2, 200);
  ctx.restore();
}

function drawLevelUp(ctx, world, ui) {
  ctx.fillStyle = 'rgba(5, 6, 16, 0.62)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.font = '700 36px ' + DISPLAY;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('THE HEARTH GROWS BRIGHTER', VIEW_W / 2, 208);
  ctx.font = '17px ' + BODY;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`Level ${world.player.level} — choose a gift (click, or press 1 · 2 · 3)`, VIEW_W / 2, 240);

  world.choices.forEach((choice, i) => {
    const r = cardRect(i);
    const hover = ui.hoverCard === i;
    roundRect(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fillStyle = hover ? '#232c58' : COLORS.card;
    ctx.fill();
    ctx.strokeStyle = hover ? '#ffd76a' : COLORS.cardEdge;
    ctx.lineWidth = hover ? 2.5 : 1.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '44px ' + BODY;
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(choice.glyph, r.x + r.w / 2, r.y + 66);
    ctx.font = '700 21px ' + BODY;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(choice.name, r.x + r.w / 2, r.y + 108);
    ctx.font = '15px ' + BODY;
    ctx.fillStyle = COLORS.textDim;
    wrapText(ctx, choice.blurb(world.stats), r.x + r.w / 2, r.y + 140, r.w - 44, 20);
    const owned = world.owned.get(choice.id) || 0;
    if (owned > 0) {
      ctx.font = '600 13px ' + BODY;
      ctx.fillStyle = COLORS.spark;
      ctx.fillText(`already kindled ×${owned}`, r.x + r.w / 2, r.y + r.h - 16);
    }
    ctx.font = '700 14px ' + BODY;
    ctx.fillStyle = 'rgba(154, 163, 199, 0.8)';
    ctx.fillText(`${i + 1}`, r.x + 20, r.y + 26);
  });
  ctx.textAlign = 'left';
}

function drawGameOver(ctx, world, ui) {
  ctx.fillStyle = 'rgba(10, 4, 10, 0.66)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const cx = VIEW_W / 2;
  ctx.textAlign = 'center';
  ctx.font = '700 58px ' + DISPLAY;
  ctx.fillStyle = '#ff8fa0';
  ctx.fillText('THE EMBER FALLS', cx, 208);
  ctx.font = 'italic 19px ' + DISPLAY;
  ctx.fillStyle = COLORS.text;
  ctx.fillText('The Gloom takes the Hearth — this time.', cx, 244);

  const rows = [
    ['Final score', `${Math.floor(world.score)}`],
    ['Time survived', formatTime(world.time)],
    ['Wave reached', `${world.wave}`],
    ['Glooms felled', `${world.kills}`],
    ['Level reached', `${world.player.level}`],
    ['Sparks gathered', `${world.sparksCollected}`],
  ];
  ctx.font = '18px ' + BODY;
  rows.forEach(([label, value], i) => {
    const y = 306 + i * 34;
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(label, cx - 18, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 18px ' + BODY;
    ctx.fillText(value, cx + 18, y);
    ctx.font = '18px ' + BODY;
  });

  if (ui.best > 0) {
    ctx.textAlign = 'center';
    ctx.font = '15px ' + BODY;
    ctx.fillStyle = COLORS.spark;
    ctx.fillText(`Best score so far: ${ui.best}`, cx, 306 + rows.length * 34 + 8);
  }
  const pulse = 0.72 + Math.sin(ui.time * 3.2) * 0.28;
  ctx.globalAlpha = pulse;
  ctx.textAlign = 'center';
  ctx.font = '700 22px ' + BODY;
  ctx.fillStyle = '#ffd76a';
  ctx.fillText('Press R or click to rise again', cx, 640);
  ctx.globalAlpha = 1;
}

function drawVignette(ctx, world, ui) {
  const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(2, 2, 8, 0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (ui.screen === 'playing' && world.player && world.player.hp / world.stats.maxHp < 0.3 && world.phase === 'playing') {
    ctx.fillStyle = `rgba(200, 30, 50, ${0.1 + 0.06 * Math.sin(ui.time * 5)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

// --- small helpers ---------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function polygon(ctx, x, y, r, sides, rot) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * Math.PI * 2) / sides;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
}
