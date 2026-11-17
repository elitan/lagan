// Keyboard and gamepad as one NES pad: d-pad, A, B, Start, Select.
// USB NES pads number their buttons differently, so the first time a pad is seen the game asks
// for A, B, Start and Select once and remembers the answer per pad (localStorage).
(function (G) {
  'use strict';
  const KEYS = {
    ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
    KeyX: 'a', Space: 'a', KeyK: 'a', KeyZ: 'b', KeyJ: 'b', ShiftLeft: 'b', Enter: 'start', Escape: 'start', KeyR: 'select',
  };
  const NAMES = ['a', 'b', 'start', 'select'];
  const held = {};
  let binds = {};
  try { binds = JSON.parse(localStorage.getItem('lagan.pads') || '{}'); } catch (e) { /* no storage */ }

  addEventListener('keydown', (e) => {
    const k = KEYS[e.code];
    if (G.audio) G.audio.unlock();
    if (k && !e.metaKey && !e.ctrlKey) { held[k] = true; e.preventDefault(); }
  });
  addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) held[k] = false; });
  addEventListener('blur', () => { for (const k in held) held[k] = false; });
  addEventListener('pointerdown', () => G.audio && G.audio.unlock());

  function pad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }
  const down = (p, i) => i != null && p.buttons[i] && p.buttons[i].pressed;
  const defaults = (p) => (p.mapping === 'standard' ? { a: 1, b: 0, start: 9, select: 8 } : { a: 1, b: 2, start: 9, select: 8 });

  const cur = { x: 0, y: 0, a: false, b: false, start: false, select: false };
  let prev = Object.assign({}, cur), binding = null;

  function poll() {
    prev = Object.assign({}, cur);
    let l = !!held.l, r = !!held.r, u = !!held.u, d = !!held.d;
    let a = !!held.a, b = !!held.b, start = !!held.start, select = !!held.select;
    const p = pad();
    if (p) {
      if (p.axes[0] < -0.5 || down(p, 14)) l = true;
      if (p.axes[0] > 0.5 || down(p, 15)) r = true;
      if (p.axes[1] < -0.5 || down(p, 12)) u = true;
      if (p.axes[1] > 0.5 || down(p, 13)) d = true;
      if (p.mapping !== 'standard' && p.axes.length >= 10 && p.axes[9] <= 1.01) { // d-pad as a hat switch
        const h = Math.round((p.axes[9] + 1) * 3.5) % 8;
        if (h === 7 || h <= 1) u = true;
        if (h >= 1 && h <= 3) r = true;
        if (h >= 3 && h <= 5) d = true;
        if (h >= 5) l = true;
      }
      if (binding) {
        let first = -1;
        for (let i = 0; i < p.buttons.length; i++) if (p.buttons[i].pressed && (i < 12 || i > 15 || p.mapping !== 'standard')) { first = i; break; }
        if (first < 0) binding.armed = true;
        else if (binding.armed && !Object.values(binding.map).includes(first)) {
          binding.armed = false;
          binding.map[NAMES[binding.i++]] = first;
          if (G.audio) { G.audio.unlock(); G.audio.sfx.menu(); }
          if (binding.i >= NAMES.length) {
            binds[p.id] = binding.map;
            try { localStorage.setItem('lagan.pads', JSON.stringify(binds)); } catch (e) { /* no storage */ }
            binding = null;
          }
        }
      } else {
        const m = binds[p.id] || defaults(p);
        if (down(p, m.a)) a = true;
        if (down(p, m.b)) b = true;
        if (down(p, m.start)) start = true;
        if (down(p, m.select)) select = true;
        if ((a || b || start) && G.audio) G.audio.unlock();
      }
    } else if (binding) binding = null;
    cur.x = (r ? 1 : 0) - (l ? 1 : 0);
    cur.y = (d ? 1 : 0) - (u ? 1 : 0);
    cur.a = a; cur.b = b; cur.start = start; cur.select = select;
    return cur;
  }

  G.input = {
    poll, cur,
    hit: (k) => !!cur[k] && !prev[k],                       // pressed this frame
    hitDir: (k, v) => cur[k] === v && prev[k] !== v,
    padName: () => { const p = pad(); return p ? p.id : null; },
    needsBind: () => { const p = pad(); return !!p && !binds[p.id] && !binding; },
    startBind: () => { if (pad()) binding = { i: 0, map: {}, armed: false }; },
    cancelBind: () => { const p = pad(); if (p && !binds[p.id]) binds[p.id] = defaults(p); binding = null; },
    binding: () => (binding ? NAMES[binding.i] : null),
  };
})((globalThis.EC = globalThis.EC || {}));
