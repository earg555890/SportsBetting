// Tests the Odds tab's own math (src/tabs/odds.js). That file is a plain
// browser script (global functions, no modules), so it is loaded into a
// sandbox here exactly as the browser would run it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const src = readFileSync(fileURLToPath(new URL('../../src/tabs/odds.js', import.meta.url)), 'utf8');
const ctx = vm.createContext({ state: {}, escapeHtml: s => String(s) });
vm.runInContext(src, ctx);
const { aiImpliedProb, oddsProbToAmerican, aiRecommend } = vm.runInContext(
  '({ aiImpliedProb, oddsProbToAmerican, aiRecommend })', ctx);

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('implied probability from American odds', () => {
  close(aiImpliedProb(-150), 0.6);
  close(aiImpliedProb(150), 0.4);
  close(aiImpliedProb(-100), 0.5);
  close(aiImpliedProb(100), 0.5);
  close(aiImpliedProb(-400), 0.8);
  close(aiImpliedProb(300), 0.25);
  assert.equal(aiImpliedProb(null), null);
});

test('American odds round-trip through implied probability', () => {
  for (const pct of [20, 35, 50, 62, 80]) {
    close(aiImpliedProb(oddsProbToAmerican(pct)), pct / 100, 0.005);
  }
});

// A basketball game whose three books all price the home side at 50%.
function game(model) {
  const d = {
    sport: 'basketball',
    teams: { h: { short: 'HOM', name: 'Home' }, a: { short: 'AWY', name: 'Away' } },
    players: {}
  };
  const m = {
    home: 'h', away: 'a', odds: { w: 50, l: 50 },
    books: { kalshi: { w: 50, l: 50 }, fanduel: { w: 50, l: 50 }, draftkings: { w: 50, l: 50 } }
  };
  if (model) m.model = model;
  return { d, m };
}

test('edge = Elo model probability − implied probability of the best price', () => {
  const { d, m } = game({ w: 64, l: 36, source: 'Elo model' });
  const rec = aiRecommend(d, m);
  assert.equal(rec.source, 'Elo model');
  assert.equal(rec.pick.market, 'moneyline');
  assert.equal(rec.pick.label, 'HOM ML');
  close(rec.modelProb, 0.64);
  close(rec.impliedProb, aiImpliedProb(rec.pick.price));
  close(rec.edge, 0.64 - aiImpliedProb(rec.pick.price));
  assert.match(rec.factors[0].text, /^Elo model win prob 64% vs\. 50% implied/);
});

test('model favoring the away side picks the away moneyline', () => {
  const { d, m } = game({ w: 30, l: 70, source: 'Elo model' });
  const rec = aiRecommend(d, m);
  assert.equal(rec.pick.label, 'AWY ML');
  close(rec.edge, 0.70 - 0.5);
});

test('without a model probability (backend off) the placeholder odds are used', () => {
  const { d, m } = game(null);
  const rec = aiRecommend(d, m);
  assert.equal(rec.source, null);
  assert.ok(!/Elo/.test(JSON.stringify(rec)));
});
