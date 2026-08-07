import { CFG, COLORS } from './config.js';
import { state, player, score } from './state.js';
import { ctx, W, H, roundRect } from './renderer.js';
import { mix, TAU } from './util.js';

const DOZEN = CFG.holes.perDozen;

export function drawHUD() {
  drawDozenBox();
  drawScoreboard();
  drawPanels();
}

/** The meter is a real box of a dozen filling up. */
function drawDozenBox() {
  const bx = 20;
  const by = 34;
  const bw = 112;
  const bh = 44;

  ctx.save();
  ctx.fillStyle = 'rgba(0,96,58,.85)';
  roundRect(bx - 3, by - 3, bw + 6, bh + 6, 7);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  roundRect(bx, by, bw, bh, 5);
  ctx.fill();
  ctx.fillStyle = COLORS.green;
  roundRect(bx, by, bw, 10, 4);
  ctx.fill();
  ctx.fillStyle = COLORS.red;
  ctx.fillRect(bx + 2, by + bh - 6, bw - 4, 4);

  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 6; i++) {
      const index = row * 6 + i;
      const cx = bx + 13 + i * 17.5;
      const cy = by + 22 + row * 13;
      const filled = index < (player.rush > 0 ? DOZEN : player.meter);

      ctx.fillStyle = filled
        ? player.rush > 0
          ? mix(COLORS.glaze, '#FFC44D', (Math.sin(state.time * 12 + index) + 1) / 2)
          : COLORS.dough
        : 'rgba(0,96,58,.14)';
      ctx.beginPath();
      ctx.arc(cx, cy, 5.6, 0, TAU);
      ctx.fill();

      if (filled) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  ctx.font = '700 9px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = player.rush > 0 ? '#FFD8E2' : '#FFFFFF';
  ctx.fillText(player.rush > 0 ? 'HOT LIGHT ON!' : 'FILL THE DOZEN', bx, by + bh + 15);
  ctx.restore();
}

function drawScoreboard() {
  ctx.save();
  ctx.textAlign = 'right';
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#FFFFFF';

  ctx.font = '700 27px ui-monospace, monospace';
  ctx.fillText(String(score()).padStart(5, '0'), W - 20, 52);

  ctx.font = '700 11px ui-monospace, monospace';
  ctx.globalAlpha = 0.85;
  ctx.fillText(`BEST ${String(state.best).padStart(5, '0')}`, W - 20, 68);
  if (state.dozens > 0) {
    ctx.fillText(`${state.dozens} ${state.dozens > 1 ? 'DOZENS' : 'DOZEN'} BOXED`, W - 20, 84);
  }
  ctx.restore();
}

function drawPanels() {
  if (state.mode === 'ready') {
    panel('Krispy Kreme', 'Jump the coffee, duck the dozen boxes.', 'Press space or tap to start');
  } else if (state.mode === 'paused') {
    panel('Back in a minute', 'The fryer is still on.', 'Press P to keep running');
  } else if (state.mode === 'over') {
    const bits = [`${score()} metres`];
    if (state.dozens) bits.push(`${state.dozens} dozen boxed`);
    if (score() >= state.best && state.best > 0) bits.push('fresh record!');
    panel(
      'Splat!',
      bits.join(' \u00B7 '),
      state.deathTimer > 0 ? '' : 'Press space or tap for another batch'
    );
  }
}

function panel(title, subtitle, cta) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,60,38,.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';

  ctx.font = '400 48px "Segoe Script", "Brush Script MT", "Snell Roundhand", cursive';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(title, W / 2, H / 2 - 8);

  ctx.font = '600 15px "Trebuchet MS", sans-serif';
  ctx.globalAlpha = 0.92;
  ctx.fillText(subtitle, W / 2, H / 2 + 20);

  if (cta) {
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(state.time * 4);
    ctx.font = '700 12px ui-monospace, monospace';
    ctx.fillStyle = '#FFC9D6';
    ctx.fillText(cta.toUpperCase(), W / 2, H / 2 + 50);
  }
  ctx.restore();
}
