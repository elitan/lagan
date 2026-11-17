// The game around the rules: the loop, screens (title, album, controller setup, pause, ending), effects, saving.
(function (G) {
  'use strict';
  const { T, W, H, gfx, input, audio, LEVELS } = G;
  const { SW, SH, OY, label, disc, px, ITEMS } = gfx;
  const cv = document.getElementById('game'), ctx = cv.getContext('2d');
  cv.width = SW; cv.height = SH;
  ctx.imageSmoothingEnabled = false;
  function resize() {
    const s = Math.max(1, Math.floor(Math.min(innerWidth / SW, innerHeight / SH)));
    cv.style.width = SW * s + 'px'; cv.style.height = SH * s + 'px';
  }
  addEventListener('resize', resize); resize();

  const HINTS = ['D-PAD: MOVE    A: JUMP', 'B: DASH   HOLD A DIRECTION TO AIM IT', 'JUMP AGAIN AGAINST A WALL', 'A DASH BURNS THROUGH HAY', 'LANTERNS RELIGHT YOUR DASH'];
  // A run (room, deaths, frames, cin) starts over with a new game; the album and the best time are kept.
  const fresh = (old) => ({ room: 0, deaths: 0, frames: 0, cin: [], best: old ? old.best : null, album: old ? old.album : [] });
  let save = fresh();
  try { save = Object.assign(fresh(), JSON.parse(localStorage.getItem('lagan.save') || '{}')); } catch (e) { /* no storage */ }
  const store = () => { try { localStorage.setItem('lagan.save', JSON.stringify(save)); } catch (e) { /* no storage */ } };
  const clock = (f) => { const s = f / 60; return Math.floor(s / 60) + ':' + (s % 60).toFixed(2).padStart(5, '0'); };
  const found = () => save.album.filter(Boolean).length;

  let mode = 'title', back = 'title', modeT = 0, time = 0, menu = 0;
  let idx = 0, room = null, art = null, st = null;
  let parts = [], ghosts = [], hair = [], anim = {}, flakes = [];
  let shake = 0, freeze = 0, cardT = 0, endStats = null, vanX = -60;
  const look = { sx: 1, sy: 1, flash: 0, blink: false };

  const vig = document.createElement('canvas'); vig.width = SW; vig.height = SH;
  {
    const v = vig.getContext('2d'), g = v.createRadialGradient(SW / 2, SH / 2, 80, SW / 2, SH / 2, 210);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,20,.45)');
    v.fillStyle = g; v.fillRect(0, 0, SW, SH);
  }

  function loadRoom(i) {
    idx = i;
    room = G.makeRoom(LEVELS[i]);
    art = gfx.buildArt(room, LEVELS[i], i + 1);
    audio.setChapter(LEVELS[i].ch);
    flakes = [];
    const n = { petal: 30, firefly: 22, leaf: 36, snow: 70 }[art.pal.amb];
    for (let k = 0; k < n; k++) flakes.push({ x: Math.random() * SW, y: Math.random() * SH, z: 0.4 + Math.random() * 0.6, ph: Math.random() * 6, k });
    vanX = -60 - Math.random() * 200;
    respawn();
    cardT = 110;
  }
  function respawn() {
    st = G.makeState(room);
    if (save.cin[idx]) st.cin.fill(1);
    parts = []; ghosts = []; anim = {}; hair = [];
    for (let k = 0; k < 6; k++) hair.push({ x: st.p.x + 3, y: st.p.y + 1 });
    look.sx = 0.4; look.sy = 1.6; look.flash = 8;
    burst(st.p.x + 3, st.p.y + 4, 10, '#ffd27a', 1.2, 0);
  }
  function burst(x, y, n, col, sp, g, r) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.283, v = sp * (0.4 + Math.random() * 0.8), life = 14 + Math.random() * 16;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: g == null ? 0.08 : g, life, max: life, col, r: r || 0 });
    }
  }

  const BURNT = { ice: ['#c9f4ff', '#5fc9ee'], hay: ['#f6e08a', '#b8923a'], leaf: ['#ffc93c', '#c9521e'] };
  function effects() {
    const p = st.p, x = p.x + 3, y = p.y + 4, pal = art.pal;
    for (const e of st.ev) {
      const ex = e.x * T + 4, ey = e.y * T + 4;
      switch (e.k) {
        case 'jump': look.sx = 0.7; look.sy = 1.35; burst(x, p.y + 8, 4, pal.cap, 0.6); audio.sfx.jump(); break;
        case 'wjump': look.sx = 0.7; look.sy = 1.35; burst(x + e.d * 3, y, 5, pal.rockL, 0.7); audio.sfx.wjump(); break;
        case 'land': look.sx = 1.4; look.sy = 0.65; burst(x, p.y + 8, 5, pal.cap, 0.6); audio.sfx.land(); break;
        case 'dash': freeze = 2; shake = 3; look.sx = 1.3; look.sy = 0.8; burst(x, y, 8, '#ffb347', 1.4, 0); audio.sfx.dash(); break;
        case 'refill': look.flash = 4; audio.sfx.refill(); break;
        case 'crystal': look.flash = 6; freeze = 3; burst(ex, ey, 14, '#ffe58a', 1.8, 0); audio.sfx.crystal(); break;
        case 'spring': anim[e.y * W + e.x] = time; look.sx = 0.6; look.sy = 1.5; audio.sfx.spring(); break;
        case 'ice': shake = Math.max(shake, 3); freeze = 1; burst(ex, ey, 6, BURNT[pal.burn][0], 1.6, 0.12); burst(ex, ey, 3, BURNT[pal.burn][1], 1.2, 0.12); audio.sfx.ice(); break;
        case 'crumble': burst(ex, ey, 6, pal.plank === 'ice' ? '#bfe4f5' : '#b07a45', 0.8, 0.15); audio.sfx.crumble(); break;
        case 'cinder': burst(ex, ey, 18, '#ffe58a', 1.8, 0); burst(ex, ey, 8, '#ffffff', 1, 0); audio.sfx.cinder(); cardT = 0; break;
        case 'die':
          shake = 7; audio.sfx.die();
          if (p.y > H * T - 6 && pal.water) burst(x, H * T - 4, 22, '#bfe4ff', 2.4, 0.2);
          else { burst(x, y, 14, p.dashes ? '#ff8a30' : '#6fb7ff', 2.6, 0, 3); burst(x, y, 16, '#ffffff', 1.6, 0.05); }
          break;
        case 'win': audio.sfx.win(); break;
      }
    }
  }

  function play() {
    if (input.hit('start')) { mode = 'pause'; menu = 0; audio.sfx.menu(); return; }
    if (input.hit('select')) { respawn(); return; }
    save.frames++;
    if (freeze > 0) { freeze--; return; }
    const c = input.cur;
    G.step(st, { x: c.x, y: c.y, jump: c.a, dash: c.b });
    effects();
    const p = st.p;
    if (p.dashT > 0 && st.t % 2 === 0) ghosts.push({ x: p.x, y: p.y, life: 12 });
    if (p.slide && st.t % 4 === 0) burst(p.x + 3 + p.wall * 3, p.y + 6, 1, art.pal.rockL, 0.3);
    if (st.dead) { save.deaths++; store(); mode = 'dead'; modeT = 0; }
    else if (st.won) {
      if (st.cin.some((v) => v)) { save.cin[idx] = true; save.album[idx] = true; }
      mode = 'out'; modeT = 0;
    }
  }

  function ambient() {
    time++;
    if (shake > 0) shake--;
    if (cardT > 0) cardT--;
    look.sx += (1 - look.sx) * 0.2; look.sy += (1 - look.sy) * 0.2;
    if (look.flash > 0) look.flash--;
    look.blink = time % 190 < 6;
    for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += q.g; q.vx *= 0.96; q.life--; }
    parts = parts.filter((q) => q.life > 0);
    for (const g of ghosts) g.life--;
    ghosts = ghosts.filter((g) => g.life > 0);
    if (!st) return;
    const p = st.p, amb = art.pal.amb;
    let tx = p.x + 3, ty = p.y + 1;
    for (const h of hair) { h.x += (tx - h.x) * 0.55; h.y += (ty - h.y) * 0.55; tx = h.x - p.face * 0.6; ty = h.y - 1.6; }
    for (const f of flakes) {
      f.ph += 0.03;
      if (amb === 'snow') { f.x += -0.5 * f.z + Math.sin(f.ph) * 0.15; f.y += 0.4 * f.z; }
      else if (amb === 'leaf') { f.x += Math.sin(f.ph * 1.5) * 0.5 - 0.15; f.y += 0.32 * f.z; }
      else if (amb === 'petal') { f.x += 0.12 + Math.sin(f.ph) * 0.2; f.y += 0.14 * f.z; }
      else { f.x += Math.sin(f.ph * 1.3 + f.k) * 0.3; f.y += Math.cos(f.ph + f.k * 2) * 0.22; }
      if (f.y > SH) f.y = 0; if (f.y < 0) f.y = SH; if (f.x < 0) f.x += SW; if (f.x > SW) f.x -= SW;
    }
    vanX += 0.3;                                   // the post van comes by every half minute or so
    if (vanX > SW + 30) vanX = -500 - Math.random() * 300;
  }

  function pick(items) { // a menu: returns the chosen item once A or Start is pressed
    if (input.hitDir('y', 1)) { menu = (menu + 1) % items.length; audio.sfx.menu(); }
    if (input.hitDir('y', -1)) { menu = (menu + items.length - 1) % items.length; audio.sfx.menu(); }
    if (input.hit('a') || input.hit('start')) { audio.sfx.ok(); return items[menu]; }
    return null;
  }
  const titleItems = () => (save.room > 0 || save.frames > 0 ? ['CONTINUE', 'NEW GAME'] : ['START']).concat(['ALBUM'], input.padName() ? ['SET UP CONTROLLER'] : []);
  const pauseItems = () => ['RESUME', 'RETRY ROOM', 'MUSIC: ' + (audio.musicOn() ? 'ON' : 'OFF'), 'SET UP CONTROLLER', 'QUIT TO TITLE'];
  function bind(from) { back = from; input.startBind(); if (input.binding()) mode = 'bind'; }

  function update() {
    input.poll();
    ambient();
    modeT++;
    if (mode === 'title') {
      if (input.needsBind()) return bind('title');
      const c = pick(titleItems());
      if (c === 'SET UP CONTROLLER') bind('title');
      else if (c === 'ALBUM') { mode = 'album'; menu = 0; }
      else if (c) {
        if (c === 'NEW GAME') { save = fresh(save); store(); }
        if (save.room >= LEVELS.length) save.room = 0;
        loadRoom(save.room); mode = 'in'; modeT = 0;
      }
    } else if (mode === 'album') {
      const n = ITEMS.length;
      if (input.hitDir('x', 1)) { menu = (menu + 1) % n; audio.sfx.menu(); }
      if (input.hitDir('x', -1)) { menu = (menu + n - 1) % n; audio.sfx.menu(); }
      if (input.hitDir('y', 1) || input.hitDir('y', -1)) { menu = (menu + 7) % n; audio.sfx.menu(); }
      if (input.hit('a') || input.hit('b') || input.hit('start')) { mode = 'title'; menu = 0; audio.sfx.ok(); }
    } else if (mode === 'bind') {
      if (!input.binding()) { mode = back; menu = 0; }
      else if (!input.padName() || (modeT > 20 && input.hit('start'))) { input.cancelBind(); mode = back; }
    } else if (mode === 'play') play();
    else if (mode === 'pause') {
      if (input.needsBind()) return bind('pause');
      const c = pick(pauseItems());
      if (c === 'RESUME') mode = 'play';
      else if (c === 'RETRY ROOM') { respawn(); mode = 'play'; }
      else if (c && c.startsWith('MUSIC')) audio.toggleMusic();
      else if (c === 'SET UP CONTROLLER') bind('pause');
      else if (c === 'QUIT TO TITLE') { store(); mode = 'title'; menu = 0; }
    } else if (mode === 'dead') {
      if (modeT > 24) { respawn(); mode = 'play'; }
    } else if (mode === 'out') {
      if (modeT > 16) {
        if (idx + 1 >= LEVELS.length) {
          endStats = { frames: save.frames, deaths: save.deaths, record: save.best == null || save.frames < save.best };
          if (endStats.record) save.best = save.frames;
          save = fresh(save); store();
          mode = 'end'; modeT = 0;
        } else { save.room = idx + 1; store(); loadRoom(idx + 1); mode = 'in'; modeT = 0; }
      }
    } else if (mode === 'in') {
      if (modeT > 16) mode = 'play';
    } else if (mode === 'end') {
      if (modeT > 120 && (input.hit('start') || input.hit('a'))) { mode = 'title'; menu = 0; }
    }
  }

  const FLAKE = { leaf: ['#dc8c2a', '#c9521e', '#ffc93c'], petal: ['#ffffff', '#f7c8d8', '#ffffff'], snow: ['#ffffff'], firefly: ['#fff27a'] };
  function drawFlakes(front) {
    const amb = art.pal.amb, cols = FLAKE[amb];
    for (const f of flakes) {
      if (f.z >= 0.7 !== front) continue;
      const x = Math.round(f.x), y = Math.round(f.y);
      if (amb === 'firefly') {
        const a = 0.5 + 0.5 * Math.sin(f.ph * 3 + f.k);
        if (a > 0.5 && front) gfx.glow(ctx, x, y, 5, '#ffe36b', a * 0.5);
        ctx.globalAlpha = a;
      } else ctx.globalAlpha = front ? 0.8 : 0.4;
      px(ctx, cols[f.k % cols.length], x, y, amb === 'leaf' ? 2 : 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawRoom() {
    const p = st.p, pal = art.pal, ch = LEVELS[idx].ch, off = Math.round((p.x / (W * T)) * 16);
    const sx = shake ? Math.round((Math.random() - 0.5) * shake) : 0, sy = shake ? Math.round((Math.random() - 0.5) * shake) : 0;
    ctx.drawImage(art.bg, -off, 0);
    if (ch === 3) gfx.aurora(ctx, time, idx === 12 ? 1.5 : 0.7);
    if (vanX > -20) gfx.drawVan(ctx, Math.round(vanX), Math.round(art.nearY(vanX + off + 6)) + 1);
    ctx.save(); ctx.translate(sx, sy);
    drawFlakes(false);
    ctx.drawImage(art.fg, 0, -OY);
    gfx.drawDyn(ctx, st, time, anim, pal, idx);
    for (const g of ghosts) { ctx.globalAlpha = (g.life / 12) * 0.5; px(ctx, '#ffb347', g.x - 1, g.y - OY, 8, 8); }
    ctx.globalAlpha = 1;
    if (mode !== 'dead' && !st.won) gfx.drawPlayer(ctx, p, hair, look);
    if (pal.water) for (let tx = 0; tx < W; tx++) { // water where the floor is missing
      if (room.grid[(H - 1) * W + tx] === G.tiles.ROCK) continue;
      const top = 174 + Math.round(Math.sin(time * 0.05 + tx * 0.9));
      ctx.globalAlpha = 0.85; px(ctx, pal.water, tx * T, top, T, SH - top);
      ctx.globalAlpha = 0.9; px(ctx, '#dff2ff', tx * T + ((time >> 4) + tx) % 5, top, 3, 1);
    }
    for (const q of parts) {
      ctx.globalAlpha = Math.min(1, (q.life / q.max) * 1.5);
      if (q.r) disc(ctx, q.x, q.y - OY, Math.max(0, Math.round(q.r * (q.life / q.max))), q.col);
      else px(ctx, q.col, Math.round(q.x), Math.round(q.y) - OY);
    }
    ctx.globalAlpha = 1;
    drawFlakes(true);
    ctx.restore();
    ctx.drawImage(vig, 0, 0);
  }

  function hud() {
    const have = save.cin[idx] || st.cin.some((v) => v);
    ctx.globalAlpha = 0.9;
    label(ctx, 'ROOM ' + (idx + 1) + '/' + LEVELS.length + '  ' + art.pal.name, 5, 5, '#ffffff');
    if (room.cin.length) gfx.drawItem(ctx, idx, 5, 13, 1, have ? null : 'rgba(0,0,0,.45)');
    label(ctx, save.cin.filter(Boolean).length + '   X ' + save.deaths, 16, 15, '#fff0c8');
    label(ctx, clock(save.frames), SW - 5, 5, '#ffffff', 1, 2);
    ctx.globalAlpha = 1;
    if (HINTS[idx]) label(ctx, HINTS[idx], SW / 2, 26, '#fff0b0', 1, 1);
    if (cardT > 0) {
      ctx.globalAlpha = Math.min(1, cardT / 30);
      label(ctx, LEVELS[idx].name, SW / 2, 78, '#ffffff', 2, 1);
      ctx.globalAlpha = 1;
    }
  }
  function drawMenu(items, y) {
    items.forEach((it, i) => {
      label(ctx, it, SW / 2, y + i * 10, i === menu ? '#ffe36b' : '#c9c9d6', 1, 1);
      if (i === menu) label(ctx, '>', SW / 2 - gfx.textW(it) / 2 - 8 + ((time >> 4) & 1), y + i * 10, '#ffe36b');
    });
  }
  const dim = (a) => px(ctx, 'rgba(4,5,14,' + a + ')', 0, 0, SW, SH);

  function draw() {
    if (!st) loadRoom(Math.min(save.room, LEVELS.length - 1));
    if (mode === 'end') gfx.drawEnding(ctx, modeT); else drawRoom();
    if (mode === 'play' || mode === 'dead' || mode === 'in' || mode === 'out') hud();
    if (mode === 'out') { const h = Math.round((SH * Math.min(16, modeT)) / 16); px(ctx, '#05060d', 0, SH - h, SW, h); }
    if (mode === 'in') px(ctx, '#05060d', 0, 0, SW, Math.round(SH * (1 - Math.min(16, modeT) / 16)));
    if (mode === 'title') {
      dim(0.6);
      const lx = Math.round(SW / 2 - gfx.textW('LÅGAN', 6) / 2);
      gfx.glow(ctx, SW / 2, 40, 110, '#ff7a1c', 0.4);
      gfx.text(ctx, 'LÅGAN', lx + 2, 28, '#5a1408', 6);
      gfx.text(ctx, 'LÅGAN', lx, 26, '#ff8a30', 6);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 10, SW, 30 + Math.round(Math.sin(time * 0.05) * 3)); ctx.clip();
      gfx.text(ctx, 'LÅGAN', lx, 26, '#ffe36b', 6); ctx.restore();
      label(ctx, 'EN LITEN LÅGA. ETT SVENSKT ÅR.', SW / 2, 63, '#e9eefc', 1, 1);
      drawMenu(titleItems(), 78);
      gfx.drawPad(ctx, SW / 2 - 36, 120, input.cur, null, time);
      const pad = input.padName();
      label(ctx, pad ? 'CONTROLLER CONNECTED' : 'PRESS ANY BUTTON ON YOUR CONTROLLER', SW / 2, 154, pad ? '#7dffc8' : (time >> 5) & 1 ? '#ffffff' : '#9aa3b8', 1, 1);
      label(ctx, 'KEYBOARD: ARROWS  X JUMP  Z DASH  ENTER START  R RETRY', SW / 2, 163, '#8f9ab6', 1, 1);
      if (save.best != null) label(ctx, 'BEST ' + clock(save.best), SW / 2, 172, '#ffd9a0', 1, 1);
    } else if (mode === 'album') {
      dim(0.82);
      label(ctx, 'ALBUM', SW / 2, 12, '#ffe36b', 3, 1);
      label(ctx, found() + ' / ' + ITEMS.length, SW / 2, 34, '#c9c9d6', 1, 1);
      ITEMS.forEach((it, i) => {
        const x = 28 + (i % 7) * 40, y = 52 + Math.floor(i / 7) * 34;
        px(ctx, i === menu ? '#ffe36b' : '#3a3f58', x - 5, y - 5, 26, 26); px(ctx, '#161a2c', x - 4, y - 4, 24, 24);
        gfx.drawItem(ctx, i, x, y, 2, save.album[i] ? null : '#2a3048');
      });
      const got = save.album[menu];
      label(ctx, got ? ITEMS[menu].name : '???', SW / 2, 128, got ? '#ffffff' : '#7f8aa6', 2, 1);
      label(ctx, gfx.PAL[LEVELS[menu].ch].name + ' - ROOM ' + (menu + 1) + ' - ' + LEVELS[menu].name, SW / 2, 146, '#9aa3b8', 1, 1);
      label(ctx, 'ONE THING TO FIND IN EVERY ROOM.  B: BACK', SW / 2, 164, '#7f8aa6', 1, 1);
    } else if (mode === 'bind') {
      dim(0.8);
      const b = input.binding() || 'a';
      label(ctx, 'CONTROLLER SETUP', SW / 2, 30, '#ffe36b', 2, 1);
      label(ctx, 'PRESS THE ' + b.toUpperCase() + ' BUTTON', SW / 2, 62, '#ffffff', 2, 1);
      gfx.drawPad(ctx, SW / 2 - 36, 88, input.cur, b, time);
      label(ctx, 'A JUMPS, B DASHES. THIS IS ASKED ONCE PER CONTROLLER.', SW / 2, 136, '#9aa3b8', 1, 1);
      label(ctx, 'ENTER ON THE KEYBOARD SKIPS THIS', SW / 2, 146, '#7f8aa6', 1, 1);
    } else if (mode === 'pause') {
      dim(0.65);
      label(ctx, 'PAUSED', SW / 2, 40, '#ffffff', 3, 1);
      drawMenu(pauseItems(), 76);
      label(ctx, 'SELECT RETRIES A ROOM AT ANY TIME', SW / 2, 150, '#7f8aa6', 1, 1);
    } else if (mode === 'end') {
      label(ctx, 'HEMMA', SW / 2, 14, '#ffe36b', 4, 1);
      label(ctx, 'THE FLAME IS HOME. THE VILLAGE WAKES.', SW / 2, 42, '#ffffff', 1, 1);
      label(ctx, 'TIME ' + clock(endStats.frames) + '    DEATHS ' + endStats.deaths + '    ALBUM ' + found() + '/' + ITEMS.length, SW / 2, 56, '#ffe9c0', 1, 1);
      if (endStats.record) label(ctx, 'NEW BEST TIME!', SW / 2, 68, (time >> 3) & 1 ? '#7dffc8' : '#ffffff', 1, 1);
      if (modeT > 120 && (time >> 5) & 1) label(ctx, 'PRESS START', SW / 2, 82, '#c9c9d6', 1, 1);
    }
    if (!audio.ready() && (mode === 'title' || mode === 'pause') && (time >> 6) & 1) label(ctx, 'CLICK OR PRESS A KEY FOR SOUND', SW - 4, SH - 8, '#c9c9d6', 1, 2);
  }

  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(100, now - last); last = now;
    for (let n = 0; acc >= 1000 / 60 && n < 5; n++) { update(); acc -= 1000 / 60; }
    draw();
    requestAnimationFrame(frame);
  }
  const q = new URLSearchParams(location.search); // ?room=7 jumps straight to a room
  if (LEVELS[+q.get('room') - 1]) { loadRoom(+q.get('room') - 1); mode = 'play'; }
  requestAnimationFrame(frame);
  G.game = { goto: (n) => { loadRoom(n - 1); mode = 'play'; }, state: () => ({ mode, idx, st, save }), show: (m) => { mode = m; modeT = 0; menu = 0; endStats = endStats || { frames: 0, deaths: 0 }; } };
})((globalThis.EC = globalThis.EC || {}));
