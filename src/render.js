// Drawing: everything is painted in code onto a 320 x 180 canvas (no image files).
// A season (PAL) decides the sky, the ground, and what each game tile looks like.
(function (G) {
  'use strict';
  const { T, W, H, tiles: TL } = G;
  const SW = 320, SH = 180, OY = 4; // the room is 184 px tall: the top 4 px are above the screen

  // burn: what a dash burns through; plank: what crumbles; lamp: what relights the dash; amb: what drifts in the air
  const PAL = [
    { name: 'VÅR', sky: ['#6fa6d8', '#f6dcc0'], far: '#6c9aa0', near: '#3f7168', rock: '#737784', rockD: '#51545f', rockL: '#989dac', cap: '#93d15c', capS: '#5a9c3c',
      mote: '#ffffff', spike: ['#f1ffc8', '#86c552', '#2f6a2a'], burn: 'ice', plank: 'wood', lamp: 'lykta', spring: 'svamp', amb: 'petal', water: '#4f8fc0',
      flora: ['tussilago', 'vitsippa', 'snow', 'tuft', 'snow'], feat: ['postlada', 'holk'] },
    { name: 'SOMMAR', sky: ['#4f86d6', '#ffe6b4'], far: '#5f9a78', near: '#2f6a48', rock: '#77726d', rockD: '#524d49', rockL: '#9c958e', cap: '#74c84e', capS: '#3f8f33',
      mote: '#fff6c0', spike: ['#f1ffc8', '#86c552', '#2f6a2a'], burn: 'hay', plank: 'wood', lamp: 'lykta', spring: 'svamp', amb: 'firefly', water: '#3f86c8', lake: true,
      flora: ['prast', 'blaklocka', 'smorblomma', 'tuft', 'smultron', 'tuft'], feat: ['kubb', 'postlada', 'traskor', 'holk'] },
    { name: 'HÖST', sky: ['#59607e', '#edb67c'], far: '#9a6038', near: '#6e3f26', rock: '#676163', rockD: '#474244', rockL: '#8b8486', cap: '#dc8c2a', capS: '#a4501e',
      mote: '#ffd9a0', spike: ['#ffe0a8', '#c98a4a', '#5a3a22'], burn: 'leaf', plank: 'wood', lamp: 'moon', spring: 'svamp', amb: 'leaf', water: '#3d6f96', lit: true,
      flora: ['kantarell', 'leafpile', 'lingon', 'brownshroom', 'tuft'], feat: ['postlada', 'holk'] },
    { name: 'VINTER', sky: ['#070c28', '#1f3c70'], far: '#152548', near: '#1c3058', rock: '#3d4a6c', rockD: '#252e49', rockL: '#5a6b96', cap: '#eef6fc', capS: '#a9c6dd',
      mote: '#ffffff', spike: ['#ffffff', '#c9d6ee', '#8fa3c7'], burn: 'ice', plank: 'ice', lamp: 'star', spring: 'pad', amb: 'snow', lit: true, snow: true, stars: true,
      flora: ['mound', 'spruce', 'mound', 'none'], feat: ['spark', 'snolykta', 'pulka'] },
    { name: 'HEMÅT', sky: ['#2b3266', '#ffb48a'], far: '#3d4a72', near: '#2a3a52', rock: '#5f6474', rockD: '#3f4350', rockL: '#858b9e', cap: '#86c458', capS: '#4f8f3c',
      mote: '#ffe9d0', spike: ['#f1ffc8', '#86c552', '#2f6a2a'], burn: 'ice', plank: 'wood', lamp: 'lykta', spring: 'svamp', amb: 'petal', water: '#3f6fa8', lit: true, stars: true,
      flora: ['tussilago', 'vitsippa', 'snow', 'tuft'], feat: ['postlada'] },
  ];

  // 3 x 5 pixel font, one octal digit per row. Å Ä Ö are the base letter with a mark above it.
  const FONT = {
    A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755', I: '72227', J: '11152',
    K: '55655', L: '44447', M: '57755', N: '65555', O: '25552', P: '65644', Q: '25573', R: '65655', S: '34216', T: '72222',
    U: '55557', V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247', 0: '75557', 1: '26227', 2: '61247', 3: '61216',
    4: '55711', 5: '74616', 6: '34757', 7: '71222', 8: '75757', 9: '75716', ':': '02020', '.': '00002', '!': '22202',
    '-': '00700', '/': '11244', '+': '02720', '?': '61202', "'": '22000', ',': '00024', '>': '42124', '<': '12421',
  };
  const MARK = { 'Å': ['A', 2], 'Ä': ['A', 5], 'Ö': ['O', 5] };
  function text(ctx, s, x, y, col, sc) {
    sc = sc || 1;
    ctx.fillStyle = col;
    for (let ch of String(s)) {
      const m = MARK[ch];
      if (m) { ch = m[0]; for (let c = 0; c < 3; c++) if (m[1] & (4 >> c)) ctx.fillRect(x + c * sc, y - 2 * sc, sc, sc); }
      const g = FONT[ch];
      if (g) for (let r = 0; r < 5; r++) {
        const bits = +g[r];
        for (let c = 0; c < 3; c++) if (bits & (4 >> c)) ctx.fillRect(x + c * sc, y + r * sc, sc, sc);
      }
      x += 4 * sc;
    }
  }
  const textW = (s, sc) => String(s).length * 4 * (sc || 1) - (sc || 1);
  function label(ctx, s, x, y, col, sc, align) { // with a drop shadow; align 0 left, 1 centre, 2 right
    x = Math.round(x - (align ? textW(s, sc) * (align === 1 ? 0.5 : 1) : 0));
    text(ctx, s, x + (sc || 1), y + (sc || 1), 'rgba(0,0,0,.6)', sc);
    text(ctx, s, x, y, col, sc);
  }

  function rnd(x, y, s) {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s + 1, 982451653);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const px = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w || 1, h || 1); };
  function disc(ctx, cx, cy, r, col) {
    ctx.fillStyle = col;
    cx = Math.round(cx); cy = Math.round(cy);
    for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy + r * 0.6)); ctx.fillRect(cx - w, cy + dy, 2 * w + 1, 1); }
  }
  function glow(ctx, x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
  }

  // ---- the album: one thing to find in each room, 8 x 8 pixels each ----
  const INK = { w: '#ffffff', k: '#2a1a1e', y: '#ffd23c', o: '#f08a2c', r: '#d8302c', g: '#4fae3c', G: '#2f7a33', b: '#2f6fd0', n: '#9a6436', N: '#4a2c1c', t: '#dba95e', p: '#f7a8b8', s: '#9aa3b8' };
  const ITEMS = [
    ['TUSSILAGO', '..yyyy..|.yyooyy.|.yooooy.|.yyooyy.|..yyyy..|...nn...|...nn...|..gnng..'],
    ['STUDENTMÖSSA', '........|..wwww..|.wwwwww.|wwwwwwww|wwwybwww|kkkkkkkk|.kkkkkk.|........'],
    ['SMULTRON PÅ STRÅ', '......t.|.....rr.|....trr.|...rr...|..trr...|.rr.....|trr.....|t.......'],
    ['KALLES KAVIAR', '........|s.bbbbb.|sbbybybw|sbbyybbw|sbbybybw|s.bbbbb.|........|........'],
    ['PIGGELIN', '..gggg..|.gGgGgg.|.gGgGgg.|.gGgGgg.|.gGgGgg.|..gggg..|...tt...|...tt...'],
    ['MIDSOMMARKRANS', '..gywg..|.gg..gp.|yg....gg|g......w|w......g|gg....gy|.pg..gg.|..gwyg..'],
    ['KANELBULLE', '..nnnn..|.ntwttn.|nttnntwn|ntntwntn|nwnttntn|nttnnttn|.nttwtn.|..nnnn..'],
    ['KRÄFTA', 'r.r..r.r|rr....rr|.r.rr.r.|..rrrr..|.rkrrkr.|..rrrr..|..rrrr..|.rr..rr.'],
    ['KANTARELL', 'yyyyyyyy|yoyyyyoy|.yyyyyy.|..yooy..|..yooy..|...yy...|...yy...|..gyyg..'],
    ['LÖRDAGSGODIS', '.r.y.g..|.wpwpww.|.wpwpww.|.wpwpww.|.wpwpww.|.wpwpww.|.wpwpww.|.wwwwww.'],
    ['LUSSEKATT', '.yyy....|ykyy....|yyyy....|.yyyyyy.|....yyyy|....yyky|....yyy.|........'],
    ['JULMUST', '...yy...|...NN...|...NN...|..NNNN..|..rrrr..|..rwwr..|..rrrr..|..NNNN..'],
    ['PEPPARKAKA', '.nn..nn.|nnnnnnnn|nwnnnnwn|nnwnnwnn|.nnwwnn.|..nnnn..|...nn...|........'],
    ['DALAHÄST', '......r.|.....rrr|r...rr..|rrrrrr..|rybwyr..|rrrrrr..|rr..rr..|rr..rr..'],
  ].map(([name, rows]) => ({ name, rows: rows.split('|') }));
  function drawItem(ctx, i, x, y, sc, shade) { // shade: draw only the outline of something not found yet
    const it = ITEMS[i];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const ch = it.rows[r][c];
      if (ch !== '.') { ctx.fillStyle = shade || INK[ch]; ctx.fillRect(x + c * sc, y + r * sc, sc, sc); }
    }
  }

  const SPIKE = [[1, 4], [2, 4], [1, 5], [2, 5], [0, 6], [1, 6], [2, 6], [3, 6], [0, 7], [1, 7], [2, 7], [3, 7]];
  function spikes(ctx, x0, y0, c, col) {
    for (let k = 0; k < 2; k++) for (const [sx, sy] of SPIKE) {
      const x = sx + k * 4;
      const [dx, dy] = c === TL.SU ? [x, sy] : c === TL.SD ? [x, 7 - sy] : c === TL.SR ? [7 - sy, x] : [sy, x];
      px(ctx, sy >= 6 ? col[2] : sx === 2 ? col[1] : col[0], x0 + dx, y0 + dy);
    }
  }

  // ---- things in the backdrop: each is drawn standing on the ground at (x, y = its base line) ----
  function stuga(c, x, y, o) {
    px(c, '#b5362b', x, y - 8, 22, 8);
    px(c, '#f2efe6', x, y - 8, 1, 8); px(c, '#f2efe6', x + 21, y - 8, 1, 8);
    px(c, '#6a5a58', x + 15, y - 15, 2, 4);
    const roof = o.snow ? '#eef6fc' : '#3b3340';
    for (let i = 0; i < 5; i++) px(c, i === 0 && o.snow ? '#eef6fc' : roof, x - 1 + i * 2, y - 9 - i, 24 - i * 4, 1);
    if (o.snow) px(c, '#eef6fc', x + 14, y - 16, 4, 1);
    px(c, '#f2efe6', x + 9, y - 6, 4, 6); px(c, '#7a2a22', x + 10, y - 5, 2, 5);
    for (const wx of [3, 15]) { px(c, '#f2efe6', x + wx, y - 6, 4, 4); px(c, o.lit ? '#ffd86b' : '#33405c', x + wx + 1, y - 5, 2, 2); }
  }
  const PROPS = {
    stuga: { w: 22, h: 16, draw: stuga },
    ica: { w: 30, h: 16, draw(c, x, y) {
      px(c, '#e9e2d2', x, y - 9, 30, 9); px(c, '#4a4650', x - 1, y - 10, 32, 1);
      px(c, '#8fb7d6', x + 2, y - 7, 11, 5); px(c, '#8fb7d6', x + 20, y - 7, 8, 5); px(c, '#5a6a80', x + 15, y - 7, 3, 7);
      px(c, '#d8231f', x + 7, y - 17, 15, 7); text(c, 'ICA', x + 9, y - 16, '#ffffff');
    } },
    kiosk: { w: 20, h: 13, draw(c, x, y) {
      px(c, '#e7d36b', x, y - 8, 14, 8); px(c, '#3a3a48', x + 3, y - 6, 8, 3); px(c, '#7a5a3a', x + 2, y - 3, 10, 1);
      for (let i = 0; i < 8; i++) px(c, i % 2 ? '#ffffff' : '#d8302c', x - 1 + i * 2, y - 10, 2, 2);
      px(c, '#4a4650', x - 1, y - 11, 16, 1);
      px(c, '#8a8f9c', x + 18, y - 9, 1, 9); px(c, '#2b5fb8', x + 16, y - 13, 5, 5); px(c, '#d8302c', x + 17, y - 12, 3, 2); px(c, '#ffffff', x + 17, y - 10, 3, 1);
    } },
    telefon: { w: 6, h: 13, draw(c, x, y) {
      px(c, '#6f8f86', x, y - 13, 6, 13); px(c, '#a9d0de', x + 1, y - 10, 4, 7); px(c, '#f2c230', x, y - 13, 6, 2); px(c, '#2a2a33', x + 2, y - 8, 2, 3);
    } },
    flagga: { w: 11, h: 26, draw(c, x, y) {
      px(c, '#f2efe6', x, y - 26, 1, 26); px(c, '#f2c230', x, y - 27, 1, 1);
      px(c, '#2f6fd0', x + 1, y - 26, 10, 6); px(c, '#ffd23c', x + 4, y - 26, 2, 6); px(c, '#ffd23c', x + 1, y - 24, 10, 2);
    } },
    brevlador: { w: 14, h: 8, draw(c, x, y) {
      px(c, '#7a5a3a', x + 1, y - 5, 1, 5); px(c, '#7a5a3a', x + 12, y - 5, 1, 5); px(c, '#7a5a3a', x, y - 5, 14, 1);
      ['#f2c230', '#4fae3c', '#d8302c', '#e9e2d2'].forEach((col, i) => px(c, col, x + 1 + i * 3, y - 8, 2, 3));
    } },
    mjolkpall: { w: 10, h: 8, draw(c, x, y) {
      px(c, '#9a7a5a', x, y - 4, 10, 1); px(c, '#7a5a3a', x + 1, y - 3, 1, 3); px(c, '#7a5a3a', x + 8, y - 3, 1, 3);
      for (const k of [2, 6]) { px(c, '#c9d0da', x + k, y - 8, 2, 4); px(c, '#8f98a8', x + k, y - 9, 2, 1); }
    } },
    dass: { w: 7, h: 12, draw(c, x, y) {
      px(c, '#b5362b', x, y - 10, 7, 10); px(c, '#3b3340', x - 1, y - 11, 9, 1); px(c, '#3b3340', x, y - 12, 6, 1);
      px(c, '#f2efe6', x + 2, y - 8, 3, 8); px(c, '#b5362b', x + 3, y - 7, 1, 7); px(c, '#f2efe6', x + 2, y - 6, 1, 1); px(c, '#2a1a1e', x + 3, y - 6, 1, 1);
    } },
    majstang: { w: 13, h: 28, draw(c, x, y) {
      px(c, '#3f8f33', x + 6, y - 28, 1, 28); px(c, '#3f8f33', x, y - 22, 13, 1);
      px(c, '#3f8f33', x + 5, y - 26, 3, 1); px(c, '#3f8f33', x + 4, y - 25, 5, 1);
      for (const k of [0, 10]) { px(c, '#4fae3c', x + k, y - 21, 3, 1); px(c, '#4fae3c', x + k, y - 19, 3, 1); px(c, '#4fae3c', x + k, y - 20, 1, 1); px(c, '#4fae3c', x + k + 2, y - 20, 1, 1); }
      ['#ffd23c', '#ffffff', '#f7a8b8', '#2f6fd0'].forEach((col, i) => { px(c, col, x + 1 + i * 3, y - 23); px(c, col, x + 6, y - 6 - i * 4); });
    } },
    eld: { w: 14, h: 14, draw(c, x, y) { // the Valborg bonfire
      for (let i = 0; i < 6; i++) px(c, '#3a2a22', x + i, y - 1 - i, 14 - i * 2, 1);
      [[5, 6, 4, '#f08a2c'], [4, 8, 6, '#f08a2c'], [5, 10, 4, '#ffb347'], [6, 12, 3, '#ffd23c'], [6, 14, 1, '#fff6c8'], [8, 13, 1, '#ffd23c']].forEach(([dx, dy, w, col]) => px(c, col, x + dx, y - dy, w, 2));
      glow(c, x + 7, y - 8, 26, '#ff9a30', 0.5);
    } },
    dansbana: { w: 26, h: 15, draw(c, x, y) {
      px(c, '#9a7a5a', x, y - 2, 26, 2);
      for (let i = 0; i < 5; i++) px(c, '#f2efe6', x + 1 + i * 6, y - 10, 1, 8);
      px(c, '#b5362b', x - 1, y - 11, 28, 1); px(c, '#b5362b', x + 3, y - 12, 20, 1); px(c, '#b5362b', x + 8, y - 13, 10, 1); px(c, '#b5362b', x + 12, y - 15, 2, 2);
      ['#ffd23c', '#d8302c', '#4fae3c', '#2f6fd0', '#ffd23c', '#d8302c', '#4fae3c', '#2f6fd0'].forEach((col, i) => px(c, col, x + 2 + i * 3, y - 9));
    } },
    algskylt: { w: 7, h: 13, draw(c, x, y) {
      px(c, '#8a8f9c', x + 3, y - 7, 1, 7);
      for (let i = 0; i < 4; i++) { px(c, '#d8302c', x + 3 - i, y - 13 + i * 2 - (i ? 1 : 0), 1 + i * 2, 2); if (i) px(c, '#ffd23c', x + 4 - i, y - 13 + i * 2 - 1, i * 2 - 1, 2); }
      px(c, '#2a1a1e', x + 3, y - 9, 2, 1); px(c, '#2a1a1e', x + 2, y - 10, 1, 1);
    } },
    jakttorn: { w: 9, h: 18, draw(c, x, y) {
      px(c, '#7a5a3a', x + 1, y - 11, 1, 11); px(c, '#7a5a3a', x + 7, y - 11, 1, 11);
      for (let i = 0; i < 5; i++) { px(c, '#7a5a3a', x + 2 + i, y - 2 - i * 2); px(c, '#7a5a3a', x + 6 - i, y - 2 - i * 2); }
      px(c, '#9a7a5a', x, y - 16, 9, 5); px(c, '#2a1a1e', x + 2, y - 15, 5, 2); px(c, '#4a3a2a', x - 1, y - 17, 11, 1);
    } },
    kraftlyktor: { w: 34, h: 13, draw(c, x, y) { // crayfish-party lanterns on a line
      px(c, '#7a5a3a', x, y - 13, 1, 13); px(c, '#7a5a3a', x + 33, y - 13, 1, 13);
      for (let i = 1; i < 33; i++) px(c, '#3a2a22', x + i, y - 13 + Math.round(Math.sin((i / 33) * Math.PI) * 3));
      for (const k of [5, 13, 21, 29]) {
        const ly = y - 9 + Math.round(Math.sin((k / 33) * Math.PI) * 3);
        disc(c, x + k, ly, 2, '#ffe27a'); px(c, '#b8742a', x + k - 1, ly - 1); px(c, '#b8742a', x + k + 1, ly - 1); px(c, '#b8742a', x + k - 1, ly + 1, 3, 1);
        glow(c, x + k, ly, 9, '#ffcf5a', 0.35);
      }
    } },
    julbock: { w: 11, h: 11, draw(c, x, y) { // the straw goat
      px(c, '#e2b84a', x + 1, y - 7, 8, 3); px(c, '#e2b84a', x + 7, y - 10, 2, 4); px(c, '#e2b84a', x + 8, y - 11, 3, 2);
      for (const k of [1, 3, 6, 8]) px(c, '#e2b84a', x + k, y - 4, 1, 4);
      px(c, '#b8923a', x + 7, y - 12, 1, 1); px(c, '#b8923a', x + 6, y - 13, 1, 1);
      px(c, '#d8302c', x + 3, y - 7, 1, 3); px(c, '#d8302c', x + 6, y - 7, 1, 3); px(c, '#d8302c', x + 7, y - 9, 2, 1);
    } },
    bandymal: { w: 10, h: 7, draw(c, x, y) {
      px(c, '#d8302c', x, y - 7, 10, 1); px(c, '#d8302c', x, y - 7, 1, 7); px(c, '#d8302c', x + 9, y - 7, 1, 7);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) px(c, 'rgba(255,255,255,.6)', x + 1 + i * 2 + (j % 2), y - 5 + j * 2);
    } },
    volvo: { w: 17, h: 8, draw(c, x, y, o) {
      const col = ['#8a2a2e', '#2f4f7a', '#3f6a4a', '#c9b98a'][o.k % 4];
      px(c, '#c9d0da', x + 5, y - 9, 8, 1);                              // a roof box
      px(c, col, x + 3, y - 8, 12, 3); px(c, col, x, y - 5, 17, 3);
      px(c, '#a9d0de', x + 4, y - 7, 4, 2); px(c, '#a9d0de', x + 9, y - 7, 5, 2);
      px(c, '#f2efe6', x + 16, y - 4, 1, 1); px(c, '#d8302c', x, y - 4, 1, 1);
      px(c, '#1a1a22', x + 2, y - 2, 3, 2); px(c, '#1a1a22', x + 12, y - 2, 3, 2);
    } },
  };
  function drawVan(c, x, y) { // the yellow Posten van
    px(c, '#f2c230', x, y - 7, 9, 5); px(c, '#f2c230', x + 9, y - 5, 4, 3); px(c, '#f2c230', x + 9, y - 6, 2, 1);
    px(c, '#a9d0de', x + 9, y - 6, 2, 2); px(c, '#2b5fb8', x + 2, y - 6, 4, 2); px(c, '#ffd23c', x + 3, y - 5, 2, 1);
    px(c, '#1a1a22', x + 1, y - 2, 3, 2); px(c, '#1a1a22', x + 9, y - 2, 3, 2); px(c, '#fff6c8', x + 13, y - 4, 1, 1);
  }

  // ---- small things growing or left on the ground of the room itself (gy: the top of the ground) ----
  const GREEN = '#3f8f33';
  const flower = (c, x, gy, col, mid) => { px(c, GREEN, x + 3, gy - 3, 1, 3); px(c, col, x + 2, gy - 4, 3, 1); px(c, col, x + 3, gy - 5, 1, 3); px(c, mid, x + 3, gy - 4); };
  const FLORA = {
    none() {},
    tuft(c, x, gy, k) { px(c, GREEN, x + 1 + k, gy - 2, 1, 2); px(c, '#74c84e', x + 2 + k, gy - 3, 1, 3); px(c, GREEN, x + 3 + k, gy - 1, 1, 1); },
    tussilago(c, x, gy) { px(c, '#9a6436', x + 3, gy - 3, 1, 3); px(c, '#ffd23c', x + 2, gy - 4, 3, 1); px(c, '#ffd23c', x + 3, gy - 5, 1, 1); px(c, '#f08a2c', x + 3, gy - 4); },
    vitsippa(c, x, gy) { flower(c, x, gy, '#ffffff', '#ffd23c'); },
    prast(c, x, gy) { flower(c, x, gy, '#ffffff', '#ffd23c'); },
    blaklocka(c, x, gy) { px(c, GREEN, x + 3, gy - 4, 1, 4); px(c, '#6f8ff0', x + 4, gy - 4, 2, 2); px(c, '#6f8ff0', x + 1, gy - 3, 2, 2); },
    smorblomma(c, x, gy) { flower(c, x, gy, '#ffd23c', '#f08a2c'); },
    smultron(c, x, gy) { px(c, GREEN, x + 2, gy - 2, 4, 1); px(c, GREEN, x + 3, gy - 3, 2, 1); px(c, '#d8302c', x + 2, gy - 1); px(c, '#d8302c', x + 5, gy - 1); },
    snow(c, x, gy) { px(c, '#ffffff', x, gy - 1, 8, 1); px(c, '#ffffff', x + 2, gy - 2, 4, 1); px(c, '#ffffff', x, gy, 8, 2); },
    kantarell(c, x, gy) { px(c, '#ffc93c', x + 2, gy - 3, 4, 1); px(c, '#f0a82c', x + 3, gy - 2, 2, 2); },
    brownshroom(c, x, gy) { px(c, '#8a5a34', x + 2, gy - 4, 4, 1); px(c, '#8a5a34', x + 1, gy - 3, 6, 1); px(c, '#f2e6c8', x + 3, gy - 2, 2, 2); },
    leafpile(c, x, gy) { px(c, '#dc8c2a', x + 1, gy - 1, 6, 1); px(c, '#c9521e', x + 2, gy - 2, 4, 1); px(c, '#ffc93c', x + 3, gy - 3, 2, 1); },
    lingon(c, x, gy) { px(c, '#2f6a33', x + 1, gy - 2, 6, 2); px(c, '#d8302c', x + 2, gy - 2); px(c, '#d8302c', x + 5, gy - 1); px(c, '#d8302c', x + 4, gy - 3); },
    mound(c, x, gy) { px(c, '#eef6fc', x, gy - 1, 8, 1); px(c, '#eef6fc', x + 2, gy - 2, 5, 1); },
    spruce(c, x, gy) { for (let i = 0; i < 4; i++) px(c, '#1f4a3a', x + 3 - i, gy - 2 - (3 - i) * 2, 1 + i * 2, 2); px(c, '#4a2c1c', x + 3, gy - 1, 1, 1); px(c, '#eef6fc', x + 3, gy - 8, 1, 1); px(c, '#eef6fc', x + 2, gy - 6, 2, 1); px(c, '#eef6fc', x + 4, gy - 4, 2, 1); },
    // one of these per room
    postlada(c, x, gy) { px(c, '#8a8f9c', x + 3, gy - 5, 1, 5); px(c, '#f2c230', x + 1, gy - 9, 5, 4); px(c, '#2b5fb8', x + 2, gy - 8, 3, 1); px(c, '#c99a1c', x + 1, gy - 6, 5, 1); },
    holk(c, x, gy) { px(c, '#7a5a3a', x + 3, gy - 9, 1, 9); px(c, '#b5362b', x + 2, gy - 13, 4, 4); px(c, '#3b3340', x + 1, gy - 14, 6, 1); px(c, '#2a1a1e', x + 3, gy - 12, 1, 1); },
    kubb(c, x, gy) { for (const k of [0, 2, 6]) px(c, '#dba95e', x + k, gy - 3, 1, 3); px(c, '#dba95e', x + 4, gy - 5, 1, 5); px(c, '#b5362b', x + 4, gy - 4, 1, 1); },
    traskor(c, x, gy) { for (const k of [0, 4]) { px(c, '#dba95e', x + k, gy - 1, 3, 1); px(c, '#b5362b', x + k + 1, gy - 2, 2, 1); } },
    spark(c, x, gy) { px(c, '#8a8f9c', x - 1, gy - 1, 9, 1); px(c, '#b5362b', x + 4, gy - 4, 3, 1); px(c, '#7a5a3a', x + 6, gy - 8, 1, 7); px(c, '#7a5a3a', x + 4, gy - 3, 1, 2); px(c, '#7a5a3a', x + 5, gy - 8, 3, 1); },
    snolykta(c, x, gy) { px(c, '#eef6fc', x, gy - 2, 7, 2); px(c, '#eef6fc', x + 1, gy - 4, 5, 2); px(c, '#eef6fc', x + 2, gy - 5, 3, 1); px(c, '#ffd23c', x + 3, gy - 3, 1, 2); glow(c, x + 3, gy - 3, 8, '#ffcf5a', 0.5); },
    pulka(c, x, gy) { px(c, '#d8302c', x, gy - 2, 7, 2); px(c, '#d8302c', x + 6, gy - 3, 1, 1); px(c, '#8a1a1a', x, gy - 1, 7, 1); },
  };

  function trees(b, col, ridge, seed, big, birch) {
    for (let x = 2, n = 0; x < SW + 16; n++) {
      const th = Math.round((big ? 9 : 5) + rnd(n, 1, seed) * (big ? 9 : 5)), top = Math.round(ridge(x)) - th;
      if (birch && rnd(n, 2, seed) < 0.22) {
        px(b, '#e8e6dc', x, top + 3, 1, th - 2); disc(b, x, top + 3, 3, birch); disc(b, x + 1, top + 5, 2, birch);
      } else for (let k = 0; k < th; k++) { const half = Math.floor((k * (big ? 4 : 3)) / th); px(b, col, x - half, top + k, half * 2 + 1, 1); }
      x += Math.round(4 + rnd(n, 3, seed) * 7);
    }
  }

  // The parts of a room that never change: the backdrop, and the ground with what grows on it.
  function buildArt(room, def, seed) {
    const ch = def.ch, pal = PAL[ch], g = room.grid;
    const bg = canvas(SW + 16, SH), b = bg.getContext('2d');
    const grad = b.createLinearGradient(0, 0, 0, SH);
    grad.addColorStop(0, pal.sky[0]); grad.addColorStop(1, pal.sky[1]);
    b.fillStyle = grad; b.fillRect(0, 0, SW + 16, SH);
    if (pal.stars) for (let i = 0; i < 90; i++) {
      b.globalAlpha = 0.2 + rnd(i, 3, seed) * 0.7;
      px(b, '#ffffff', Math.floor(rnd(i, 1, seed) * (SW + 16)), Math.floor(rnd(i, 2, seed) * SH * (ch === 4 ? 0.45 : 0.7)));
    }
    b.globalAlpha = 1;
    const sun = (x, y, r, core, halo, a) => { glow(b, x, y, r * 6, halo, a); disc(b, x, y, r, core); };
    if (ch === 0) sun(250, 46, 7, '#fff8dc', '#fff0b0', 0.55);
    else if (ch === 1) sun(84, 104, 9, '#fff3c0', '#ffc070', 0.7);          // the midsummer sun that only dips
    else if (ch === 2) sun(232, 96, 8, '#ffe0b0', '#ff9a50', 0.5);
    else if (ch === 3) { disc(b, 262, 30, 6, '#f2f4ff'); disc(b, 265, 28, 5, pal.sky[0]); }  // a thin moon
    else glow(b, 170, 170, 150, '#ffb070', 0.6);

    const wave = (x, f, s) => Math.sin(x * f + s) * 0.5 + Math.sin(x * f * 2.7 + s * 3) * 0.3 + Math.sin(x * f * 6.1 + s * 7) * 0.2;
    const farY = (x) => SH - (88 + 30 * wave(x, 0.021, seed * 1.7)), nearY = (x) => SH - (50 + 22 * wave(x, 0.034, seed * 2.9 + 4));
    for (let x = 0; x < SW + 16; x++) px(b, pal.far, x, Math.round(farY(x)), 1, SH);
    trees(b, pal.far, farY, seed + 3, false, null);
    if (pal.lake) {
      const lg = b.createLinearGradient(0, 112, 0, SH);
      lg.addColorStop(0, '#bfe0f0'); lg.addColorStop(0.3, '#7fb6dc'); lg.addColorStop(1, '#4f86c0');
      b.fillStyle = lg; b.fillRect(0, 112, SW + 16, SH);
      for (let i = 0; i < 40; i++) { b.globalAlpha = 0.5; px(b, '#fff6d0', 60 + Math.floor(rnd(i, 5, seed) * 50) - i, 114 + Math.floor(rnd(i, 6, seed) * 30), 3 + (i % 4), 1); }
      b.globalAlpha = 1;
      const ex = 150 + Math.floor(rnd(1, 9, seed) * 120);                   // a rowing boat
      px(b, '#7a4a2a', ex, 124, 12, 2); px(b, '#5a3420', ex + 1, 126, 10, 1); px(b, '#e9e2d2', ex + 5, 122, 1, 2);
    }
    for (let x = 0; x < SW + 16; x++) {
      px(b, pal.near, x, Math.round(nearY(x)), 1, SH);
      if (pal.snow) { b.globalAlpha = 0.35; px(b, '#eef6fc', x, Math.round(nearY(x)), 1, 2); b.globalAlpha = 1; }
    }
    trees(b, pal.near, nearY, seed + 5, true, ch === 0 || ch === 1 ? (ch ? '#8fd060' : '#b4dc7a') : ch === 2 ? '#ffc93c' : null);

    // place the room's props along the near ridge, where the room's own rock does not hide them
    const open = (x, y, w, h) => {
      for (let ty = Math.floor((y + OY) / T); ty <= Math.floor((y + h + OY) / T); ty++) for (let tx = Math.floor((x - 8) / T); tx <= Math.floor((x + w - 8) / T); tx++) {
        if (tx < 0 || ty < 0 || tx >= W || ty >= H || g[ty * W + tx] === TL.ROCK) return false;
      }
      return true;
    };
    const placed = [];
    (def.bg || []).forEach((name, k) => {
      const p = PROPS[name];
      for (let n = 0; n < 60; n++) {
        const x = 12 + Math.floor(rnd(n, k, seed + 77) * (SW - p.w - 8)), y = Math.round(Math.max(nearY(x), nearY(x + p.w)));
        if (placed.some((q) => x < q[1] + 8 && q[0] < x + p.w + 8) || !open(x, y - p.h, p.w, p.h)) continue;
        px(b, pal.near, x - 1, y, p.w + 2, 8);
        p.draw(b, x, y, { lit: pal.lit, snow: pal.snow, k: seed + k });
        if (pal.lit && name === 'stuga') glow(b, x + 11, y - 4, 16, '#ffcf5a', 0.3);
        placed.push([x, x + p.w]);
        break;
      }
    });

    const fg = canvas(SW, H * T), c = fg.getContext('2d');
    const at = (x, y) => g[Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x))];
    const sol = (x, y) => at(x, y) === TL.ROCK;
    let feats = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = g[y * W + x], x0 = x * T, y0 = y * T;
      if (t === TL.SU || t === TL.SD || t === TL.SL || t === TL.SR) spikes(c, x0, y0, t, pal.spike);
      if (t !== TL.ROCK) continue;
      const up = sol(x, y - 1), dn = sol(x, y + 1), lf = sol(x - 1, y), rt = sol(x + 1, y);
      const inner = up && dn && lf && rt && sol(x - 1, y - 1) && sol(x + 1, y - 1) && sol(x - 1, y + 1) && sol(x + 1, y + 1);
      px(c, inner ? pal.rockD : pal.rock, x0, y0, T, T);
      for (let i = 0; i < 4; i++) {
        const r = rnd(x * 8 + i, y, seed);
        if (inner && r < 0.6) continue;
        c.globalAlpha = inner ? 0.25 : 0.55;
        px(c, r < 0.5 ? pal.rockD : pal.rockL, x0 + Math.floor(rnd(x, y * 8 + i, seed) * 7), y0 + Math.floor(rnd(x + i, y, seed + 9) * 7), r < 0.25 ? 2 : 1, 1);
      }
      c.globalAlpha = 1;
      if (!dn) px(c, pal.rockD, x0, y0 + 6, T, 2);
      if (!rt) px(c, pal.rockD, x0 + 7, y0, 1, T);
      if (!lf) px(c, pal.rockL, x0, y0, 1, T);
      if (!up && y > 0) { // grass, leaves or snow on top, and now and then something growing in it
        px(c, pal.cap, x0, y0, T, 2);
        for (let i = 0; i < T; i++) {
          const r = rnd(x * 8 + i, y, seed + 5);
          px(c, r < 0.35 ? pal.cap : pal.capS, x0 + i, y0 + 2);
          if (r < 0.12) px(c, pal.capS, x0 + i, y0 + 3);
        }
        if (!lf) c.clearRect(x0, y0, 1, 1);
        if (!rt) c.clearRect(x0 + 7, y0, 1, 1);
        if (at(x, y - 1) !== TL.AIR || y < 2 || Math.abs(x0 - room.spawn.x) < 10) continue;
        const r = rnd(x, y, seed + 31);
        if (feats < 2 && r > 0.9 && at(x, y - 2) === TL.AIR && sol(x - 1, y) && sol(x + 1, y)) FLORA[pal.feat[(seed + feats++) % pal.feat.length]](c, x0, y0);
        else if (r < 0.45) FLORA[pal.flora[Math.floor(rnd(x, y, seed + 32) * pal.flora.length)]](c, x0, y0, Math.floor(r * 9) % 3);
      }
    }
    return { bg, fg, pal, nearY };
  }

  // The northern lights: three slow curtains of light across the top of the sky.
  const STRIPS = ['93,255,170', '80,230,220', '176,120,255'].map((rgb) => {
    const s = canvas(1, 32), x = s.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 32);
    gr.addColorStop(0, 'rgba(' + rgb + ',0)'); gr.addColorStop(0.8, 'rgba(' + rgb + ',1)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = gr; x.fillRect(0, 0, 1, 32);
    return s;
  });
  function aurora(ctx, t, strength) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) for (let x = 0; x < SW; x += 2) {
      const w = Math.sin(x * 0.018 + t * 0.006 + k * 2) + Math.sin(x * 0.041 - t * 0.004 + k) * 0.6;
      ctx.globalAlpha = Math.max(0, strength * (0.13 + 0.1 * Math.sin(x * 0.07 + t * 0.017 + k * 3)));
      ctx.drawImage(STRIPS[k], 0, 0, 1, 32, x, Math.round(6 + k * 15 + w * 9), 2, Math.round(30 + 14 * Math.sin(x * 0.03 + t * 0.008 + k * 4)));
    }
    ctx.restore();
  }

  function lamp(ctx, kind, cx, cy) {
    if (kind === 'moon') { // a crayfish-party lantern
      px(ctx, '#3a2a22', cx, cy - 5, 1, 2); disc(ctx, cx, cy, 3, '#ffe27a');
      px(ctx, '#b8742a', cx - 2, cy - 1); px(ctx, '#b8742a', cx + 1, cy - 1); px(ctx, '#b8742a', cx - 1, cy + 1, 3, 1); px(ctx, '#b8742a', cx - 2, cy);
    } else if (kind === 'star') { // an advent star
      ['...y...', '...y...', 'yyyyyyy', '.yywyy.', '..yyy..', '.yy.yy.', 'y.....y'].forEach((row, r) => { for (let i = 0; i < 7; i++) if (row[i] !== '.') px(ctx, row[i] === 'w' ? '#ffffff' : '#ffd24a', cx - 3 + i, cy - 3 + r); });
    } else { // a lantern
      px(ctx, '#2a2a33', cx - 1, cy - 5, 2, 1); px(ctx, '#2a2a33', cx - 3, cy - 4, 6, 1); px(ctx, '#2a2a33', cx - 3, cy + 2, 6, 1);
      px(ctx, '#ffe58a', cx - 2, cy - 3, 4, 5); px(ctx, '#ffffff', cx - 1, cy - 1, 2, 3); px(ctx, '#2a2a33', cx - 3, cy - 3, 1, 5); px(ctx, '#2a2a33', cx + 2, cy - 3, 1, 5);
    }
  }

  // The things in a room that move or change.
  function drawDyn(ctx, st, time, anim, pal, item) {
    const room = st.room, g = room.grid;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, t = g[i], x0 = x * T, y0 = y * T - OY;
      if (t === TL.ICE) {
        if (st.ice[room.dyn[i]]) continue;
        if (pal.burn === 'hay') {
          px(ctx, '#e2c15a', x0, y0, T, T); px(ctx, '#f6e08a', x0, y0, T, 1); px(ctx, '#9a7a2e', x0, y0 + 7, T, 1); px(ctx, '#9a7a2e', x0 + 7, y0, 1, T);
          for (let k = 0; k < 4; k++) px(ctx, '#b8923a', x0 + Math.floor(rnd(x, y, k) * 5), y0 + 1 + k * 2 - (k > 2 ? 1 : 0), 3, 1);
        } else if (pal.burn === 'leaf') {
          px(ctx, '#b8642a', x0, y0, T, T); px(ctx, '#8a3a1e', x0, y0 + 7, T, 1); px(ctx, '#8a3a1e', x0 + 7, y0, 1, T);
          for (let k = 0; k < 6; k++) px(ctx, ['#e09a3a', '#8a3a1e', '#ffc93c'][k % 3], x0 + Math.floor(rnd(x, y, k) * 6), y0 + Math.floor(rnd(y, x, k) * 7), 2, 1);
        } else {
          px(ctx, '#5fc9ee', x0, y0, T, T); px(ctx, '#9ee6ff', x0, y0, T, 1); px(ctx, '#9ee6ff', x0, y0, 1, T);
          px(ctx, '#2f8fc4', x0, y0 + 7, T, 1); px(ctx, '#2f8fc4', x0 + 7, y0, 1, T);
          const k = Math.floor(rnd(x, y, 3) * 3);
          px(ctx, '#e8fbff', x0 + 2 + k, y0 + 2, 2, 1); px(ctx, '#e8fbff', x0 + 1 + k, y0 + 3); px(ctx, '#e8fbff', x0 + 5, y0 + 5 - k);
        }
      } else if (t === TL.CRUM) {
        const v = st.crum[room.dyn[i]];
        if (v < 0) { if (v > -30 && (v & 2)) px(ctx, 'rgba(255,255,255,.3)', x0 + 1, y0 + 1, 6, 1); continue; }
        const sx = x0 + (v > 0 ? Math.round(Math.sin(v * 2.3 + x)) : 0), sy = y0 + (v > 9 ? 1 : 0), ice = pal.plank === 'ice';
        px(ctx, ice ? '#bfe4f5' : '#b07a45', sx, sy, T, 5); px(ctx, ice ? '#f4fcff' : '#dba95e', sx, sy, T, 1); px(ctx, ice ? '#7fb2cf' : '#6d4526', sx, sy + 4, T, 1);
        px(ctx, ice ? '#7fb2cf' : '#6d4526', sx + 7, sy, 1, 5);                                       // the gap between two planks
        if (!ice && x % 2) px(ctx, '#6d4526', sx + 3, sy + 5, 2, 3);                                // a post under the jetty
        else if (ice) px(ctx, '#f4fcff', sx + 2 + (x % 3), sy + 2, 2, 1);
      } else if (t === TL.CRYS) {
        const cy = y0 + 4 + Math.round(Math.sin(time * 0.06 + x) * 1.5), cx = x0 + 4;
        if (st.crys[room.dyn[i]] < 0) { ctx.globalAlpha = 0.25; lamp(ctx, pal.lamp, cx, cy); ctx.globalAlpha = 1; continue; }
        glow(ctx, cx, cy, 16, '#ffcf5a', 0.5);
        lamp(ctx, pal.lamp, cx, cy);
      } else if (t === TL.CIN) {
        if (st.cin[room.dyn[i]]) continue;
        const cy = y0 + Math.round(Math.sin(time * 0.08 + x * 2) * 2);
        glow(ctx, x0 + 4, cy + 4, 15, '#fff0b0', 0.45 + 0.1 * Math.sin(time * 0.15));
        drawItem(ctx, item, x0, cy, 1);
      } else if (t === TL.SPR) {
        const a = anim[i] ? Math.max(0, 1 - (time - anim[i]) / 14) : 0, up = Math.round(a * 3);
        if (pal.spring === 'svamp') { // a fly agaric
          px(ctx, '#f2e6c8', x0 + 3, y0 + 4 - up, 2, 4 + up);
          px(ctx, '#d8302c', x0 + 1, y0 + 2 - up, 6, 1); px(ctx, '#d8302c', x0, y0 + 3 - up, 8, 2);
          px(ctx, '#ffffff', x0 + 2, y0 + 2 - up); px(ctx, '#ffffff', x0 + 5, y0 + 3 - up); px(ctx, '#ffffff', x0 + 1, y0 + 4 - up); px(ctx, '#ffffff', x0 + 6, y0 + 4 - up);
        } else {
          px(ctx, '#5a6b8c', x0 + 1, y0 + 7, 6, 1);
          for (let yy = y0 + 6 - up; yy < y0 + 7; yy += 2) px(ctx, '#9fb0cf', x0 + 2 + ((yy >> 1) & 1), yy, 3, 1);
          px(ctx, '#ff5d5d', x0, y0 + 4 - up, T, 2); px(ctx, '#ffb0a0', x0 + 1, y0 + 4 - up, 6, 1);
        }
      }
    }
  }

  // The player: a small flame. Orange with a dash ready, blue with it spent.
  const BODY = ['..1111..', '.111111.', '11111111', '11111111', '11111111', '11111111', '.111111.', '.11..11.'];
  function drawPlayer(ctx, p, hair, look) {
    const hot = p.dashes > 0, flash = look.flash > 0;
    const flame = flash ? '#ffffff' : hot ? '#ff6a1f' : '#3f8fe0', mid = flash ? '#ffffff' : hot ? '#ffa531' : '#7cc4ff';
    const core = flash ? '#ffffff' : hot ? '#ffe9a3' : '#e3f5ff';
    glow(ctx, p.x + 3, p.y + 4 - OY, 30, hot ? '#ff8a30' : '#4aa0ff', 0.4);
    for (let i = hair.length - 1; i >= 0; i--) disc(ctx, hair[i].x, hair[i].y - OY, i < 2 ? 3 : i < 4 ? 2 : 1, i < 3 ? mid : flame);
    const w = Math.round(8 * look.sx), h = Math.round(8 * look.sy), bx = p.x + 3 - (w >> 1), by = p.y + 8 - h - OY;
    for (let r = 0; r < h; r++) {
      const row = BODY[Math.min(7, Math.floor((r * 8) / h))];
      for (let c = 0; c < w; c++) if (row[Math.min(7, Math.floor((c * 8) / w))] === '1') px(ctx, r < h * 0.3 ? mid : core, bx + c, by + r);
    }
    const ey = by + Math.round(h * 0.42) + (p.vy > 1 ? 1 : p.vy < -1 ? -1 : 0), ex = bx + (w >> 1) + p.face;
    if (look.blink) { px(ctx, '#3a1a2a', ex - 2, ey + 1); px(ctx, '#3a1a2a', ex + 1, ey + 1); }
    else { px(ctx, '#3a1a2a', ex - 2, ey, 1, 2); px(ctx, '#3a1a2a', ex + 1, ey, 1, 2); }
  }

  // A picture of the controller that lights up with what is pressed (or with the button being asked for).
  function drawPad(ctx, x, y, inp, ask, time) {
    px(ctx, '#1b1b22', x - 1, y - 1, 74, 32); px(ctx, '#d6d3cb', x, y, 72, 30); px(ctx, '#2a2a33', x + 3, y + 6, 66, 21);
    px(ctx, '#8f8c86', x + 26, y + 8, 22, 3); px(ctx, '#8f8c86', x + 26, y + 13, 22, 3);
    const lit = (on, askIt) => (on ? '#ffe36b' : askIt && (time >> 3) & 1 ? '#ffffff' : null);
    const dp = (dx, dy, on) => px(ctx, on ? '#ffe36b' : '#0e0e13', x + 10 + dx * 5, y + 13 + dy * 5, 5, 5);
    dp(0, 0, false); dp(-1, 0, inp.x < 0); dp(1, 0, inp.x > 0); dp(0, -1, inp.y < 0); dp(0, 1, inp.y > 0);
    px(ctx, '#d6d3cb', x + 25, y + 18, 24, 7);
    px(ctx, lit(inp.select, ask === 'select') || '#0e0e13', x + 27, y + 20, 8, 3);
    px(ctx, lit(inp.start, ask === 'start') || '#0e0e13', x + 39, y + 20, 8, 3);
    disc(ctx, x + 55, y + 20, 3, lit(inp.b, ask === 'b') || '#d8302c');
    disc(ctx, x + 64, y + 20, 3, lit(inp.a, ask === 'a') || '#d8302c');
    text(ctx, 'B', x + 54, y + 9, '#d8302c'); text(ctx, 'A', x + 63, y + 9, '#d8302c');
  }

  // The ending: a village before dawn. t counts frames; the windows light up one cottage at a time.
  const VILLAGE = [[149, 0], [52, 70], [236, 110], [100, 150], [196, 185], [14, 220], [284, 250]];
  function drawEnding(ctx, t) {
    const gr = ctx.createLinearGradient(0, 0, 0, SH);
    gr.addColorStop(0, '#141a44'); gr.addColorStop(0.75, '#7a5a8a'); gr.addColorStop(1, '#ffb07a');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, SW, SH);
    for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.25 + rnd(i, 3, 9) * 0.6; px(ctx, '#ffffff', Math.floor(rnd(i, 1, 9) * SW), Math.floor(rnd(i, 2, 9) * 90)); }
    ctx.globalAlpha = 1;
    const hill = (x) => 176 - 62 * Math.sin((Math.PI * (x + 20)) / (SW + 40));
    for (let x = 0; x < SW; x++) px(ctx, '#1d2c3c', x, Math.round(hill(x)), 1, SH);
    trees(ctx, '#16222e', (x) => hill(x) + 2, 4, true, null);
    VILLAGE.forEach(([x, at], i) => {
      const y = Math.round(hill(x + 11)) + 1, lit = t > 40 + at;
      px(ctx, '#1d2c3c', x - 1, y, 24, 6);
      stuga(ctx, x, y, { lit, snow: false });
      if (lit) glow(ctx, x + 11, y - 4, i ? 20 : 34, '#ffcf5a', i ? 0.45 : 0.7);
    });
    px(ctx, '#f2efe6', 175, Math.round(hill(175)) - 26, 1, 27);
  }

  G.gfx = { SW, SH, OY, PAL, ITEMS, text, textW, label, disc, glow, px, buildArt, drawDyn, drawPlayer, drawPad, drawItem, drawVan, drawEnding, aurora, rnd };
})((globalThis.EC = globalThis.EC || {}));
