// Sound: every effect and the music is synthesized (WebAudio oscillators and noise), no files.
(function (G) {
  'use strict';
  let ac = null, master = null, music = null, noiseBuf = null, timer = null, stepAt = 0, stepN = 0, chapter = 0;
  let musicOn = true;
  try { musicOn = localStorage.getItem('lagan.music') !== '0'; } catch (e) { /* no storage */ }

  function unlock() {
    if (!ac) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
      music = ac.createGain(); music.gain.value = musicOn ? 0.5 : 0; music.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      timer = setInterval(schedule, 40);
    }
    if (ac.state === 'suspended') ac.resume();
  }
  const ready = () => ac && ac.state === 'running';

  function tone(type, f0, f1, dur, vol, at, dest) {
    if (!ready()) return;
    const t = at || ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, at, dest) {
    if (!ready()) return;
    const t = at || ac.currentTime, s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noiseBuf;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || master);
    s.start(t); s.stop(t + dur + 0.02);
  }
  const later = (s) => (ac ? ac.currentTime + s : 0);

  const sfx = {
    jump: () => tone('square', 280, 560, 0.09, 0.09),
    wjump: () => tone('square', 360, 720, 0.09, 0.09),
    land: () => noise(0.06, 0.12, 300),
    dash: () => { noise(0.16, 0.22, 1800); tone('sawtooth', 700, 180, 0.14, 0.08); },
    refill: () => tone('triangle', 900, 1400, 0.05, 0.05),
    crystal: () => { tone('triangle', 1047, 0, 0.1, 0.14); tone('triangle', 1568, 0, 0.16, 0.14, later(0.06)); },
    spring: () => tone('square', 180, 900, 0.16, 0.1),
    ice: () => { noise(0.14, 0.25, 4200); tone('triangle', 2400, 1300, 0.08, 0.06); },
    crumble: () => noise(0.25, 0.2, 180),
    cinder: () => { // a find: a rising chime, with sleigh bells in winter
      [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, 0, 0.18, 0.1, later(i * 0.06)));
      if (chapter === 3) for (let i = 0; i < 5; i++) noise(0.05, 0.12, 7500, later(0.05 + i * 0.07));
    },
    die: () => { tone('sawtooth', 420, 50, 0.35, 0.14); noise(0.3, 0.2, 500); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, 0, 0.16, 0.13, later(i * 0.07))),
    menu: () => tone('square', 660, 0, 0.05, 0.06),
    ok: () => { tone('square', 660, 0, 0.06, 0.07); tone('square', 990, 0, 0.1, 0.07, later(0.06)); },
  };

  // Music: a folk tune in three-four time (a polska: weight on beats one and three), one per season.
  // Each season has its own four chords, speed and voice; winter is a music box.
  const CH = { C: [48, 52, 55], D: [50, 54, 57], Dm: [50, 53, 57], E: [52, 56, 59], Em: [52, 55, 59], F: [53, 57, 60], G: [55, 59, 62], A: [57, 61, 64], Am: [57, 60, 64], Bb: [58, 62, 65], Bm: [59, 62, 66] };
  const SEASONS = [
    { chords: ['G', 'D', 'Em', 'C'], dt: 0.21, arp: 'square', lead: 'triangle' },
    { chords: ['D', 'A', 'Bm', 'G'], dt: 0.18, arp: 'square', lead: 'sawtooth' },
    { chords: ['Am', 'Dm', 'E', 'Am'], dt: 0.2, arp: 'square', lead: 'triangle' },
    { chords: ['Dm', 'Bb', 'F', 'A'], dt: 0.24, arp: 'sine', lead: 'sine', box: true },
    { chords: ['C', 'G', 'Am', 'F'], dt: 0.23, arp: 'triangle', lead: 'triangle' },
  ];
  const ARP = [0, 2, 1, 2, 0, 1], LEAD = [[2, -1, 1, 0, -1, 1], [0, -1, 2, 1, 0, -1], [1, -1, 2, 2, -1, 0], [2, 1, 0, -1, 0, -1]];
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function schedule() {
    if (!ready()) return;
    if (stepAt < ac.currentTime) stepAt = ac.currentTime + 0.05;
    const se = SEASONS[chapter], dt = se.dt;
    while (stepAt < ac.currentTime + 0.15) {
      const bar = Math.floor(stepN / 6), s = stepN % 6, ch = CH[se.chords[bar % 4]];
      tone(se.arp, hz(ch[ARP[s]] + (se.box ? 24 : 12)), 0, dt * (se.box ? 2.5 : 0.9), se.box ? 0.07 : 0.03, stepAt, music);
      if (s === 0 || s === 4) tone('triangle', hz(ch[0] - 12), 0, dt * 1.8, s ? 0.11 : 0.17, stepAt, music);
      const lead = LEAD[bar % 4][s];
      if (lead >= 0 && Math.floor(bar / 4) % 2 === 1) tone(se.lead, hz(ch[lead] + (se.box ? 36 : 24)), 0, dt * 1.7, se.lead === 'sawtooth' ? 0.03 : 0.07, stepAt, music);
      if (!se.box && (s === 0 || s === 4)) noise(0.03, 0.03, 6000, stepAt, music);
      stepAt += dt; stepN++;
    }
  }

  G.audio = {
    unlock, sfx, ready,
    setChapter: (c) => { chapter = c; },
    musicOn: () => musicOn,
    toggleMusic: () => {
      musicOn = !musicOn;
      if (music) music.gain.value = musicOn ? 0.5 : 0;
      try { localStorage.setItem('lagan.music', musicOn ? '1' : '0'); } catch (e) { /* no storage */ }
    },
  };
})((globalThis.EC = globalThis.EC || {}));
