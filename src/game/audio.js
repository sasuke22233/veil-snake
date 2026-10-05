let ctx;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function beep({ freq, dur, type = "sine", gain = 0.05, slide = 0 }) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

export const sfx = {
  shoot() {
    beep({ freq: 420, dur: 0.07, type: "triangle", gain: 0.04, slide: -180 });
  },
  pop(combo = 1) {
    beep({ freq: 220 + combo * 90, dur: 0.12, type: "sine", gain: 0.06, slide: 140 });
  },
  lose() {
    beep({ freq: 180, dur: 0.45, type: "sawtooth", gain: 0.04, slide: -120 });
  },
  win() {
    beep({ freq: 360, dur: 0.18, type: "sine", gain: 0.05, slide: 200 });
    setTimeout(() => beep({ freq: 540, dur: 0.28, type: "sine", gain: 0.05 }), 120);
  },
};
