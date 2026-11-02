import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeTeamResolver, createModelService, cleanGames } from '../model/service.js';
import { parseEvent } from '../scripts/fetch-history.js';

const TEAMS = {
  '12': { id: '12', name: 'LA Clippers', short: 'Clippers', nickname: 'Clippers', location: 'LA', abbr: 'LAC' },
  '13': { id: '13', name: 'Los Angeles Lakers', short: 'Lakers', nickname: 'Lakers', location: 'Los Angeles', abbr: 'LAL' },
  '8':  { id: '8',  name: 'Montréal Canadiens', short: 'Canadiens', nickname: 'Canadiens', location: 'Montréal', abbr: 'MTL' }
};

test('team names resolve across ESPN / Odds API spellings', () => {
  const r = makeTeamResolver(TEAMS);
  assert.equal(r('12'), '12');
  assert.equal(r('LAC'), '12');
  assert.equal(r('LA Clippers'), '12');
  assert.equal(r('Los Angeles Clippers'), '12');           // Odds API spelling
  assert.equal(r('Montreal Canadiens'), '8');              // no accent
  assert.equal(r('lakers'), '13');
  assert.equal(r('Boston Celtics'), null);
  assert.equal(r(''), null);
});

test('model service predicts from history files, with errors for bad input', () => {
  const dir = mkdtempSync(join(tmpdir(), 'elo-'));
  try {
    const games = [];
    for (let i = 0; i < 12; i++) {                         // Lakers beat the Clippers 12 times
      games.push({ id: String(i), date: `2026-01-${String(i + 1).padStart(2, '0')}T00:00Z`, season: 2026, type: 2,
                   home: i % 2 ? '12' : '13', away: i % 2 ? '13' : '12',
                   hs: i % 2 ? 90 : 110, as: i % 2 ? 110 : 90, neutral: false });
    }
    writeFileSync(join(dir, 'history-nba.json'), JSON.stringify({ teams: TEAMS, games }));
    const svc = createModelService({ dataDir: dir, paramsPath: join(dir, 'none.json') });
    assert.deepEqual(svc.leagues(), ['nba']);
    const r = svc.predict('nba', 'Los Angeles Lakers', 'Los Angeles Clippers');
    assert.equal(r.ok, true);
    assert.ok(r.homeWinProb > 0.5);
    assert.equal(r.homeWinProb + r.awayWinProb, 1);
    assert.equal(r.source, 'Elo model');
    assert.equal(r.ratingsAsOf, '2026-01-12');
    const neutral = svc.predict('nba', 'LAL', 'LAC', true);
    assert.ok(neutral.homeWinProb < r.homeWinProb);        // no home advantage
    assert.equal(svc.predict('nba', 'LAL').status, 400);
    assert.equal(svc.predict('nba', 'LAL', 'Boston Celtics').status, 404);
    assert.equal(svc.predict('epl', 'a', 'b').status, 404);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('cleanGames drops exhibition sides and sorts by date', () => {
  const g = (id, date, home, away) => ({ id, date, home, away, hs: 1, as: 0 });
  const games = [];
  for (let i = 0; i < 10; i++) games.push(g('r' + i, `2026-02-${String(20 - i).padStart(2, '0')}`, 'A', 'B'));
  games.push(g('x', '2026-02-01', 'A', 'WORLD'));
  const out = cleanGames(games);
  assert.equal(out.length, 10);
  assert.ok(out.every((x, i) => i === 0 || out[i - 1].date <= x.date));
});

test('fetch filter keeps finished regular/post-season games only', () => {
  const ev = (seasonType, kind, completed = true) => ({
    id: '1', date: '2026-01-01T00:00Z', season: { year: 2026, type: seasonType },
    competitions: [{
      neutralSite: true, type: { abbreviation: kind }, status: { type: { completed } },
      competitors: [
        { homeAway: 'home', score: '101', team: { id: '1', displayName: 'A', abbreviation: 'A' } },
        { homeAway: 'away', score: '99',  team: { id: '2', displayName: 'B', abbreviation: 'B' } }
      ]
    }]
  });
  const kept = parseEvent(ev(2, 'STD'));
  assert.deepEqual(kept.game, { id: '1', date: '2026-01-01T00:00Z', season: 2026, type: 2, home: '1', away: '2', hs: 101, as: 99, neutral: true });
  assert.ok(parseEvent(ev(3, 'STD')));                     // NFL playoffs
  assert.ok(parseEvent(ev(3, 'RD16')));                    // NBA/NHL playoff round
  assert.ok(parseEvent(ev(3, 'FINAL')));                   // World Series
  assert.equal(parseEvent(ev(2, 'EXH')), null);            // exhibition
  assert.equal(parseEvent(ev(1, 'STD')), null);            // preseason
  assert.equal(parseEvent(ev(2, 'ALLSTAR')), null);        // all-star
  assert.equal(parseEvent(ev(2, 'STD', false)), null);     // not final
});
