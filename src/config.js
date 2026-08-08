/**
 * Every number worth tweaking lives here.
 * Change a value, save, and the page reloads with it.
 */

export const CFG = {
  // Canvas is drawn at this fixed logical size, then scaled to fit the page.
  width: 900,
  height: 320,
  groundY: 254,

  player: {
    x: 132,
    radius: 28,
    gravity: 2350,        // falling
    releaseGravity: 3500,  // extra pull when you let go of jump early
    fastFall: 2100,        // holding down mid-air
    jumpVelocity: -780,
    doubleJumpVelocity: -650,
    maxJumps: 2
  },

  speed: {
    base: 380,          // starting px/second
    gainPerPixel: 0.016, // how fast it ramps
    maxGain: 360         // top speed = base + maxGain
  },

  obstacles: {
    minGap: 330,
    maxGap: 560,
    gapPerSpeed: 0.42,     // extra spacing as the belt speeds up
    twinChance: 0.18,      // odds of a back-to-back pair
    twinAfterScore: 380,
    boxAfterScore: 260,    // flying boxes only appear once you're warmed up
    boxHeight: 88          // how high above the belt they fly
  },

  holes: {
    minGap: 880,
    maxGap: 1650,
    value: 10,
    perDozen: 12          // fill this many to switch on the hot light
  },

  rush: {
    duration: 5.2,
    lift: -2500,          // hold jump to climb
    sink: 1500,
    maxSpeed: 560,
    ceiling: 86,
    smashValue: 25,
    magnetRange: 260,
    magnetPull: 420
  },

  scoring: {
    pixelsPerMetre: 12
  },

  dayNight: {
    cycleLength: 5200     // pixels travelled per half day
  },

  // Display-only mirror of the authoritative thresholds in
  // supabase/schema.sql (submit_score()). The server never trusts this
  // copy — it's here purely so the UI can show "N points to go" hints.
  // Keep both in sync if you tune these.
  rewards: {
    discountScore: 3000,
    freeDonutScore: 8000
  }
};

export const COLORS = {
  green: '#00874E',
  greenDark: '#00603A',
  red: '#D2103F',
  cream: '#FFF7EF',
  glaze: '#FFFDF9',
  dough: '#EBB471',
  doughDark: '#C8873F',
  ink: '#1F2E26',
  skyTopDay: '#CFEBFF',
  skyBottomDay: '#FFE7C4',
  skyTopNight: '#07202B',
  skyBottomNight: '#123A2C',
  beltTop: '#4C5A55',
  beltBottom: '#39443F',
  beltChevron: '#68766F'
};

// Glaze flavours used by the doughnut stacks.
export const FLAVOURS = [
  { glaze: '#FFFDF9', dough: '#EBB471', drizzle: false }, // original
  { glaze: '#5A3520', dough: '#EBB471', drizzle: true },  // chocolate
  { glaze: '#F58BA8', dough: '#EBB471', drizzle: false }, // strawberry
  { glaze: '#00874E', dough: '#EBB471', drizzle: true }   // seasonal green
];
