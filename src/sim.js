// The game rules: one room, one player, fixed 60 steps a second. No drawing and no browser APIs,
// so tools/solve.js can run the same code in node to prove every room can be finished.
(function (G) {
  'use strict';
  const T = 8, W = 40, H = 23, PW = 6, PH = 8;
  const RUN = 1.5, JUMP = 3.25, GRAV = 0.21, FALL = 2.8, SLIDE = 0.7, DASH = 4, DASH_T = 9, SPRING = 4.9;
  const C = (c) => c.charCodeAt(0);
  const AIR = C(' '), ROCK = C('#'), ICE = C('I'), CRUM = C('~'), CRYS = C('o'), CIN = C('*'), SPR = C('S');
  const SU = C('^'), SD = C('v'), SL = C('<'), SR = C('>');

  // A room is a list of ops, "<tile> x y [w h]", painted in order onto a 40 x 23 grid.
  // Tiles: # rock, I ice (a dash melts it), ~ crumbling stone, o dash crystal, * cinder, S spring,
  // ^ v < > spikes (the way they point), . air, P the spawn point.
  function makeRoom(def) {
    const grid = new Uint8Array(W * H).fill(AIR), dyn = new Int16Array(W * H).fill(-1);
    const room = { def, grid, dyn, ice: [], crum: [], crys: [], cin: [], spawn: { x: 12, y: 100 } };
    for (const op of def.ops) {
      const a = op.split(' '), x = +a[1], y = +a[2], w = +(a[3] || 1), h = +(a[4] || 1);
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        if (a[0] === 'P') room.spawn = { x: xx * T + 1, y: yy * T };
        else grid[yy * W + xx] = a[0] === '.' ? AIR : C(a[0]);
      }
    }
    for (let i = 0; i < W * H; i++) {
      const list = grid[i] === ICE ? room.ice : grid[i] === CRUM ? room.crum : grid[i] === CRYS ? room.crys : grid[i] === CIN ? room.cin : null;
      if (list) { dyn[i] = list.length; list.push(i); }
    }
    return room;
  }

  function makeState(room) {
    return {
      room, t: 0, dead: false, won: false, ev: [],
      ice: new Uint8Array(room.ice.length),   // 1: melted
      crum: new Int16Array(room.crum.length), // 0 whole, >0 shaking, <0 gone (counts up to 0)
      crys: new Int16Array(room.crys.length), // 0 ready, <0 used (counts up to 0)
      cin: new Uint8Array(room.cin.length),   // 1: picked up
      p: {
        x: room.spawn.x, y: room.spawn.y, rx: 0, ry: 0, vx: 0, vy: 0, face: 1, coy: 0, buf: 0, dashes: 1,
        dashT: 0, dashCd: 0, ddx: 0, ddy: 0, wj: 0, varJ: false, pj: true, pd: true, ground: false, wall: 0, slide: false,
      },
    };
  }

  function clone(st) {
    return {
      room: st.room, t: st.t, dead: st.dead, won: st.won, ev: [],
      ice: st.ice.slice(), crum: st.crum.slice(), crys: st.crys.slice(), cin: st.cin.slice(), p: Object.assign({}, st.p),
    };
  }

  // Outside the grid the edge tile repeats, so an opening in the border leads out of the room.
  function solidT(st, tx, ty) {
    if (tx < 0) tx = 0; else if (tx >= W) tx = W - 1;
    if (ty < 0) ty = 0; else if (ty >= H) ty = H - 1;
    const i = ty * W + tx, c = st.room.grid[i];
    if (c === ROCK) return true;
    if (c === ICE) return !st.ice[st.room.dyn[i]];
    if (c === CRUM) return st.crum[st.room.dyn[i]] >= 0;
    return false;
  }

  function collide(st, x, y) {
    const x0 = Math.floor(x / T), x1 = Math.floor((x + PW - 1) / T), y0 = Math.floor(y / T), y1 = Math.floor((y + PH - 1) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidT(st, tx, ty)) return true;
    return false;
  }

  function melt(st, x, y) {
    const x0 = Math.floor(x / T), x1 = Math.floor((x + PW - 1) / T), y0 = Math.floor(y / T), y1 = Math.floor((y + PH - 1) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
      const i = ty * W + tx;
      if (st.room.grid[i] === ICE && !st.ice[st.room.dyn[i]]) { st.ice[st.room.dyn[i]] = 1; st.ev.push({ k: 'ice', x: tx, y: ty }); }
    }
  }

  function blocked(st, x, y) {
    if (!collide(st, x, y)) return false;
    if (st.p.dashT > 0) { melt(st, x, y); return collide(st, x, y); }
    return true;
  }

  function moveX(st, amt) {
    const p = st.p;
    p.rx += amt;
    let m = Math.round(p.rx);
    if (!m) return;
    p.rx -= m;
    const s = m > 0 ? 1 : -1;
    while (m) {
      if (!blocked(st, p.x + s, p.y)) { p.x += s; m -= s; continue; }
      if (p.dashT > 0 && p.ddy === 0) { // a level dash slips past a corner it only just clips
        let k = 1;
        for (; k <= 3; k++) {
          if (!collide(st, p.x + s, p.y - k)) { p.y -= k; break; }
          if (!collide(st, p.x + s, p.y + k)) { p.y += k; break; }
        }
        if (k <= 3) continue;
      }
      p.vx = 0; p.rx = 0;
      break;
    }
  }

  function moveY(st, amt) {
    const p = st.p;
    p.ry += amt;
    let m = Math.round(p.ry);
    if (!m) return;
    p.ry -= m;
    const s = m > 0 ? 1 : -1;
    while (m) {
      if (!blocked(st, p.x, p.y + s)) { p.y += s; m -= s; continue; }
      if (s < 0) { // so does a jump that only just clips a ceiling corner
        let k = 1;
        for (; k <= 3; k++) {
          if (!collide(st, p.x - k, p.y - 1)) { p.x -= k; break; }
          if (!collide(st, p.x + k, p.y - 1)) { p.x += k; break; }
        }
        if (k <= 3) continue;
      }
      if (s > 0 && p.vy > 1.4) st.ev.push({ k: 'land' });
      p.vy = 0; p.ry = 0;
      break;
    }
  }

  const approach = (v, t, a) => (v < t ? Math.min(v + a, t) : Math.max(v - a, t));
  const hit = (p, x, y, w, h) => p.x < x + w && p.x + PW > x && p.y < y + h && p.y + PH > y;

  // inp: { x: -1|0|1, y: -1|0|1, jump: bool, dash: bool } (buttons as held; presses are found here)
  function step(st, inp) {
    const p = st.p, room = st.room;
    st.ev.length = 0;
    if (st.dead || st.won) return;
    st.t++;

    for (let i = 0; i < st.crum.length; i++) {
      let v = st.crum[i];
      if (v > 0) { if (++v > 18) { v = -150; st.ev.push({ k: 'crumble', x: room.crum[i] % W, y: (room.crum[i] / W) | 0 }); } }
      else if (v < 0) { v++; if (v === 0 && hit(p, (room.crum[i] % W) * T, ((room.crum[i] / W) | 0) * T, T, T)) v = -1; }
      st.crum[i] = v;
    }
    for (let i = 0; i < st.crys.length; i++) if (st.crys[i] < 0) st.crys[i]++;

    const jp = inp.jump && !p.pj, dp = inp.dash && !p.pd;
    p.pj = inp.jump; p.pd = inp.dash;
    const onG = p.vy >= 0 && collide(st, p.x, p.y + 1);
    p.ground = onG;
    if (onG) { p.coy = 6; if (p.dashT <= 0 && p.dashes < 1) { p.dashes = 1; st.ev.push({ k: 'refill' }); } }
    else if (p.coy > 0) p.coy--;
    if (jp) p.buf = 6; else if (p.buf > 0) p.buf--;
    if (p.dashCd > 0) p.dashCd--;
    if (inp.x) p.face = inp.x;

    if (dp && p.dashes > 0 && p.dashCd <= 0) {
      let dx = inp.x, dy = inp.y;
      if (!dx && !dy) dx = p.face;
      const n = dx && dy ? 0.7071 : 1;
      p.ddx = dx * n; p.ddy = dy * n;
      p.dashT = DASH_T; p.dashCd = 15; p.dashes--; p.varJ = false; p.wj = 0;
      st.ev.push({ k: 'dash' });
    }

    const dashing = p.dashT > 0;
    p.slide = false;
    if (dashing) {
      p.vx = p.ddx * DASH; p.vy = p.ddy * DASH;
    } else {
      const wall = collide(st, p.x + 1, p.y) ? 1 : collide(st, p.x - 1, p.y) ? -1 : 0;
      p.wall = wall;
      let acc = onG ? 0.3 : 0.17;
      if (p.wj > 0) { p.wj--; acc = 0.03; }
      if (Math.abs(p.vx) > RUN && Math.sign(p.vx) === inp.x) acc = 0.06;
      p.vx = approach(p.vx, inp.x * RUN, acc);
      p.slide = !onG && p.vy > 0 && wall !== 0 && inp.x === wall;
      if (!onG) p.vy = Math.min(p.vy + (inp.jump && Math.abs(p.vy) < 0.5 ? GRAV / 2 : GRAV), p.slide ? SLIDE : FALL);
      if (p.varJ && !inp.jump && p.vy < 0) { p.vy *= 0.45; p.varJ = false; }
      if (p.vy >= 0) p.varJ = false;
      if (p.buf > 0) {
        if (p.coy > 0) {
          p.vy = -JUMP; p.buf = 0; p.coy = 0; p.varJ = true;
          st.ev.push({ k: 'jump' });
        } else {
          const wd = collide(st, p.x + 2, p.y) ? 1 : collide(st, p.x - 2, p.y) ? -1 : 0;
          if (wd) {
            p.vy = -JUMP; p.vx = -wd * 2.2; p.wj = 7; p.buf = 0; p.varJ = true; p.face = -wd;
            st.ev.push({ k: 'wjump', d: wd });
          }
        }
      }
    }

    moveX(st, p.vx);
    if (p.x < 0) { p.x = 0; p.vx = 0; }
    moveY(st, p.vy);
    if (dashing && --p.dashT === 0) {
      p.vx = Math.sign(p.ddx) * 1.6;
      p.vy = p.ddy < 0 ? -1.2 : p.ddy > 0 ? 1.6 : 0;
    }

    // what the player is touching
    const x0 = Math.max(0, Math.floor(p.x / T)), x1 = Math.min(W - 1, Math.floor((p.x + PW - 1) / T));
    const y0 = Math.max(0, Math.floor(p.y / T)), y1 = Math.min(H - 1, Math.floor((p.y + PH - 1) / T));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const i = ty * W + tx, c = room.grid[i], px = tx * T, py = ty * T;
      if (c === AIR || c === ROCK) continue;
      if ((c === SU && p.vy >= 0 && hit(p, px + 1, py + 5, 6, 3)) || (c === SD && p.vy <= 0 && hit(p, px + 1, py, 6, 3)) ||
          (c === SL && p.vx >= 0 && hit(p, px + 5, py + 1, 3, 6)) || (c === SR && p.vx <= 0 && hit(p, px, py + 1, 3, 6))) {
        st.dead = true;
      } else if (c === SPR && p.vy >= 0 && hit(p, px, py + 4, 8, 4)) {
        p.vy = -SPRING; p.ry = 0; p.dashT = 0; p.dashes = 1; p.varJ = false; p.coy = 0;
        st.ev.push({ k: 'spring', x: tx, y: ty });
      } else if (c === CRYS && st.crys[room.dyn[i]] === 0 && p.dashes < 1) {
        p.dashes = 1; st.crys[room.dyn[i]] = -150;
        st.ev.push({ k: 'crystal', x: tx, y: ty });
      } else if (c === CIN && !st.cin[room.dyn[i]]) {
        st.cin[room.dyn[i]] = 1;
        st.ev.push({ k: 'cinder', x: tx, y: ty });
      }
    }
    if (p.vy >= 0 && collide(st, p.x, p.y + 1)) { // standing on crumbling stone starts it shaking
      const ty = Math.floor((p.y + PH) / T);
      if (ty >= 0 && ty < H) for (let tx = x0; tx <= x1; tx++) {
        const i = ty * W + tx;
        if (room.grid[i] === CRUM && st.crum[room.dyn[i]] === 0) st.crum[room.dyn[i]] = 1;
      }
    }
    if (p.y > H * T) st.dead = true;
    if (st.dead) { st.ev.push({ k: 'die' }); return; }
    if (p.y < 2 || p.x > W * T - PW) { st.won = true; st.ev.push({ k: 'win' }); }
  }

  Object.assign(G, { T, W, H, PW, PH, DASH_T, makeRoom, makeState, clone, step, solidT, tiles: { AIR, ROCK, ICE, CRUM, CRYS, CIN, SPR, SU, SD, SL, SR } });
})((globalThis.EC = globalThis.EC || {}));
