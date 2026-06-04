// =============================================================================
// ODDS TAB
// Expandable game/fight cards. Moneyline, spread, and total are compared across
// books with best-price highlighting; player props show a consensus O/U line.
// Lines are derived from the mock win-probabilities for now — this is the
// surface the backend odds proxy will feed once wired (see START_HERE.md).
// =============================================================================

const ODDS_BOOK_TITLES = { kalshi: 'Kalshi', fanduel: 'FanDuel', draftkings: 'DraftKings' };
const ODDS_BOOK_JUICE  = { kalshi: -4, fanduel: 0, draftkings: 3 }; // added to -110 base; higher = better price
const ODDS_TOTAL_BASE  = { basketball: 225.5, football: 45.5, hockey: 6.5, baseball: 8.5, soccer: 2.5 };

function oddsProbToAmerican(pct){
  const p = Math.max(1, Math.min(99, pct)) / 100;
  return p >= 0.5 ? -Math.round((p / (1 - p)) * 100) : Math.round(((1 - p) / p) * 100);
}
function oddsFmt(n){ return n == null ? '—' : (n > 0 ? '+' + n : '' + n); }
function oddsRoundHalf(n){ return Math.round(n * 2) / 2; }
function oddsBestPrice(prices){ const v = prices.filter(p => p != null); return v.length ? Math.max(...v) : null; }

// --- Flat-market (spread/total) pricing ----------------------------------
// Spread/total used to be a fixed `-110 + juice` per book, so DraftKings was
// ALWAYS the best price on every row — a static, wrong-looking highlight. We
// now add a deterministic per-(book,row) nudge so the best line moves around,
// while staying stable across re-renders (no Math.random). The AI engine and
// the comparison table both call these, so the recommended price always
// matches the cell it lands on.
function oddsHash(str){ let h = 0; for (let i = 0; i < str.length; i++){ h = (h * 31 + str.charCodeAt(i)) >>> 0; } return h; }
function oddsFlatPrice(book, seed){ return -110 + (ODDS_BOOK_JUICE[book] || 0) + (oddsHash(book + '|' + seed) % 11) - 5; }
function oddsBestFlat(books, seed){
  let bp = null, bb = null;
  books.forEach(b => { const p = oddsFlatPrice(b, seed); if (bp == null || p > bp){ bp = p; bb = b; } });
  return { price: bp, book: bb };
}
function oddsSpreadSeed(m, rowKey){ return `spread|${m.home}|${m.away}|${rowKey}`; }
function oddsTotalSeed(m, rowKey){ return `total|${m.home}|${m.away}|${rowKey}`; }

// =============================================================================
// AI RECOMMENDATION ENGINE  (mock — stands in for the future POST /api/recommend)
// Derives a single best bet per game from the model win-% vs. the implied price.
// Output shape matches what the server-side agent will return, so swapping to
// the real call later is a one-function change (see START_HERE.md step 3).
// =============================================================================

// Implied win probability (0–1) from American odds.
function aiImpliedProb(american){
  if (american == null) return null;
  return american < 0 ? (-american) / (-american + 100) : 100 / (american + 100);
}

// Confidence (0–1) -> a continuous red→amber→green color.
// NOTE: this intentionally bypasses the CSS-variable palette (per an explicit
// product decision) so the gradient is truly smooth. Fixed mid-lightness + white
// text keeps it legible in BOTH light and dark mode.
function confidenceColor(conf, alpha){
  const c = Math.max(0, Math.min(1, conf == null ? 0.5 : conf));
  const hue = Math.round(c * 120);                 // 0 = red, 120 = green
  return `hsla(${hue}, 65%, 42%, ${alpha == null ? 1 : alpha})`;
}

// Builds an aiCell(book, row) predicate for oddsCompareTable: returns the pick's
// confidence for the recommended cell, else null. `.key` carries the card key so
// the cell can become a tap target that opens the popup.
function aiCellMatch(rec, market, key){
  if (!rec || !rec.pick || rec.pick.locator.market !== market) return null;
  const loc = rec.pick.locator;
  const fn = (b, r) => (r.key === loc.rowKey && b === loc.book) ? rec.confidence : null;
  fn.key = key;
  return fn;
}

function aiSummary(top){
  const pct = Math.round(top.hit * 100);
  if (top.market === 'moneyline') return `${top.label} at ${oddsFmt(top.price)} — the model gives it ~${pct}% to hit, ${top.edge >= 0 ? 'with positive value vs.' : 'though it grades short of'} the current price.`;
  if (top.market === 'spread')    return `${top.label} — backing the favorite to cover at ~${pct}% confidence. Moderate conviction: covering is harder than winning outright.`;
  if (top.market === 'total')     return `${top.label} — a low-conviction lean. The model sees no strong edge on the total in this game.`;
  return `${top.label} — a player-prop lean at ~${pct}% confidence. Thinner data here, so treat it as speculative.`;
}

// Main engine for team games. Returns null when there are no lines to read.
function aiRecommend(d, m){
  const books = Object.keys(m.books || {});
  if (!books.length || !m.odds) return null;
  const h = d.teams[m.home], a = d.teams[m.away];
  if (!h || !a) return null;
  const hasD = m.odds.d !== undefined;
  const candidates = [];

  // Best American price (+ which book) for a side, by its book prob key.
  function bestFor(probKey){
    let bestP = null, bestB = null;
    books.forEach(b => {
      const pct = m.books[b][probKey];
      if (pct == null) return;
      const price = oddsProbToAmerican(pct);
      if (bestP == null || price > bestP){ bestP = price; bestB = b; }
    });
    return { price: bestP, book: bestB };
  }
  // --- Moneyline (real edge: model prob vs. implied price) ---
  const mlSides = hasD
    ? [{ key:'home', prob:m.odds.w, pk:'w', label:`${h.short} ML` }, { key:'draw', prob:m.odds.d, pk:'d', label:'Draw' }, { key:'away', prob:m.odds.l, pk:'l', label:`${a.short} ML` }]
    : [{ key:'home', prob:m.odds.w, pk:'w', label:`${h.short} ML` }, { key:'away', prob:m.odds.l, pk:'l', label:`${a.short} ML` }];
  mlSides.forEach(s => {
    const bp = bestFor(s.pk);
    if (bp.price == null) return;
    const model = s.prob / 100, implied = aiImpliedProb(bp.price), edge = model - implied;
    candidates.push({
      market:'moneyline', label:s.label, price:bp.price, book:bp.book,
      locator:{ market:'moneyline', rowKey:s.key, book:bp.book },
      edge, hit: model,
      factors: [
        { lean: edge >= 0 ? 'for' : 'against', text:`Model win prob ${Math.round(model*100)}% vs. ${Math.round(implied*100)}% implied by the price (${edge >= 0 ? '+' : ''}${Math.round(edge*100)}% edge)` },
        { lean:'for', text:`Best price across books is ${ODDS_BOOK_TITLES[bp.book] || bp.book} at ${oddsFmt(bp.price)}` }
      ]
    });
  });

  // --- Spread (skip 3-way soccer); favorite to cover, modest synthetic edge ---
  if (!hasD){
    const homeFav = m.odds.w >= 50;
    const favKey = homeFav ? 'home' : 'away';
    const favTeam = homeFav ? h : a;
    const pts = oddsSpreadPoints(d, m);
    const favProb = Math.max(m.odds.w, m.odds.l) / 100;
    const bp = oddsBestFlat(books, oddsSpreadSeed(m, favKey));
    candidates.push({
      market:'spread', label:`${favTeam.short} -${pts}`, price:bp.price, book:bp.book,
      locator:{ market:'spread', rowKey:favKey, book:bp.book },
      edge:(favProb - 0.5) * 0.12, hit: Math.max(0.30, Math.min(0.68, favProb - 0.12)),
      factors:[
        { lean:'for', text:`${favTeam.short} is the model favorite (~${Math.round(favProb*100)}% to win outright)` },
        { lean:'against', text:`Laying -${pts} is tougher than a straight-up win` }
      ]
    });
  }

  // --- Total: no real signal -> near coin-flip, tiny edge (rarely the top pick) ---
  {
    const base = ODDS_TOTAL_BASE[d.sport] || 7.5;
    const bp = oddsBestFlat(books, oddsTotalSeed(m, 'over'));
    candidates.push({
      market:'total', label:`Over ${base}`, price:bp.price, book:bp.book,
      locator:{ market:'total', rowKey:'over', book:bp.book },
      edge:0.004, hit:0.50,
      factors:[{ lean:'against', text:`No strong total signal in the model — low-conviction lean only` }]
    });
  }

  // --- Player prop: first eligible player, Over the stat line ---
  const propEntries = Object.entries(d.players || {}).filter(([, p]) => p.team === m.home || p.team === m.away);
  if (propEntries.length){
    const [pid, p] = propEntries[0];
    let label = 'Points', line = 0.5;
    if (d.sport === 'basketball'){ label = 'Points'; line = oddsRoundHalf(p.stats.PPG); }
    else if (d.sport === 'football'){ label = 'Pass Yds'; line = Math.round((p.stats['Pass Yds'] || 4000) / 16 / 5) * 5 - 0.5; }
    else if (d.sport === 'baseball'){ label = 'Total Bases'; line = 1.5; }
    else if (d.sport === 'hockey'){ label = 'Shots on Goal'; line = 2.5; }
    else if (d.sport === 'soccer'){ label = 'Shots on Target'; line = 1.5; }
    candidates.push({
      market:'prop', label:`${p.name} Over ${line} ${label}`, price:-115, book:'fanduel',
      locator:{ market:'prop', player:pid, side:'over' },
      edge:0.012, hit:0.54,
      factors:[
        { lean:'for', text:`${p.name} has been trending at or above ${line} ${label}` },
        { lean:'against', text:`Player-prop markets carry thinner data — lower conviction` }
      ]
    });
  }

  if (!candidates.length) return null;
  candidates.sort((x, y) => (y.edge - x.edge) || (y.hit - x.hit));   // best value first, hit-prob tiebreak
  const top = candidates[0];
  return {
    pick: { market: top.market, label: top.label, price: top.price, book: top.book, locator: top.locator },
    confidence: Math.max(0.05, Math.min(0.95, top.hit)),
    summary: aiSummary(top),
    factors: top.factors
  };
}

// Engine for fights (moneyline only).
function aiRecommendFight(d, fight){
  const books = Object.keys(fight.books || {});
  if (!books.length || !fight.odds) return null;
  function bestFor(key){
    let bp = null, bb = null;
    books.forEach(b => { const pct = fight.books[b][key]; if (pct == null) return; const price = oddsProbToAmerican(pct); if (bp == null || price > bp){ bp = price; bb = b; } });
    return { price: bp, book: bb };
  }
  let best = null;
  [{ key:'f1', prob:fight.odds.f1, name:fight.f1.name }, { key:'f2', prob:fight.odds.f2, name:fight.f2.name }].forEach(s => {
    const bp = bestFor(s.key);
    if (bp.price == null) return;
    const model = s.prob / 100, implied = aiImpliedProb(bp.price), edge = model - implied;
    if (!best || edge > best.edge) best = { ...s, price: bp.price, book: bp.book, model, implied, edge };
  });
  if (!best) return null;
  const lastName = best.name.split(' ').slice(-1)[0];
  return {
    pick: { market:'fight', label:`${lastName} ML`, price:best.price, book:best.book, locator:{ market:'fight', rowKey:best.key, book:best.book } },
    confidence: Math.max(0.05, Math.min(0.95, best.model)),
    summary: `${lastName} at ${oddsFmt(best.price)} — the model gives ~${Math.round(best.model*100)}% to win, ${best.edge >= 0 ? 'with positive value vs.' : 'though it grades short of'} the price.`,
    factors: [
      { lean: best.edge >= 0 ? 'for' : 'against', text:`Model ${Math.round(best.model*100)}% vs. ${Math.round(best.implied*100)}% implied (${best.edge >= 0 ? '+' : ''}${Math.round(best.edge*100)}% edge)` },
      { lean:'for', text:`Best price across books is ${ODDS_BOOK_TITLES[best.book] || best.book} at ${oddsFmt(best.price)}` }
    ]
  };
}

// The highlighted AI-pick banner shown on every card (tinted by confidence,
// tappable to open the popup). Lives outside the card's toggle button so a tap
// opens the popup instead of expanding the card.
function aiPickBanner(key, rec){
  if (!rec) return '';
  const col = confidenceColor(rec.confidence);
  const pct = Math.round(rec.confidence * 100);
  const marketLabel = rec.pick.market === 'fight' ? 'moneyline' : rec.pick.market;
  return `<button data-ai-open="${key}" style="width:100%; text-align:left; border:none; cursor:pointer; padding:9px 12px; display:flex; align-items:center; gap:10px; background:${confidenceColor(rec.confidence, 0.14)}; border-top:0.5px solid var(--color-border-tertiary);">
    <span style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:50%; background:${col}; color:#fff; font-size:14px; flex-shrink:0;">🤖</span>
    <span style="flex:1; min-width:0;">
      <span style="display:block; font-size:9px; text-transform:uppercase; letter-spacing:0.5px; color:var(--color-text-tertiary);">AI Pick · ${marketLabel}</span>
      <span style="display:block; font-size:13px; font-weight:600; color:var(--color-text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(rec.pick.label)} <span style="color:var(--color-text-secondary); font-weight:500;">${oddsFmt(rec.pick.price)}</span></span>
    </span>
    <span style="display:flex; flex-direction:column; align-items:flex-end; flex-shrink:0;">
      <span style="font-size:15px; font-weight:700; color:${col};">${pct}%</span>
      <span style="font-size:9px; color:var(--color-text-tertiary);">confidence</span>
    </span>
  </button>`;
}

// Generic comparison table: rows x books, best price per row highlighted.
// Optional `aiCell(book, row)` returns the AI pick's confidence for the cell it
// recommends (else null); that cell gets a confidence-colored ring and becomes a
// tap target that opens the AI popup (its `.key` carries the card key).
function oddsCompareTable(books, rows, cellFn, aiCell){
  // One best-price cell per row. Tie-break: the first book (in `books` order)
  // that hits the max — so a price tie lights up a single cell, not several.
  const bestBook = {};
  rows.forEach(r => {
    let bp = null, bb = null;
    books.forEach(b => { const c = cellFn(b, r); if (!c || c.price == null) return; if (bp == null || c.price > bp){ bp = c.price; bb = b; } });
    bestBook[r.key] = books.length > 1 ? bb : null;
  });
  let html = `<table style="width:100%; border-collapse:collapse; margin:4px 0 2px;">
    <thead><tr><th></th>${books.map(b => `<th style="padding:6px 4px; font-size:10px; text-transform:uppercase; letter-spacing:0.4px; color:var(--color-text-tertiary); font-weight:500;">${ODDS_BOOK_TITLES[b] || b}</th>`).join('')}</tr></thead>
    <tbody>`;
  rows.forEach(r => {
    html += `<tr><td style="padding:7px 4px; font-size:12px; font-weight:500; text-align:left;">${r.label}</td>`;
    books.forEach(b => {
      const c = cellFn(b, r);
      if (!c){ html += `<td style="text-align:center; color:var(--color-text-tertiary);">—</td>`; return; }
      const aiConf = aiCell ? aiCell(b, r) : null;
      const isAi = aiConf != null;
      // AI pick is the only endorsing mark; the BEST tag is neutral and is
      // suppressed on the AI cell so the two never stack on one cell.
      const isBest = !isAi && b === bestBook[r.key];
      const aiFill = isAi ? `background:${confidenceColor(aiConf)}; ` : '';
      const bestOutline = isBest ? `outline:1px solid var(--color-text-tertiary); ` : '';
      const aiAttr = isAi ? ` data-ai-open="${aiCell.key}" title="AI pick — tap for why"` : '';
      html += `<td style="text-align:center; padding:5px 3px;">
        <span${aiAttr} style="display:inline-flex; flex-direction:column; align-items:center; gap:1px; padding:4px 7px; border-radius:6px; ${isAi ? 'cursor:pointer; ' : ''}${aiFill}${bestOutline}">
          ${isAi ? `<span style="font-size:7px; font-weight:700; letter-spacing:0.5px; color:#fff;">AI PICK</span>` : isBest ? `<span style="font-size:7px; font-weight:700; letter-spacing:0.5px; color:var(--color-text-tertiary);">BEST</span>` : ''}
          ${c.point != null ? `<span style="font-size:10px; color:${isAi ? 'rgba(255,255,255,0.85)' : 'var(--color-text-secondary)'};">${c.point}</span>` : ''}
          <span style="font-size:12px; font-weight:${isAi ? '700' : '500'}; ${isAi ? 'color:#fff;' : ''}">${oddsFmt(c.price)}</span>
        </span></td>`;
    });
    html += `</tr>`;
  });
  return html + `</tbody></table>`;
}

function oddsSpreadPoints(d, m){
  if (m.line){
    const num = parseFloat((m.line.match(/-?\d+(\.\d+)?/) || [])[0]);
    if (!isNaN(num)) return Math.abs(num);
  }
  const edge = Math.abs((m.odds ? m.odds.w : 50) - 50) / 50;
  const factor = { basketball: 16, football: 10, hockey: 1.5, baseball: 1.5, soccer: 1 }[d.sport] || 6;
  return Math.max(0.5, Math.round(edge * factor * 2) / 2);
}

function oddsPlayerProps(d, m, key, rec){
  const entries = Object.entries(d.players || {}).filter(([, p]) => p.team === m.home || p.team === m.away).slice(0, 4);
  if (!entries.length) return '';
  const aiProp = rec && rec.pick.locator.market === 'prop' ? rec.pick.locator : null;
  const rows = entries.map(([pid, p]) => {
    let label = 'Points', line = 0.5, over = -110, under = -110;
    if (d.sport === 'basketball'){ label = 'Points'; line = oddsRoundHalf(p.stats.PPG); over = -115; under = -105; }
    else if (d.sport === 'football'){ label = 'Pass Yds'; line = Math.round((p.stats['Pass Yds'] || 4000) / 16 / 5) * 5 - 0.5; over = -110; under = -110; }
    else if (d.sport === 'baseball'){ label = 'Total Bases'; line = 1.5; over = 105; under = -130; }
    else if (d.sport === 'hockey'){ label = 'Shots on Goal'; line = 2.5; over = -120; under = 100; }
    else if (d.sport === 'soccer'){ label = 'Shots on Target'; line = 1.5; over = -105; under = -120; }
    const isAiOver = aiProp && aiProp.player === pid && aiProp.side === 'over';
    const aiFill = isAiOver ? `background:${confidenceColor(rec.confidence)}; border-color:transparent; ` : '';
    const aiAttr = isAiOver ? ` data-ai-open="${key}" title="AI pick — tap for why"` : '';
    return `<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:0.5px solid var(--color-border-tertiary);">
      <div><p style="margin:0; font-size:13px; font-weight:500;">${p.name}</p><p style="margin:1px 0 0; font-size:10px; color:var(--color-text-tertiary);">${label} ${line}</p></div>
      <div style="display:flex; gap:6px;">
        <span${aiAttr} style="display:flex; flex-direction:column; align-items:center; padding:4px 10px; border:0.5px solid var(--color-border-tertiary); border-radius:6px; ${isAiOver ? 'cursor:pointer; ' : ''}${aiFill}"><span style="font-size:9px; color:${isAiOver ? '#fff' : 'var(--color-text-tertiary)'};">${isAiOver ? 'AI · OVER' : 'OVER'}</span><span style="font-size:12px; font-weight:500; ${isAiOver ? 'color:#fff;' : ''}">${oddsFmt(over)}</span></span>
        <span style="display:flex; flex-direction:column; align-items:center; padding:4px 10px; border:0.5px solid var(--color-border-tertiary); border-radius:6px;"><span style="font-size:9px; color:var(--color-text-tertiary);">UNDER</span><span style="font-size:12px; font-weight:500;">${oddsFmt(under)}</span></span>
      </div>
    </div>`;
  }).join('');
  return `<p style="margin:12px 0 2px; font-size:11px; color:var(--color-text-secondary); font-weight:500;">Player props</p>${rows}`;
}

function oddsMatchExpanded(d, m, key, rec){
  const books = Object.keys(m.books || {});
  if (!books.length) return '<p style="font-size:11px; color:var(--color-text-tertiary); padding:8px 0;">No lines posted.</p>';
  const h = d.teams[m.home], a = d.teams[m.away];
  const hasD = m.odds && m.odds.d !== undefined;
  let html = '';

  // Moneyline
  const mlRows = hasD
    ? [{ key: 'home', label: h.short }, { key: 'draw', label: 'Draw' }, { key: 'away', label: a.short }]
    : [{ key: 'away', label: a.short }, { key: 'home', label: h.short }];
  html += `<p style="margin:6px 0 0; font-size:11px; color:var(--color-text-secondary); font-weight:500;">Moneyline</p>`;
  html += oddsCompareTable(books, mlRows, (b, r) => {
    const bk = m.books[b]; if (!bk) return null;
    const pct = r.key === 'home' ? bk.w : r.key === 'away' ? bk.l : bk.d;
    return { price: oddsProbToAmerican(pct) };
  }, aiCellMatch(rec, 'moneyline', key));

  // Spread (skip for 3-way soccer)
  if (!hasD){
    const pts = oddsSpreadPoints(d, m);
    const homeFav = (m.odds ? m.odds.w : 50) >= 50;
    html += `<p style="margin:10px 0 0; font-size:11px; color:var(--color-text-secondary); font-weight:500;">Spread</p>`;
    html += oddsCompareTable(books, [{ key: 'away', label: a.short }, { key: 'home', label: h.short }], (b, r) => {
      const sign = (r.key === 'home') === homeFav ? -1 : 1;
      return { point: (sign < 0 ? '-' : '+') + pts, price: oddsFlatPrice(b, oddsSpreadSeed(m, r.key)) };
    }, aiCellMatch(rec, 'spread', key));
  }

  // Total
  const base = ODDS_TOTAL_BASE[d.sport] || 7.5;
  html += `<p style="margin:10px 0 0; font-size:11px; color:var(--color-text-secondary); font-weight:500;">Total</p>`;
  html += oddsCompareTable(books, [{ key: 'over', label: 'Over' }, { key: 'under', label: 'Under' }], (b, r) => {
    return { point: (r.key === 'over' ? 'O ' : 'U ') + base, price: oddsFlatPrice(b, oddsTotalSeed(m, r.key)) };
  }, aiCellMatch(rec, 'total', key));

  html += oddsPlayerProps(d, m, key, rec);
  return html;
}

function oddsFightExpanded(d, fight, key, rec){
  const books = Object.keys(fight.books || {});
  if (!books.length) return '<p style="font-size:11px; color:var(--color-text-tertiary); padding:8px 0;">No lines posted.</p>';
  let html = `<p style="margin:6px 0 0; font-size:11px; color:var(--color-text-secondary); font-weight:500;">Moneyline</p>`;
  html += oddsCompareTable(books,
    [{ key: 'f1', label: fight.f1.name.split(' ').slice(-1)[0] }, { key: 'f2', label: fight.f2.name.split(' ').slice(-1)[0] }],
    (b, r) => { const bk = fight.books[b]; return bk ? { price: oddsProbToAmerican(bk[r.key]) } : null; },
    aiCellMatch(rec, 'fight', key));
  html += `<p style="margin:12px 0 2px; font-size:11px; color:var(--color-text-secondary); font-weight:500;">Props</p>
    <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:0.5px solid var(--color-border-tertiary);">
      <p style="margin:0; font-size:13px; font-weight:500;">Goes the distance (${fight.rounds} rds)</p>
      <div style="display:flex; gap:6px;">
        <span style="display:flex; flex-direction:column; align-items:center; padding:4px 10px; border:0.5px solid var(--color-border-tertiary); border-radius:6px;"><span style="font-size:9px; color:var(--color-text-tertiary);">YES</span><span style="font-size:12px; font-weight:500;">+110</span></span>
        <span style="display:flex; flex-direction:column; align-items:center; padding:4px 10px; border:0.5px solid var(--color-border-tertiary); border-radius:6px;"><span style="font-size:9px; color:var(--color-text-tertiary);">NO</span><span style="font-size:12px; font-weight:500;">-130</span></span>
      </div>
    </div>`;
  return html;
}

function oddsMatchCard(leagueId, d, m, idx){
  const h = d.teams[m.home], a = d.teams[m.away];
  if (!h || !a) return '';
  const key = `${leagueId}|${idx}`;
  const open = state.expandedOddsKey === key;
  const rec = aiRecommend(d, m);
  const books = Object.keys(m.books || {});
  const bestHome = oddsBestPrice(books.map(b => oddsProbToAmerican(m.books[b].w)));
  const bestAway = oddsBestPrice(books.map(b => oddsProbToAmerican(m.books[b].l)));
  return `<div style="background:var(--color-background-primary); border:0.5px solid ${open ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}; border-radius:var(--border-radius-md); margin-bottom:8px; overflow:hidden;">
    <button data-odds-toggle="${key}" style="width:100%; padding:11px 12px; background:transparent; border:none; cursor:pointer; text-align:left;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:10px; color:var(--color-text-tertiary); text-transform:uppercase; letter-spacing:0.5px;">${d.league}</span>
        <div style="display:flex; align-items:center; gap:6px;">${statusPill(m.status)}<span style="font-size:11px; color:var(--color-text-secondary);">${m.time}</span></div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">${logoCircle(a.name, a.color, 22)}<span style="flex:1; font-size:13px;">${a.name}</span><span style="font-size:12px; font-weight:500; color:var(--color-text-secondary);">${oddsFmt(bestAway)}</span></div>
      <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">${logoCircle(h.name, h.color, 22)}<span style="flex:1; font-size:13px;">${h.name}</span><span style="font-size:12px; font-weight:500; color:var(--color-text-secondary);">${oddsFmt(bestHome)}</span></div>
      <div style="display:flex; align-items:center; gap:4px; color:var(--color-text-tertiary); font-size:11px; justify-content:flex-end; margin-top:6px;">
        <span>${open ? 'Hide lines' : 'All lines & props'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(${open ? 180 : 0}deg);"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </button>
    ${aiPickBanner(key, rec)}
    ${open ? `<div style="padding:0 12px 12px; border-top:0.5px solid var(--color-border-tertiary);">${oddsMatchExpanded(d, m, key, rec)}</div>` : ''}
  </div>`;
}

function oddsFightCard(leagueId, d, fight, idx){
  const key = `fight|${leagueId}|${idx}`;
  const open = state.expandedOddsKey === key;
  const rec = aiRecommendFight(d, fight);
  const books = Object.keys(fight.books || {});
  const best1 = oddsBestPrice(books.map(b => oddsProbToAmerican(fight.books[b].f1)));
  const best2 = oddsBestPrice(books.map(b => oddsProbToAmerican(fight.books[b].f2)));
  return `<div style="background:var(--color-background-primary); border:0.5px solid ${open ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}; border-radius:var(--border-radius-md); margin-bottom:8px; overflow:hidden;">
    <button data-odds-toggle="${key}" style="width:100%; padding:11px 12px; background:transparent; border:none; cursor:pointer; text-align:left;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:10px; color:var(--color-text-tertiary); text-transform:uppercase; letter-spacing:0.5px;">${d.league} · ${fight.label}</span>
        <span style="font-size:11px; color:var(--color-text-secondary);">${fight.time}</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">${logoCircle(fight.f1.name, fight.f1.color, 22)}<span style="flex:1; font-size:13px;">${fight.f1.name}</span><span style="font-size:12px; font-weight:500; color:var(--color-text-secondary);">${oddsFmt(best1)}</span></div>
      <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">${logoCircle(fight.f2.name, fight.f2.color, 22)}<span style="flex:1; font-size:13px;">${fight.f2.name}</span><span style="font-size:12px; font-weight:500; color:var(--color-text-secondary);">${oddsFmt(best2)}</span></div>
      <div style="display:flex; align-items:center; gap:4px; color:var(--color-text-tertiary); font-size:11px; justify-content:flex-end; margin-top:6px;">
        <span>${open ? 'Hide lines' : 'All lines & props'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(${open ? 180 : 0}deg);"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </button>
    ${aiPickBanner(key, rec)}
    ${open ? `<div style="padding:0 12px 12px; border-top:0.5px solid var(--color-border-tertiary);">${oddsFightExpanded(d, fight, key, rec)}</div>` : ''}
  </div>`;
}

function oddsEntries(){
  const out = [];
  if (state.template === 'overview'){
    Object.entries(DataSource.getAll()).forEach(([lid, d]) => collectOdds(lid, d, out));
  } else {
    collectOdds(state.league, getActiveData(), out);
  }
  return out;
}
function collectOdds(lid, d, out){
  if (!d) return;
  if (d.matches) d.matches.forEach((m, i) => out.push(oddsMatchCard(lid, d, m, i)));
  if (d.fights) d.fights.forEach((f, i) => out.push(oddsFightCard(lid, d, f, i)));
}

function renderOdds(c){
  const cards = oddsEntries().filter(Boolean);
  let html = sampleDataBanner();
  html += `<p style="margin:0 0 10px; font-size:12px; color:var(--color-text-secondary);">Each game shows the AI's best bet, colored by confidence. Tap it for the reasoning. Best price across books is highlighted.</p>`;
  html += cards.length ? cards.join('') : `<p style="font-size:12px; color:var(--color-text-tertiary); padding:20px 0; text-align:center;">No games on the board for this view.</p>`;
  c.innerHTML = html;
  bindSectionToggles(c);
  c.querySelectorAll('[data-odds-toggle]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.oddsToggle;
    state.expandedOddsKey = state.expandedOddsKey === k ? null : k;
    renderContent();
  }));
  // AI-pick banners and highlighted cells open the popup (without rebuilding the board).
  c.querySelectorAll('[data-ai-open]').forEach(el => el.addEventListener('click', (e) => {
    e.stopPropagation();
    state.aiModalKey = el.dataset.aiOpen;
    renderAiModal();
  }));
}

// =============================================================================
// AI-PICK POPUP
// Resolves a card key back to its game + recommendation, then renders the popup
// into #ai-modal-host (outside #content, so it survives board re-renders).
// =============================================================================
function aiResolveKey(key){
  const all = DataSource.getAll();
  if (key.indexOf('fight|') === 0){
    const [, lid, idx] = key.split('|');
    const d = all[lid]; if (!d || !d.fights) return null;
    const fight = d.fights[+idx]; if (!fight) return null;
    return { d, fight, rec: aiRecommendFight(d, fight) };
  }
  const [lid, idx] = key.split('|');
  const d = all[lid]; if (!d || !d.matches) return null;
  const m = d.matches[+idx]; if (!m) return null;
  return { d, m, rec: aiRecommend(d, m) };
}

let _aiEscBound = false;
function renderAiModal(){
  const host = document.getElementById('ai-modal-host');
  if (!host) return;
  if (state.tab !== 'odds') state.aiModalKey = null;          // popup belongs only to the Odds tab
  if (!state.aiModalKey){ host.innerHTML = ''; return; }
  const r = aiResolveKey(state.aiModalKey);
  if (!r || !r.rec){ state.aiModalKey = null; host.innerHTML = ''; return; }

  const rec = r.rec;
  const col = confidenceColor(rec.confidence);
  const pct = Math.round(rec.confidence * 100);
  const marketLabel = rec.pick.market === 'fight' ? 'moneyline' : rec.pick.market;
  const title = r.fight
    ? `${r.fight.f1.name} vs ${r.fight.f2.name}`
    : `${r.d.teams[r.m.away].name} @ ${r.d.teams[r.m.home].name}`;
  const factors = rec.factors.map(f => {
    const fc = f.lean === 'for' ? 'var(--color-text-success)' : 'var(--color-text-danger)';
    const sym = f.lean === 'for' ? '▲' : '▼';
    return `<li style="display:flex; gap:8px; padding:7px 0; border-bottom:0.5px solid var(--color-border-tertiary); font-size:12px; line-height:1.45;"><span style="color:${fc}; flex-shrink:0; font-size:10px; padding-top:2px;">${sym}</span><span>${escapeHtml(f.text)}</span></li>`;
  }).join('');

  host.innerHTML = `
    <div data-ai-close="1" style="position:absolute; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:flex-end; z-index:50;">
      <div style="background:var(--color-background-primary); width:100%; max-height:80%; overflow-y:auto; border-radius:18px 18px 0 0; padding:16px 18px 22px; box-shadow:0 -6px 24px rgba(0,0,0,0.25);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <div style="min-width:0;">
            <p style="margin:0; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:var(--color-text-tertiary);">🤖 AI Pick · ${marketLabel}</p>
            <p style="margin:3px 0 0; font-size:17px; font-weight:600;">${escapeHtml(rec.pick.label)} <span style="color:var(--color-text-secondary); font-weight:500;">${oddsFmt(rec.pick.price)}</span></p>
            <p style="margin:2px 0 0; font-size:11px; color:var(--color-text-tertiary);">${escapeHtml(title)}</p>
          </div>
          <button data-ai-close="1" style="background:var(--color-background-secondary); border:none; border-radius:50%; width:30px; height:30px; font-size:15px; cursor:pointer; color:var(--color-text-secondary); flex-shrink:0; line-height:1;">✕</button>
        </div>

        <div style="margin:16px 0 5px; display:flex; align-items:center; justify-content:space-between;">
          <span style="font-size:11px; color:var(--color-text-secondary);">Confidence it hits</span>
          <span style="font-size:15px; font-weight:700; color:${col};">${pct}%</span>
        </div>
        <div style="height:8px; border-radius:4px; background:var(--color-background-secondary); overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:${col};"></div>
        </div>

        <p style="margin:15px 0 0; font-size:13px; line-height:1.5;">${escapeHtml(rec.summary)}</p>

        <p style="margin:16px 0 2px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:var(--color-text-tertiary);">Why this pick</p>
        <ul style="list-style:none; margin:0; padding:0;">${factors}</ul>

        <p style="margin:14px 0 0; font-size:10px; color:var(--color-text-tertiary); line-height:1.45;">AI estimate from model probabilities and current prices — not a guaranteed outcome. Markets carry vig; bet responsibly.</p>
      </div>
    </div>`;

  // Close on backdrop tap or the ✕ button (but not when tapping inside the sheet).
  host.querySelectorAll('[data-ai-close]').forEach(el => el.addEventListener('click', (e) => {
    if (e.target !== el) return;
    state.aiModalKey = null;
    renderAiModal();
  }));
  if (!_aiEscBound){
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.aiModalKey){ state.aiModalKey = null; renderAiModal(); }
    });
    _aiEscBound = true;
  }
}
