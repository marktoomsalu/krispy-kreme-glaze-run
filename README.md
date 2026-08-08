# Krispy Kreme: Glaze Run

A doughnut endless runner. Plain HTML, CSS and JavaScript — no framework, no build
step required. Everything you see is drawn on a `<canvas>` at runtime, aside from
the logo in the header.

> **Unofficial fan project.** Not affiliated with, sponsored by, or endorsed by
> Krispy Kreme Doughnut Corporation. "Krispy Kreme" and its logo are trademarks of
> their respective owner, used here for a non-commercial fan game. If you're
> distributing this beyond a personal/portfolio context, swap the logo and name
> out — see [Branding](#branding) below.

---

## Running it

**Option A — VS Code Live Server (no install)**

1. Open this folder in VS Code (`File → Open Folder…`).
2. Install the **Live Server** extension if you don't have it (VS Code will offer it —
   it's in `.vscode/extensions.json`).
3. Right-click `index.html` → **Open with Live Server**.

**Option B — Vite (nicer reloads)**

```bash
npm install
npm run dev
```

Then open the URL it prints. `npm run build` puts a deployable copy in `dist/`.

> Opening `index.html` by double-clicking **will not work.** The game uses ES modules,
> and browsers block those on `file://`. Use one of the two options above.

---

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Jump / double jump | `Space`, `↑`, `W` | tap the screen or **Jump** |
| Duck (and fast-fall in mid-air) | `↓`, `S` | hold **Duck** |
| Pause | `P` | — |

Collect **12 doughnut holes** to fill the box and switch on the **hot light**: for a
few seconds you fly (hold jump to climb), you're invincible, obstacles explode for
bonus points, and loose holes are pulled toward you.

---

## Where things live

```
index.html            page shell — the canvas, the shopfront chrome, the buttons
src/
  styles.css          everything outside the canvas
  main.js             entry point: sets up the canvas, input, and the frame loop
  config.js           ← START HERE. All tuning numbers and colours.
  game.js             the orchestrator: update order, collisions, game over
  state.js            all mutable run state (score, player, entity arrays)
  renderer.js         canvas + ctx, retina scaling, shared drawing helpers
  util.js             clamp / rnd / pick / colour mixing / AABB overlap
  input.js            keyboard, pointer and on-screen buttons → a `keys` object
  audio.js            WebAudio beeps, generated on the fly
  storage.js          best score in localStorage
  doughnut.js         the shared doughnut art (player, stacks, sun and moon)
  scenery.js          sky, shopfronts, hot light sign, conveyor, glaze curtain
  hud.js              dozen-box meter, scoreboard, title / pause / game over panels
  leaderboard.js       Supabase client: start a run, submit a score, fetch the top 10
  ui.js                DOM overlays canvas can't host: nickname entry, leaderboard panel
  entities/
    player.js         movement, jumping, flight, hitbox, the mascot art
    obstacles.js      spawning, movement, hitboxes, and art for each obstacle type
    collectibles.js   doughnut holes and the magnet
    particles.js      the sugar and glaze debris
```

The update order in `game.js → update()` is deliberate: scenery, then player, then
obstacles, then collectibles, then collisions. Collisions run last so everything is
already in its final position for the frame.

---

## Things to try changing

Nearly all of these live in **`src/config.js`**:

- **Too hard?** Lower `speed.maxGain`, or raise `obstacles.minGap`.
- **Too easy?** Raise `speed.gainPerPixel`, lower `obstacles.minGap` and `maxGap`.
- **Floatier jump:** lower `player.gravity` and `player.jumpVelocity` together.
- **Triple jump:** set `player.maxJumps` to 3.
- **Longer hot light:** raise `rush.duration`; `rush.lift` controls how fast you climb.
- **A shorter dozen:** lower `holes.perDozen` to trigger the hot light sooner.
- **Different day length:** `dayNight.cycleLength` is pixels travelled per half day.
- **Recolour everything:** the `COLORS` object, and `FLAVOURS` for the doughnut stacks.

### Adding a new obstacle

1. Add a branch in `spawn()` in `src/entities/obstacles.js` that pushes
   `{ type: 'yourthing', x: W + 40, w, h }`.
2. Add its hitbox to `obstacleBox()` — return `{ x, y, w, h }` in world coordinates.
3. Write a `drawYourThing(o)` function and add it to the `if` chain in `drawObstacles()`.

That's all three places. Nothing else needs to know it exists.

### Adding a sound

Add an entry to the `sfx` object in `src/audio.js`. `tone(freq, duration, options)`
takes `type` (`square`, `triangle`, `sine`, `sawtooth`), `volume`, and `slide`
(how many Hz to bend to over the sound's life — negative bends down).

---

## Notes

- The canvas is always drawn at a logical **900 × 720** and scaled by CSS, so
  coordinates never change with window size. `renderer.js` handles retina sharpness.
  Chosen deliberately taller than it is wide-relative-to-height (1.25:1, not the
  landscape-ish 2.81:1 it started as) since most players are on portrait phones —
  `groundY` keeps the belt exactly 66px deep either way, so this only changes how
  much sky sits above the play area, not gameplay itself.
- `dt` is clamped in `main.js`, so pausing on a background tab won't fling you
  across the level when you come back.
- The doughnut hole is a genuine hole: the ring is *stroked*, not filled, so
  scenery shows through the middle.
- Styling is doughnut-shop inspired; the header logo (`assets/krispy-kreme-logo.webp`)
  is the only non-code asset in the project.

---

## Branding

The only real trademark surface is `assets/krispy-kreme-logo.webp` and the text
strings "Krispy Kreme" in [`index.html`](index.html) and [`src/hud.js`](src/hud.js).
To de-brand the game (e.g. before sharing it more widely, or if asked to take it
down), you only need to touch those three spots:

1. Remove/replace `assets/krispy-kreme-logo.webp` and the `<img class="logo">` tag
   in `index.html`.
2. Change the `<title>` and `<h1>` in `index.html`.
3. Change the `'Krispy Kreme'` panel title in `src/hud.js`.

Everything else (colours, the script-font marquee, the doughnut-shop chrome) is
original and not brand-specific.

---

## Leaderboard (Supabase)

Scores, ranks, and the two prize tiers (5% discount, free donut) are backed by a
small Supabase (Postgres) project. Setup is copy-paste, no CLI or deploy pipeline:

1. Create a free project at [supabase.com](https://supabase.com) under your
   **personal** account.
2. Open the project's **SQL Editor → New query**, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it once. This creates the
   tables, locks them down with row-level security, and adds the two functions
   (`start_run`, `submit_score`) the game calls.
3. In **Project Settings → API**, copy the **Project URL** and the **anon public
   key**, and paste them into the two constants at the top of
   [`src/leaderboard.js`](src/leaderboard.js). Both are meant to be public — safe to
   commit — every actual permission is enforced by the RLS policies and functions
   in `schema.sql`, not by keeping the key secret.
4. Optionally, fill in the same Project URL in
   [`.github/workflows/keep-supabase-warm.yml`](.github/workflows/keep-supabase-warm.yml)
   — Supabase's free tier pauses a project after ~7 days of no API traffic, and
   this workflow pings it weekly so that never happens silently.

Until step 3 is done, the game runs fine — the leaderboard just quietly no-ops
(`leaderboard.js` detects the placeholder values and skips network calls).

**How the anti-cheat works:** `submit_score()` independently recomputes each run's
score from its own server clock and the game's known physics (max distance
reachable per second of real time, plus structural checks on holes/smashes/bonus).
It's a plausibility filter tuned to the actual difficulty curve, not a bulletproof
system — appropriate for a giveaway, not a bank. The prize thresholds live as named
constants near the top of `submit_score()` in `schema.sql` (mirrored, display-only,
in `CFG.rewards` in `src/config.js`) — tune both together if you change them.

**Claiming a prize:** the leaderboard keeps one row per player (their best-ever
run, not every attempt), keyed by a random id the browser generates and caches —
not an account system, just enough to avoid one player cluttering the board with
every retry. Crossing a tier for the first time shows a claim code once, and the
game prompts for an email or phone number right there so you can actually reach
them; replaying afterward just shows the same code again rather than minting a
new one. Fulfillment is still manual: look the code up in the Supabase dashboard
(Table Editor → `claims`) to see its `contact` value and mark it however you
track fulfillment.

---

## Deploying, and keeping it alive long-term

This is a static site — the game itself needs no server, and the leaderboard's
"server" is a free Supabase project, so the whole thing can be hosted for free,
indefinitely, on infrastructure tied to a **personal** account rather than any
employer:

**GitHub Pages (recommended)**

1. Create a repo under your personal GitHub account (e.g. `krispy-kreme-glaze-run`).
2. Push this folder to it (`git init`, `git add`, `git commit`, `git remote add
   origin …`, `git push`).
3. In the repo's **Settings → Pages**, set Source to the `main` branch, root folder.
4. GitHub serves it at `https://<your-username>.github.io/<repo-name>/` — no build
   step needed, since the page already runs straight off `index.html` over `http(s)`.

**Handing it off to someone else**

- Add them as a collaborator (**Settings → Collaborators**), or
- Transfer the repo to their account (**Settings → General → Transfer ownership**).
- For the leaderboard: add them as a member of the Supabase project (**Project
  Settings → Team**), or transfer the Supabase organization itself.

Either way, the game keeps running at the same URL with no involvement from you,
and nothing in the stack (hosting, code, assets, leaderboard) depends on any
company account.
