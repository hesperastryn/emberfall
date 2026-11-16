// The upgrade pool: what a level-up offers. Each entry knows its name,
// the glyph drawn on its card, how many times it may be taken, and what
// it does to the run's stats. Choices are rolled three at a time; when
// the pool runs dry, two small blessings fill the empty slots.

export const UPGRADES = [
  {
    id: 'heavy', name: 'Heavy Sparks', glyph: '◆', max: 5,
    blurb: () => 'Each ember bolt hits +1 damage.',
    apply: (s) => { s.damage += 1; },
  },
  {
    id: 'rapid', name: 'Rapid Embers', glyph: '»', max: 5,
    blurb: () => 'Fire 22% faster.',
    apply: (s) => { s.fireRate *= 1.22; },
  },
  {
    id: 'twin', name: 'Twin Flames', glyph: '✷', max: 3,
    blurb: () => '+1 bolt with every shot, fanned wide.',
    apply: (s) => { s.projectiles += 1; },
  },
  {
    id: 'pierce', name: 'Piercing Flames', glyph: '➤', max: 3,
    blurb: () => 'Bolts pass through +1 extra Gloom.',
    apply: (s) => { s.pierce += 1; },
  },
  {
    id: 'swift', name: 'Swift Boots', glyph: '♞', max: 4,
    blurb: () => 'Move 12% faster.',
    apply: (s) => { s.moveSpeed *= 1.12; },
  },
  {
    id: 'magnet', name: 'Spark Magnet', glyph: '◎', max: 3,
    blurb: () => 'Sparks fly to you from 45% farther away.',
    apply: (s) => { s.magnet *= 1.45; },
  },
  {
    id: 'heart', name: 'Vital Hearth', glyph: '♥', max: 5,
    blurb: () => '+25 max health, and mend 25 now.',
    apply: (s, world) => { s.maxHp += 25; world.player.hp = Math.min(s.maxHp, world.player.hp + 25); },
  },
  {
    id: 'wisp', name: 'Orbit Wisp', glyph: '☽', max: 3,
    blurb: () => 'A wisp circles you, searing Glooms it touches.',
    apply: (s) => { s.wisps += 1; },
  },
  {
    id: 'mend', name: 'Second Wind', glyph: '✚', max: 3,
    blurb: () => 'Regenerate +0.7 health every second.',
    apply: (s) => { s.regen += 0.7; },
  },
];

const BLESSINGS = [
  {
    id: 'feast', name: 'Kindled Feast', glyph: '✿', max: Infinity,
    blurb: () => 'Mend 40 health at once.',
    apply: (s, world) => { world.player.hp = Math.min(s.maxHp, world.player.hp + 40); },
  },
  {
    id: 'cache', name: 'Spark Cache', glyph: '✦', max: Infinity,
    blurb: () => '+150 score, banked in sparks.',
    apply: (s, world) => { world.score += 150; },
  },
];

// Three distinct choices the player may still take, blessings padding
// the list when the pool is nearly spent.
export function rollChoices(rng, owned) {
  const pool = UPGRADES.filter((u) => (owned.get(u.id) || 0) < u.max);
  const choices = [];
  const bag = [...pool];
  while (choices.length < 3 && bag.length > 0) {
    const i = Math.floor(rng.next() * bag.length);
    choices.push(bag.splice(i, 1)[0]);
  }
  let b = 0;
  while (choices.length < 3) {
    choices.push(BLESSINGS[b % BLESSINGS.length]);
    b += 1;
  }
  return choices;
}
