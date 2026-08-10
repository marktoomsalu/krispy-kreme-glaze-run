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
  ctx.fillText(player.rush > 0 ? 'KUUM TULI PÕLEB!' : 'TÄIDA TOSIN', bx, by + bh + 15);
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
  ctx.fillText(`PARIM ${String(state.best).padStart(5, '0')}`, W - 20, 68);
  if (state.dozens > 0) {
    ctx.fillText(`${state.dozens} ${state.dozens > 1 ? 'TOSINAT' : 'TOSIN'} PAKITUD`, W - 20, 84);
  }
  ctx.restore();
}

function drawPanels() {
  if (state.mode === 'ready') {
    panel('Krispy Kreme', 'H\u00FCppa \u00FCle kohvi, k\u00FCkita s\u00F5\u00F5rikukarpide alt.', 'Vajuta t\u00FChikut v\u00F5i puuduta, et alustada');
  } else if (state.mode === 'paused') {
    panel('Kohe tagasi', 'Frittija p\u00F5leb endiselt.', 'Vajuta P, et j\u00E4tkata');
  } else if (state.mode === 'over') {
    const bits = [`${score()} meetrit`];
    if (state.dozens) bits.push(`${state.dozens} ${state.dozens > 1 ? 'tosinat' : 'tosin'} pakitud`);
    if (score() >= state.best && state.best > 0) bits.push('uus rekord!');

    const result = state.lastResult;
    if (result?.status === 'accepted' && result.rank) bits.push(`koht #${result.rank}`);

    let cta = state.deathTimer > 0 ? '' : 'Vajuta t\u00FChikut v\u00F5i puuduta, et k\u00FCpsetada uus partii';
    if (result?.status === 'pending') cta = 'Kontrollime tulemust\u2026';

    panel('Pl\u00E4rts!', bits.join(' \u00B7 '), cta);
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
