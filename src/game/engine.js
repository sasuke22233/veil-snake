import { buildPath, pointAt } from "./path.js";

export const PALETTE = [
  { fill: "#c41e3a", hi: "#ff7a8a", glow: "rgba(196,30,58,0.55)", name: "blood" },
  { fill: "#5c8ea6", hi: "#d4eef8", glow: "rgba(155,184,201,0.5)", name: "ice" },
  { fill: "#6a3488", hi: "#d4a0ff", glow: "rgba(168,85,247,0.45)", name: "violet" },
  { fill: "#66707c", hi: "#e5e7eb", glow: "rgba(156,163,175,0.4)", name: "ash" },
  { fill: "#343b63", hi: "#9aa8e8", glow: "rgba(90,100,170,0.45)", name: "dusk" },
];

let uid = 1;
const nid = () => uid++;
const rand = (n) => (Math.random() * n) | 0;

export function layout(w, h) {
  const s = Math.min(w / 1000, h / 740);
  const r = Math.round(Math.max(12, Math.min(21, 17.5 * Math.max(s, 0.72))));
  const bottom = Math.max(70, Math.min(118, 88 * Math.max(s, 0.8)));
  const safe = 10;
  return {
    r,
    spacing: r * 2.04,
    turret: { x: w * 0.5, y: h - bottom - safe },
    mobile: w < 760 || h < 540,
  };
}

function rollColor(nColors, prev, prev2) {
  let c = rand(nColors);
  let guard = 0;
  while (c === prev && c === prev2 && guard++ < 8) c = rand(nColors);
  return c;
}

function packGroup(group, spacing) {
  group.sort((a, b) => a.s - b.s);
  for (let i = 1; i < group.length; i++) {
    const minS = group[i - 1].s + spacing;
    if (group[i].s < minS) group[i].s = minS;
  }
}

function groupsOf(balls, spacing) {
  if (!balls.length) return [];
  const sorted = [...balls].sort((a, b) => a.s - b.s);
  const groups = [];
  let g = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].s - sorted[i - 1].s <= spacing * 1.5) g.push(sorted[i]);
    else {
      groups.push(g);
      g = [sorted[i]];
    }
  }
  groups.push(g);
  return groups;
}

function findRuns(balls, spacing) {
  const sorted = [...balls].sort((a, b) => a.s - b.s);
  const runs = [];
  let start = 0;
  for (let i = 1; i <= sorted.length; i++) {
    const connected =
      i < sorted.length &&
      sorted[i].color === sorted[i - 1].color &&
      sorted[i].s - sorted[i - 1].s <= spacing * 1.5;
    if (!connected) {
      if (i - start >= 3) runs.push(sorted.slice(start, i).map((b) => b.id));
      start = i;
    }
  }
  return runs;
}

export function createGame(w, h) {
  const path = buildPath(w, h);
  const L = layout(w, h);
  const nColors = 4;
  const count = 54;
  const balls = [];
  let prev = -1;
  let prev2 = -1;
  const headStart = path.length * 0.24;
  for (let i = 0; i < count; i++) {
    const color = rollColor(nColors, prev, prev2);
    const s = headStart - i * L.spacing;
    balls.push({ id: nid(), color, s, visS: s });
    prev2 = prev;
    prev = color;
  }

  return {
    w,
    h,
    path,
    balls,
    projectiles: [],
    particles: [],
    rings: [],
    r: L.r,
    spacing: L.spacing,
    turret: { ...L.turret },
    mobile: L.mobile,
    current: rand(nColors),
    next: rand(nColors),
    nColors,
    status: "play",
    score: 0,
    combo: 1,
    comboTimer: 0,
    lastCombo: 0,
    speed: 34,
    time: 0,
    shake: 0,
    mouse: { x: w * 0.5, y: L.turret.y - 140 },
    flash: 0,
    warning: 0,
    recoil: 0,
  };
}

export function resizeGame(state, w, h) {
  const oldLen = state.path.length;
  state.w = w;
  state.h = h;
  state.path = buildPath(w, h);
  const scale = state.path.length / (oldLen || 1);
  for (const b of state.balls) {
    b.s *= scale;
    b.visS *= scale;
  }
  const L = layout(w, h);
  state.r = L.r;
  state.spacing = L.spacing;
  state.turret = { ...L.turret };
  state.mobile = L.mobile;
}

function spawnParticles(state, x, y, color, n = 18) {
  const pal = PALETTE[color];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 50 + Math.random() * 240;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 30,
      life: 0.4 + Math.random() * 0.5,
      max: 0.85,
      r: 1.6 + Math.random() * 3.4,
      fill: pal.hi,
    });
  }
  state.rings.push({ x, y, life: 1, color, r: 8 });
}

function explodeRuns(state, runs) {
  if (!runs.length) return 0;
  const kill = new Set(runs.flat());
  let removed = 0;
  let minS = Infinity;
  state.balls = state.balls.filter((b) => {
    if (!kill.has(b.id)) return true;
    const p = pointAt(state.path, b.s);
    spawnParticles(state, p.x, p.y, b.color);
    minS = Math.min(minS, b.s);
    removed++;
    return false;
  });
  const gained = removed * 10 * state.combo;
  state.score += gained;
  state.lastCombo = state.combo;
  state.combo += 1;
  state.comboTimer = 1;
  state.shake = Math.min(14, 4 + removed * 0.8);
  state.flash = 0.22;
  state.recoil += removed * state.spacing * 0.95 + 28;
  return removed;
}

function tryMatches(state) {
  return explodeRuns(state, findRuns(state.balls, state.spacing));
}

function insertBall(state, color, hit, proj) {
  const p = pointAt(state.path, hit.s);
  const ahead = (proj.x - p.x) * p.tx + (proj.y - p.y) * p.ty > 0;
  const newS = hit.s + (ahead ? state.spacing * 0.55 : -state.spacing * 0.55);
  state.balls.push({ id: nid(), color, s: newS, visS: newS });
  const groups = groupsOf(state.balls, state.spacing);
  for (const g of groups) packGroup(g, state.spacing);
  state.combo = 1;
  tryMatches(state);
}

export function turretAngle(state) {
  const t = state.turret;
  let ang = Math.atan2(state.mouse.y - t.y, state.mouse.x - t.x);
  if (state.mouse.y > t.y - 6) ang = state.mouse.x < t.x ? Math.PI : 0;
  return ang;
}

export function shoot(state) {
  if (state.status !== "play") return false;
  if (state.projectiles.length >= 2) return false;
  const t = state.turret;
  const ang = turretAngle(state);
  const speed = Math.min(state.w, state.h) * 1.15 + 520;
  const muzzle = state.r * 3.2;
  state.projectiles.push({
    x: t.x + Math.cos(ang) * muzzle,
    y: t.y + Math.sin(ang) * muzzle,
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    color: state.current,
    trail: [],
  });
  state.current = state.next;
  state.next = rand(state.nColors);
  return true;
}

export function swapBalls(state) {
  const c = state.current;
  state.current = state.next;
  state.next = c;
}

export function update(state, dt) {
  dt = Math.min(dt, 0.033);
  const lerp = 1 - Math.pow(0.0008, dt);

  if (state.status !== "play") {
    for (const p of state.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const r of state.rings) r.life -= dt * 1.4;
    state.rings = state.rings.filter((r) => r.life > 0);
    return;
  }

  state.time += dt;
  state.speed = 32 + Math.min(30, state.time * 0.48);
  if (state.time > 42) state.nColors = 5;
  state.shake = Math.max(0, state.shake - dt * 16);
  state.flash = Math.max(0, state.flash - dt * 0.9);
  if (state.comboTimer > 0) state.comboTimer -= dt;
  else state.combo = 1;

  if (state.recoil > 0) {
    const pull = Math.min(state.recoil, (210 + state.speed) * dt);
    state.recoil -= pull;
    for (const b of state.balls) b.s -= pull;
  } else {
    const groups = groupsOf(state.balls, state.spacing);
    const crawl = state.speed * dt;
    const collapse = state.speed * 4.4 * dt;
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const extra = gi === groups.length - 1 ? 0 : collapse;
      for (const b of g) b.s += crawl + extra;
      packGroup(g, state.spacing);
    }
  }

  state.balls.sort((a, b) => a.s - b.s);
  tryMatches(state);

  for (const b of state.balls) {
    if (b.visS === undefined) b.visS = b.s;
    b.visS += (b.s - b.visS) * lerp * 1.35;
  }

  for (const proj of state.projectiles) {
    proj.trail.push({ x: proj.x, y: proj.y });
    if (proj.trail.length > 8) proj.trail.shift();
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
  }

  const hitR = (state.r * 2) * (state.r * 2);
  let hitEvent = null;
  for (const proj of state.projectiles) {
    let best = null;
    let bestD = hitR;
    for (const b of state.balls) {
      if (b.s < 8) continue;
      const p = pointAt(state.path, b.s);
      const d = (proj.x - p.x) ** 2 + (proj.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (best) {
      hitEvent = { proj, hit: best };
      break;
    }
  }
  if (hitEvent) {
    state.projectiles = state.projectiles.filter((p) => p !== hitEvent.proj);
    insertBall(state, hitEvent.proj.color, hitEvent.hit, hitEvent.proj);
  }

  state.projectiles = state.projectiles.filter(
    (p) => p.x > -50 && p.y > -50 && p.x < state.w + 50 && p.y < state.h + 50
  );

  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 90 * dt;
    p.vx *= 0.99;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const r of state.rings) r.life -= dt * 1.35;
  state.rings = state.rings.filter((r) => r.life > 0);

  const head = state.balls[state.balls.length - 1];
  if (head) {
    const remain = state.path.length - head.s;
    state.warning = remain < 160 ? 1 - remain / 160 : 0;
    if (head.s >= state.path.length - 10) {
      state.status = "lose";
      for (const b of state.balls) {
        const p = pointAt(state.path, b.s);
        spawnParticles(state, p.x, p.y, b.color, 7);
      }
    }
  }
  if (state.balls.length === 0) state.status = "win";
}
