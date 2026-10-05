import { useEffect, useRef, useState } from "react";
import { createGame, resizeGame, update, shoot, swapBalls, PALETTE } from "./game/engine.js";
import { render } from "./game/render.js";
import { sfx } from "./game/audio.js";

export default function Game() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const motesRef = useRef([]);
  const [hud, setHud] = useState({
    score: 0,
    status: "menu",
    combo: 0,
    left: 0,
    next: 1,
    mobile: false,
  });

  const dprRef = useRef(1);

  const boot = () => {
    const c = canvasRef.current;
    const w = c.clientWidth;
    const h = c.clientHeight;
    const g = createGame(w, h);
    g.status = "play";
    stateRef.current = g;
    setHud({ score: 0, status: "play", combo: 0, left: g.balls.length, next: g.next, mobile: g.mobile });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let last = performance.now();
    let acc = 0;

    const fit = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      dprRef.current = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (stateRef.current) resizeGame(stateRef.current, w, h);
      else {
        const g = createGame(w, h);
        g.status = "menu";
        stateRef.current = g;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas.parentElement);

    motesRef.current = Array.from({ length: 48 }, () => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      r: Math.random() * 1.5,
      a: 0.03 + Math.random() * 0.07,
      v: 6 + Math.random() * 14,
    }));

    const loop = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const state = stateRef.current;
      if (state) {
        update(state, dt);
        for (const m of motesRef.current) {
          m.y -= m.v * dt;
          if (m.y < -4) {
            m.y = state.h + 4;
            m.x = Math.random() * state.w;
          }
        }
        render(ctx, state, motesRef.current, now / 1000, dprRef.current);
        acc += dt;
        if (acc > 0.1) {
          acc = 0;
          setHud((prev) => {
            if (prev.status === "menu") {
              return { ...prev, left: state.balls.length, mobile: state.mobile, next: state.next };
            }
            return {
              score: state.score,
              status: state.status,
              combo: state.comboTimer > 0 ? state.lastCombo : 0,
              left: state.balls.length,
              next: state.next,
              mobile: state.mobile,
            };
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e) => {
      const s = stateRef.current;
      if (!s) return;
      const p = pos(e);
      s.mouse.x = p.x;
      s.mouse.y = p.y;
    };
    const onDown = (e) => {
      if (e.button === 2) {
        e.preventDefault();
        if (stateRef.current) swapBalls(stateRef.current);
        return;
      }
      const s = stateRef.current;
      if (!s || s.status !== "play") return;
      const p = pos(e);
      s.mouse.x = p.x;
      s.mouse.y = p.y;
      if (shoot(s)) sfx.shoot();
    };
    const onKey = (e) => {
      const s = stateRef.current;
      if (!s) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (s.status === "play" && shoot(s)) sfx.shoot();
      }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyQ") swapBalls(s);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (hud.status === "lose") sfx.lose();
    if (hud.status === "win") sfx.win();
  }, [hud.status]);

  useEffect(() => {
    if (hud.combo >= 2) sfx.pop(hud.combo);
  }, [hud.combo, hud.score]);

  const nextColor = PALETTE[hud.next]?.fill || "#9bb8c9";

  return (
    <div className="stage">
      <canvas ref={canvasRef} />
      <div className="hud">
        <div className="hud-top">
          <div>
            veil · <strong>menace</strong>
          </div>
          <div>
            очки <strong>{hud.score}</strong>
          </div>
          <div>
            осталось <span className="blood">{hud.left}</span>
          </div>
        </div>
        {hud.combo >= 2 && <div className="combo show">combo ×{hud.combo}</div>}
        <div className="hint desktop-only">лкм — выстрел · пкм / shift — смена цвета</div>
      </div>

      {hud.status === "play" && (
        <button
          type="button"
          className="swap-btn"
          aria-label="Сменить цвет"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (stateRef.current) swapBalls(stateRef.current);
          }}
        >
          <span className="swap-orb" style={{ background: nextColor }} />
          <em>смена</em>
        </button>
      )}

      {hud.status !== "play" && (
        <div className="overlay">
          <div className="card">
            <div className="orn" />
            {hud.status === "menu" && (
              <>
                <h1>
                  VE<span>I</span>L
                </h1>
                <div className="sub">one red light in the fog</div>
                <p>
                  Змея ползёт из пещеры к алой норе. Стреляй в цепь. Три одного цвета — лопаются,
                  и она отползает назад. Не дай красным глазам дойти до ямы.
                </p>
                <button type="button" onClick={boot}>
                  войти в завесу
                </button>
              </>
            )}
            {hud.status === "lose" && (
              <>
                <h1>
                  NO<span>R</span>A
                </h1>
                <div className="sub">она доползла</div>
                <p>Красные глаза скрылись в яме. {hud.score} очков остались в тумане.</p>
                <button type="button" onClick={boot}>
                  ещё раз
                </button>
              </>
            )}
            {hud.status === "win" && (
              <>
                <h1>
                  VE<span>I</span>L
                </h1>
                <div className="sub">завеса пала</div>
                <p>Цепь разорвана. Нора голодна и пуста. {hud.score} очков.</p>
                <button type="button" onClick={boot}>
                  снова
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
