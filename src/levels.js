// The rooms, in order. See makeRoom in sim.js for the op format ("<tile> x y [w h]", 40 x 23 grid).
// ch is the season: 0 vår, 1 sommar, 2 höst, 3 vinter, 4 the way home (spring again). bg lists the
// things placed in the backdrop (drawn in render.js). Room n holds album item n (ITEMS in render.js).
// A room is left through an opening in its top or right edge; falling out of the bottom is death.
// After changing a room, run `node tools/solve.js` to check it can still be finished.
(function (G) {
  'use strict';
  const L = '# 0 0 1 23', R = '# 39 0 1 23', TOP = '# 0 0 40 1', FLOOR = '# 0 21 40 2';
  G.LEVELS = [
    // Vår (spring)
    { name: 'FÖRSTA GNISTAN', ch: 0, bg: ['stuga', 'flagga', 'brevlador'], ops: [TOP, L, '# 0 21 24 2', '# 28 17 12 6', '# 10 19 6 2', '# 16 17 8 4', '# 39 0 1 13', 'P 3 20', '* 26 13'] },
    { name: 'VALBORG', ch: 0, bg: ['eld', 'stuga', 'volvo'], ops: [TOP, L, '# 0 21 12 2', '# 21 21 19 2', '# 31 15 9 6', '# 39 0 1 11', 'P 3 20', '* 16 15'] },
    { name: 'SKREVAN', ch: 1, bg: ['ica', 'flagga', 'volvo'], ops: ['# 0 0 17 1', '# 21 0 19 1', L, R, FLOOR, '# 1 1 16 20', '# 21 1 18 17', '^ 29 20 5 1', '* 36 19', 'P 18 20'] },
    { name: 'HÖLADAN', ch: 1, bg: ['stuga', 'dass', 'mjolkpall'], ops: [TOP, L, '# 0 21 17 2', '# 23 21 17 2', '# 12 1 2 15', 'I 12 16 2 5', '# 26 1 2 15', 'I 26 16 2 5', '# 32 1 4 15', 'I 32 16 4 5', '# 39 0 1 16', '* 19 13', 'P 3 20'] },
    { name: 'LYKTORNA', ch: 1, bg: ['majstang', 'stuga'], ops: [TOP, L, '# 0 21 8 2', '# 22 11 18 12', 'o 11 16', 'o 12 15', 'o 20 13', 'o 21 12', '# 39 0 1 7', 'P 3 20', '* 30 5'] },
    { name: 'BRYGGAN', ch: 1, bg: ['kiosk', 'telefon', 'stuga'], ops: [TOP, L, '# 0 21 6 2', '~ 8 19 3 1', '~ 14 17 3 1', '# 17 1 2 9', 'v 17 10 2 1', '~ 20 15 3 1', '~ 26 13 3 1', '# 32 11 8 12', '# 39 0 1 7', 'P 2 20', '~ 20 21 2 1', '* 21 19'] },
    { name: 'MIDSOMMARNATT', ch: 1, bg: ['dansbana', 'flagga', 'majstang'], ops: ['# 0 0 13 1', '# 17 0 23 1', L, R, FLOOR, 'S 8 20', '# 12 15 6 1', 'S 17 14', '# 22 9 6 1', '# 12 4 6 1', '^ 24 20 10 1', '* 33 5', 'P 3 20'] },
    { name: 'LÖVFALL', ch: 2, bg: ['algskylt', 'jakttorn', 'stuga'], ops: [TOP, L, '# 39 0 1 16', '# 0 6 30 2', 'I 30 6 2 2', '# 32 6 8 2', '^ 12 5 2 1', '^ 20 5 3 1', '# 4 14 36 2', 'I 20 8 2 6', 'v 10 8 6 1', '^ 11 13 2 1', '# 0 21 14 2', '# 20 21 20 2', 'I 30 16 2 5', 'P 2 5', '* 36 12'] },
    { name: 'KRÄFTSKIVAN', ch: 2, bg: ['kraftlyktor', 'stuga', 'volvo'], ops: ['# 0 0 16 1', '# 24 0 16 1', L, R, FLOOR, '# 1 1 15 17', '# 24 1 15 17', 'o 19 14', 'o 20 9', 'o 19 4', '> 16 7 1 3', '< 23 11 1 3', 'P 4 20', '* 16 5'] },
    { name: 'ÄLGPASSET', ch: 2, bg: ['ica', 'brevlador', 'jakttorn'], ops: [TOP, L, '# 0 21 5 2', '# 5 22 35 1', '^ 5 21 35 1', '~ 8 18 2 1', '# 13 20 1 2', 'S 13 19', 'o 18 11', '# 21 1 2 12', 'v 21 13 2 1', '~ 25 16 2 1', 'o 30 13', '# 34 12 6 11', '# 39 0 1 8', 'P 2 20', '* 21 17'] },
    { name: 'NÅLSÖGAT', ch: 3, bg: ['stuga', 'julbock', 'flagga'], ops: [TOP, L, FLOOR, '# 6 17 4 1', '# 14 1 3 10', 'v 14 11 3 1', '^ 14 14 3 1', '# 14 15 3 6', '^ 10 20 4 1', '^ 17 20 9 1', '# 18 15 4 1', '# 26 1 3 9', 'v 26 10 3 1', '^ 26 13 3 1', '# 26 14 3 7', '# 30 16 10 5', '# 39 0 1 12', 'P 2 20', '* 22 5'] },
    { name: 'ISVAKEN', ch: 3, bg: ['bandymal', 'stuga', 'julbock'], ops: ['# 0 0 31 1', '# 35 0 5 1', L, R, FLOOR, 'S 5 20', '# 1 10 1 2', 'I 2 10 8 2', '# 10 10 29 2', '^ 14 9 4 1', '~ 22 7 2 1', '~ 27 5 2 1', '^ 30 9 4 1', '* 36 9', 'P 12 20'] },
    { name: 'NORRSKEN', ch: 3, bg: ['stuga', 'stuga'], ops: ['# 0 0 33 1', '# 38 0 2 1', L, R, '# 0 21 5 2', '# 5 22 34 1', '^ 5 21 34 1', '# 12 12 2 10', '^ 12 11 2 1', 'o 8 15', 'o 16 9', '# 21 1 2 11', 'v 21 12 2 1', 'o 24 15', '# 30 8 2 10', 'o 27 10', '# 33 6 5 1', 'P 2 20', '* 17 17'] },
    { name: 'HEMKOMSTEN', ch: 4, bg: ['stuga', 'flagga', 'stuga'], ops: ['# 0 0 30 1', '# 36 0 4 1', L, R, FLOOR, '^ 2 20 20 1', 'S 34 20', '# 24 14 6 1', '~ 17 12 3 1', '~ 10 10 3 1', '# 12 5 18 1', 'I 17 1 2 4', '^ 22 4 3 1', 'o 6 6', '* 4 3', 'P 30 20'] },
  ];
})((globalThis.EC = globalThis.EC || {}));
