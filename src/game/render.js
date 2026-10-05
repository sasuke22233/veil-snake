import { PALETTE, turretAngle } from "./engine.js";
import { pointAt, samplePath } from "./path.js";
import envUrl from "../assets/env.jpg";
import headUrl from "../assets/head.png";
import mawUrl from "../assets/maw.png";

export const gfx = {
  env: new Image(),
  head: new Image(),
  maw: new Image(),
  ready: 0,
};
gfx.env.src = envUrl;
gfx.head.src = headUrl;
gfx.maw.src = mawUrl;
const onLoad = () => {
  gfx.ready += 1;
};
gfx.env.onload = onLoad;
gfx.head.onload = onLoad;
gfx.maw.onload = onLoad;

function drawEnv(ctx, w, h) {
  if (gfx.env.complete && gfx.env.naturalWidth) {
    const img = gfx.env;
    const ir = img.width / img.height;
    const cr = w / h;
    let dw, dh, dx, dy;
    if (ir > cr) {
      dh = h;
      dw = h * ir;
      dx = (w - dw) / 2;
      dy = 0;
    } else {
      dw = w;
      dh = w / ir;
      dx = 0;
      dy = (h - dh) * 0.15;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.fillStyle = "rgba(5,7,10,0.38)";
    ctx.fillRect(0, 0, w, h);
  } else {
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.35, 20, w * 0.5, h * 0.5, h * 0.8);
    bg.addColorStop(0, "#1a1028");
    bg.addColorStop(1, "#05070a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawGroove(ctx, path, width) {
  const pts = path.points;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(4, 6, 10, 0.72)";
  ctx.lineWidth = width + 10;
  ctx.stroke();
  ctx.strokeStyle = "rgba(155, 184, 201, 0.16)";
  ctx.lineWidth = width + 12;
  ctx.stroke();
  ctx.strokeStyle = "rgba(10, 8, 16, 0.88)";
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

function drawMaw(ctx, hole, pulse, warning, size) {
  ctx.save();
  const s = size * (1.05 + Math.sin(pulse) * 0.03 + warning * 0.08);
  if (gfx.maw.complete && gfx.maw.naturalWidth) {
    ctx.shadowColor = `rgba(196,30,58,${0.4 + warning * 0.5})`;
    ctx.shadowBlur = 28 + warning * 24;
    ctx.drawImage(gfx.maw, hole.x - s / 2, hole.y - s / 2, s, s);
  } else {
    ctx.fillStyle = "#c41e3a";
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawOrb(ctx, x, y, color, r) {
  const pal = PALETTE[color];
  ctx.save();
  ctx.shadowColor = pal.glow;
  ctx.shadowBlur = 14;
  const g = ctx.createRadialGradient(x - r * 0.32, y - r * 0.38, r * 0.08, x, y + r * 0.12, r);
  g.addColorStop(0, pal.hi);
  g.addColorStop(0.4, pal.fill);
  g.addColorStop(1, "#07080c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.arc(x, y, r * 0.62, 0.2, 1.4);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.28, y - r * 0.34, r * 0.28, r * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHead(ctx, x, y, tx, ty, r) {
  const ang = Math.atan2(ty, tx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.shadowColor = "rgba(196,30,58,0.7)";
  ctx.shadowBlur = 22;
  if (gfx.head.complete && gfx.head.naturalWidth) {
    const w = r * 5.6;
    const h = w * (gfx.head.height / gfx.head.width);
    ctx.drawImage(gfx.head, -w * 0.18, -h * 0.52, w, h);
  } else {
    ctx.fillStyle = "#1a1422";
    ctx.beginPath();
    ctx.ellipse(r * 0.8, 0, r * 1.8, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff1e32";
    ctx.beginPath();
    ctx.arc(r * 0.9, -r * 0.25, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSnake(ctx, state) {
  const balls = [...state.balls].sort((a, b) => (a.visS ?? a.s) - (b.visS ?? b.s));
  if (!balls.length) return;
  const vis = (b) => b.visS ?? b.s;
  const visible = balls.filter((b) => vis(b) > 2);
  if (!visible.length) return;

  const spine = samplePath(state.path, vis(visible[0]), vis(visible[visible.length - 1]), 8);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(spine[0].x, spine[0].y);
  for (let i = 1; i < spine.length; i++) ctx.lineTo(spine[i].x, spine[i].y);
  ctx.strokeStyle = "rgba(18, 14, 26, 0.85)";
  ctx.lineWidth = state.r * 1.55;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.strokeStyle = "rgba(90, 50, 120, 0.28)";
  ctx.lineWidth = state.r * 0.35;
  ctx.stroke();
  ctx.restore();

  const head = visible[visible.length - 1];
  for (const b of visible) {
    if (b === head) continue;
    const p = pointAt(state.path, vis(b));
    drawOrb(ctx, p.x, p.y, b.color, state.r);
  }
  const hp = pointAt(state.path, vis(head));
  drawOrb(ctx, hp.x, hp.y, head.color, state.r * 0.72);
  drawHead(ctx, hp.x, hp.y, hp.tx, hp.ty, state.r);
}

function drawTurret(ctx, state) {
  const { x, y } = state.turret;
  const ang = turretAngle(state);
  const r = state.r;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgba(5,7,10,0.55)";
  ctx.beginPath();
  ctx.ellipse(0, 18, r * 4.2, r * 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-r * 3.4, r * 1.6);
  ctx.lineTo(-r * 2.2, -r * 0.6);
  ctx.lineTo(r * 2.2, -r * 0.6);
  ctx.lineTo(r * 3.4, r * 1.6);
  ctx.closePath();
  const stone = ctx.createLinearGradient(0, -r, 0, r * 2);
  stone.addColorStop(0, "#2a2436");
  stone.addColorStop(1, "#0c0e14");
  ctx.fillStyle = stone;
  ctx.fill();
  ctx.strokeStyle = "rgba(155,184,201,0.28)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.save();
  ctx.rotate(ang);
  ctx.fillStyle = "#12151c";
  ctx.fillRect(r * 0.6, -r * 0.42, r * 3.1, r * 0.84);
  ctx.strokeStyle = "rgba(155,184,201,0.45)";
  ctx.strokeRect(r * 0.6, -r * 0.42, r * 3.1, r * 0.84);
  ctx.fillStyle = "#1a1020";
  ctx.fillRect(r * 3.4, -r * 0.28, r * 0.5, r * 0.56);
  ctx.restore();

  ctx.restore();
  drawOrb(ctx, x, y - r * 0.15, state.current, r * 0.92);

  const nx = x - r * 3.6;
  const ny = y + r * 0.35;
  drawOrb(ctx, nx, ny, state.next, r * 0.58);
}

function drawAim(ctx, state) {
  const ang = turretAngle(state);
  const { x, y } = state.turret;
  const m = state.r * 3.6;
  ctx.save();
  ctx.strokeStyle = "rgba(155,184,201,0.22)";
  ctx.setLineDash([5, 9]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(ang) * m, y + Math.sin(ang) * m);
  ctx.lineTo(state.mouse.x, state.mouse.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(196,30,58,0.75)";
  ctx.beginPath();
  ctx.arc(state.mouse.x, state.mouse.y, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(state.mouse.x - 10, state.mouse.y);
  ctx.lineTo(state.mouse.x + 10, state.mouse.y);
  ctx.moveTo(state.mouse.x, state.mouse.y - 10);
  ctx.lineTo(state.mouse.x, state.mouse.y + 10);
  ctx.stroke();
  ctx.restore();
}

export function render(ctx, state, motes, t, dpr = 1) {
  const { w, h } = state;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  drawEnv(ctx, w, h);

  for (const m of motes) {
    ctx.fillStyle = `rgba(155,184,201,${m.a})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const sx = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const sy = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  ctx.translate(sx, sy);

  drawGroove(ctx, state.path, state.r * 2.35);
  drawMaw(ctx, state.path.hole, t * 2.6, state.warning, state.r * 6.4);
  drawSnake(ctx, state);

  for (const p of state.projectiles) {
    if (p.trail) {
      for (let i = 0; i < p.trail.length; i++) {
        const q = p.trail[i];
        ctx.globalAlpha = (i / p.trail.length) * 0.35;
        drawOrb(ctx, q.x, q.y, p.color, state.r * 0.45);
      }
      ctx.globalAlpha = 1;
    }
    drawOrb(ctx, p.x, p.y, p.color, state.r * 0.92);
  }

  for (const ring of state.rings) {
    const pal = PALETTE[ring.color];
    ctx.strokeStyle = pal.hi;
    ctx.globalAlpha = Math.max(0, ring.life) * 0.7;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, (1 - ring.life) * 70 + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.fill;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawTurret(ctx, state);
  if (!state.mobile) drawAim(ctx, state);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.78);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(196,30,58,${state.flash * 0.22})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.warning > 0.4) {
    ctx.fillStyle = `rgba(196,30,58,${(state.warning - 0.4) * 0.22})`;
    ctx.fillRect(0, 0, w, h);
  }
}
