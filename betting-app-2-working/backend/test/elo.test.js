import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectedHome, movMultiplier, regress, createElo, brier, logLoss, score, MEAN } from '../model/elo.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('expected score: equal teams on neutral site = 0.5', () => {
  close(expectedHome(1500, 1500, 60, true), 0.5);
});

test('expected score: 400-point edge = 10:1 odds', () => {
  close(expectedHome(1900, 1500, 0), 10 / 11);
  close(expectedHome(1500, 1900, 0), 1 / 11);
});

test('home advantage is added to the home rating (and ignored when neutral)', () => {
  close(expectedHome(1500, 1500, 100), expectedHome(1600, 1500, 0));
  assert.ok(expectedHome(1500, 1500, 100) > 0.5);
});

test('home and away probabilities sum to 1', () => {
  const p = expectedHome(1612, 1488, 55);
  close(p + expectedHome(1488, 1612 + 55, 0), 1);       // away side, HFA on the home team
});

test('MOV multiplier: ln(margin+1) scaled down when the favorite wins', () => {
  close(movMultiplier(1, 0), Math.log(2));
  close(movMultiplier(-10, 0), Math.log(11));                 // sign of margin doesn't matter
  assert.ok(movMultiplier(20, 0) > movMultiplier(5, 0));     // bigger win counts more
  assert.ok(movMultiplier(10, 200) < movMultiplier(10, 0));  // favorite winning big counts less
  assert.ok(movMultiplier(10, -200) > movMultiplier(10, 0)); // underdog winning big counts more
  assert.equal(movMultiplier(0, 50), 1);                     // tie
});

test('one update: exact numbers for a known game', () => {
  const elo = createElo({ k: 20, hfa: 0, revert: 0.25 });
  // equal teams, home wins by 3: p = 0.5, mov = ln 4 * 2.2/2.2, shift = 20 * ln4 * 0.5
  const p = elo.update({ season: 2026, home: 'A', away: 'B', hs: 103, as: 100, neutral: false });
  close(p, 0.5);
  const shift = 20 * Math.log(4) * 0.5;
  close(elo.rating('A'), 1500 + shift);
  close(elo.rating('B'), 1500 - shift);
});

test('updates are zero-sum and move the winner up', () => {
  const elo = createElo({ k: 25, hfa: 40, revert: 0.3 });
  elo.update({ season: 1, home: 'A', away: 'B', hs: 2, as: 5, neutral: false });
  elo.update({ season: 1, home: 'C', away: 'A', hs: 1, as: 0, neutral: true });
  const sum = [...elo.ratings().values()].reduce((s, r) => s + r, 0);
  close(sum, 3 * MEAN, 1e-6);
  assert.ok(elo.rating('B') > MEAN);
});

test('upset moves ratings more than an expected win', () => {
  const a = createElo({ k: 20, hfa: 0, revert: 0 });
  a.update({ season: 1, home: 'F', away: 'U', hs: 10, as: 0 });     // F becomes favorite
  const fav0 = a.rating('F');
  const b = createElo({ k: 20, hfa: 0, revert: 0 });
  b.update({ season: 1, home: 'F', away: 'U', hs: 10, as: 0 });
  a.update({ season: 1, home: 'F', away: 'U', hs: 1, as: 0 });      // favorite wins by 1
  b.update({ season: 1, home: 'F', away: 'U', hs: 0, as: 1 });      // favorite loses by 1
  assert.ok(Math.abs(b.rating('F') - fav0) > Math.abs(a.rating('F') - fav0));
});

test('season change regresses ratings toward the mean once', () => {
  close(regress(1600, 0.25), 1575);
  close(regress(1400, 1 / 3), 1500 - 100 * (2 / 3));
  const elo = createElo({ k: 20, hfa: 0, revert: 0.5 });
  elo.update({ season: 2025, home: 'A', away: 'B', hs: 5, as: 0 });
  const a = elo.rating('A');
  elo.update({ season: 2026, home: 'C', away: 'D', hs: 1, as: 0 });   // first game of new season
  close(elo.rating('A'), MEAN + (a - MEAN) * 0.5);
  elo.update({ season: 2026, home: 'C', away: 'D', hs: 1, as: 0 });   // same season: no second regression
  close(elo.rating('A'), MEAN + (a - MEAN) * 0.5);
});

test('Brier and log loss', () => {
  close(brier(0.5, 1), 0.25);
  close(brier(0.8, 0), 0.64);
  close(logLoss(0.5, 0), Math.log(2));
  close(logLoss(0.9, 1), -Math.log(0.9));
  assert.ok(Number.isFinite(logLoss(0, 1)));                 // clipped, never Infinity
});

test('score(): accuracy, half credit for 0.5, ties skipped', () => {
  const games = [{ hs: 2, as: 1 }, { hs: 1, as: 2 }, { hs: 3, as: 3 }, { hs: 4, as: 0 }];
  const s = score(games, [0.7, 0.6, 0.9, 0.5]);
  assert.equal(s.n, 3);
  close(s.accuracy, (1 + 0 + 0.5) / 3);
  close(s.brier, (0.09 + 0.36 + 0.25) / 3);
});
