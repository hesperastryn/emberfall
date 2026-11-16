# emberfall

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/hesperastryn/emberfall/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/hesperastryn/emberfall/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Emberfall is a complete arena-survival game for the desktop browser, written in plain JavaScript with no build step and no dependencies. You are the Ember Warden, the last keeper of the Hearth: waves of Glooms — shades, darts, splitters and bulwarks — rush the arena in the dark. Blast them into sparks with ember bolts, gather the sparks to level up, and spend every level on one of three gifts: heavier or piercing flames, extra bolts, a spark magnet, an orbiting wisp, a stronger Hearth. The waves deepen every 25 seconds and the Glooms grow bolder; your score is your survival, counted in points, time and felled Glooms. It plays with keyboard and mouse, has synthesized sound, a title screen, a HUD, level-up choices and a results screen with a restart — the whole loop, in static files.

## Run it

```sh
node serve.ts
```

Then open the address it prints (http://localhost:8080) in a desktop browser. Any static file server pointed at `game/` works just as well; `game/index.html` is the game, and it loads nothing from the network.

How to play: WASD or the arrow keys move, the mouse aims, holding the mouse button or Space fires. Sparks are experience — walk over them (or grow your Spark Magnet) to level up and pick a gift with the mouse or the keys 1, 2, 3. M mutes, P pauses, R rises again after a fall.

The code is split by job under `game/src/`: `world.js` is the simulation, `render.js` draws everything, `input.js`, `audio.js` (every sound is synthesized), `particles.js`, `upgrades.js`, `config.js`, `random.js`, and `shots.js`, which stages the deterministic scenes the screenshots in `screenshots/` were captured from. `main.ts` is the hand-in program: it copies `game/` and `screenshots/` to the output directory and writes the dossier with the vendored library in `vendor/`.

---
<sub>Entered on [make.fun](https://make.fun/?ref=9sbzt2n6&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
