function catmullPoint(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

export function buildPath(w, h) {
  const mx = Math.max(52, Math.min(w, h) * 0.075);
  const top = Math.max(44, h * 0.09);
  const floor = h * 0.72;

  const waypoints = [
    { x: -60, y: top + 12 },
    { x: mx, y: top },
    { x: w * 0.46, y: top + 10 },
    { x: w - mx, y: top + 22 },
    { x: w - mx, y: h * 0.28 },
    { x: w * 0.58, y: h * 0.32 },
    { x: mx, y: h * 0.38 },
    { x: mx * 1.05, y: h * 0.54 },
    { x: w * 0.5, y: Math.min(floor - 36, h * 0.57) },
    { x: w - mx * 1.4, y: Math.min(floor - 18, h * 0.62) },
    { x: w - mx * 0.7, y: Math.min(floor - 6, h * 0.66) },
  ];

  const pts = [];
  let dist = 0;
  let prev = null;
  const n = waypoints.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = waypoints[Math.max(0, i - 1)];
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const p3 = waypoints[Math.min(n - 1, i + 2)];
    const steps = 32;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const p = catmullPoint(p0, p1, p2, p3, t);
      if (prev) dist += Math.hypot(p.x - prev.x, p.y - prev.y);
      pts.push({ x: p.x, y: p.y, s: dist });
      prev = p;
    }
  }
  const last = waypoints[n - 1];
  dist += Math.hypot(last.x - prev.x, last.y - prev.y);
  pts.push({ x: last.x, y: last.y, s: dist });

  return { points: pts, length: dist, spawn: pts[0], hole: pts[pts.length - 1] };
}

export function pointAt(path, s) {
  const pts = path.points;
  if (s <= 0) return { x: pts[0].x, y: pts[0].y, tx: 1, ty: 0 };
  if (s >= path.length) {
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: b.x, y: b.y, tx: dx / len, ty: dy / len };
  }
  let lo = 0;
  let hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].s < s) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const a = pts[i - 1];
  const b = pts[i];
  const span = b.s - a.s || 1;
  const t = (s - a.s) / span;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: a.x + dx * t,
    y: a.y + dy * t,
    tx: dx / len,
    ty: dy / len,
  };
}

export function samplePath(path, s0, s1, step = 10) {
  const out = [];
  const a = Math.min(s0, s1);
  const b = Math.max(s0, s1);
  for (let s = a; s <= b; s += step) out.push(pointAt(path, s));
  out.push(pointAt(path, b));
  return out;
}
