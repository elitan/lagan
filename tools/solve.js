// Proves every room can be finished: a breadth-first search over the real game rules (src/sim.js).
//   node tools/solve.js            all rooms, exit only and exit with the cinder
//   node tools/solve.js 5 --map    one room (1-based), and print its grid
// The search is guided towards the exit, holds each input for a few frames and merges near-identical states, so "no route"
// can be wrong, but a route it finds is real.
require('../src/sim.js');
require('../src/levels.js');
const G = globalThis.EC;
const { W, H } = G;

// q: how coarsely states are merged (2: position to 2 px, speed to 1 px a frame; 1: twice as fine)
function key(st, q) {
  const p = st.p;
  let d = 7;
  for (let i = 0; i < st.ice.length; i++) d = (d * 31 + st.ice[i]) % 65521;
  for (let i = 0; i < st.crys.length; i++) d = (d * 31 + (st.crys[i] < 0 ? 1 : 0)) % 65521;
  for (let i = 0; i < st.crum.length; i++) d = (d * 31 + (st.crum[i] < 0 ? 2 : st.crum[i] > 0 ? 1 : 0)) % 65521;
  for (let i = 0; i < st.cin.length; i++) d = (d * 31 + st.cin[i]) % 65521;
  const vx = Math.max(0, Math.min(19, Math.round((p.vx * 2) / q) + 10)), vy = Math.max(0, Math.min(19, Math.round((p.vy * 2) / q) + 10));
  const x = Math.floor((p.x + 8) / q), y = Math.floor((p.y + 16) / q);
  return (((((x * 220 + y) * 20 + vx) * 20 + vy) * 2 + p.dashes) * 2 + (p.pj ? 1 : 0)) * 2 * 65536 + (p.coy > 0 ? 65536 : 0) + d;
}

const DIRS = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]];

// Steps through open tiles (ice and crumbling stone count as open) from the given tiles to every other.
function flood(room, from) {
  const d = new Int32Array(W * H).fill(1e6), q = [];
  for (const i of from) { d[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, n = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || room.grid[n] === G.tiles.ROCK || d[n] <= d[i] + 1) continue;
      d[n] = d[i] + 1; q.push(n);
    }
  }
  return d;
}

// Best-first: frames so far plus a weighted guess of the frames left (steps to the exit at dash speed).
function solve(room, needCin, K, q, weight, maxNodes) {
  const exits = [];
  for (let x = 0; x < W; x++) if (room.grid[x] !== G.tiles.ROCK) exits.push(x);
  for (let y = 0; y < H; y++) if (room.grid[y * W + W - 1] !== G.tiles.ROCK) exits.push(y * W + W - 1);
  const toExit = flood(room, exits), toCin = needCin ? flood(room, room.cin) : null;
  const guess = (s) => {
    const i = Math.max(0, Math.min(H - 1, (s.p.y + 4) >> 3)) * W + Math.max(0, Math.min(W - 1, (s.p.x + 3) >> 3));
    return (needCin && !s.cin[0] ? toCin[i] + toExit[room.cin[0]] : toExit[i]) * 2;
  };
  const start = G.makeState(room), buckets = [], seen = new Set([key(start, q)]);
  const push = (s) => { const f = Math.round(s.t + weight * guess(s)); (buckets[f] = buckets[f] || []).push(s); };
  push(start);
  let nodes = 0;
  const done = (s) => s.won && (!needCin || s.cin.every((c) => c));
  for (let f = 0; f < buckets.length; f++) {
    const b = buckets[f];
    while (b && b.length) {
      const st = b.pop(), acts = [];
      for (let x = -1; x <= 1; x++) for (let j = 0; j < 2; j++) acts.push({ x, y: 0, jump: !!j, dash: false, n: K });
      if (st.p.dashes > 0 && st.p.dashCd <= 0) for (const [x, y] of DIRS) acts.push({ x, y, jump: false, dash: true, n: G.DASH_T });
      for (const a of acts) {
        const s = G.clone(st);
        for (let i = 0; i < a.n && !s.dead && !s.won; i++) G.step(s, i === a.n - 1 ? { x: a.x, y: a.y, jump: a.jump, dash: false } : a);
        if (s.dead) continue;
        if (s.won) { if (done(s)) return { frames: s.t, nodes }; continue; }
        const k = key(s, q);
        if (seen.has(k)) continue;
        seen.add(k);
        if (++nodes > maxNodes) return { nodes, gaveUp: true };
        push(s);
        if (Math.round(s.t + weight * guess(s)) < f) f = Math.round(s.t + weight * guess(s)) - 1;
      }
    }
  }
  return { nodes };
}

function show(room) {
  for (let y = 0; y < H; y++) {
    let s = '';
    for (let x = 0; x < W; x++) s += String.fromCharCode(room.grid[y * W + x]);
    console.log(String(y).padStart(2) + ' ' + s);
  }
}

const args = process.argv.slice(2), only = args.find((a) => /^\d+$/.test(a));
let bad = 0;
G.LEVELS.forEach((def, i) => {
  if (only && +only !== i + 1) return;
  const room = G.makeRoom(def);
  if (args.includes('--map')) show(room);
  const out = [String(i + 1).padStart(2), def.name.padEnd(14)];
  let ok = false; // a route with the cinder is also a route to the exit
  for (const cin of [false, true]) {
    if (cin && !room.cin.length) continue;
    let r = solve(room, cin, 4, 2, 4, 3e5);
    if (!r.frames) r = solve(room, cin, 3, 1, 2, 1.2e6);
    if (r.frames) ok = true;
    out.push((cin ? 'cinder ' : 'exit ') + (r.frames ? (r.frames / 60).toFixed(1) + 's' : r.gaveUp ? 'GAVE UP' : 'NO ROUTE') + ' (' + r.nodes + ')');
  }
  if (!ok) bad++;
  console.log(out.join('  '));
});
process.exit(bad ? 1 : 0);
