// =============================================================================
// DATASOURCE
// Owns the read path for data. Has 4 modes: mock | live | degraded | fake-live.
// Falls back to mock when API is unavailable. Pub/sub for re-renders.
// =============================================================================

// ============================================================
// DATASOURCE — handles mock/live/degraded modes
// ============================================================
const DataSource = (function(){
  let mode = 'mock';
  let liveData = null;
  const subscribers = new Set();
  let ws = null;
  let pollingTimers = {};
  let fakeLiveTimer = null;
  let simulateFailure = false;

  function setMode(newMode){ if (mode === newMode) return; mode = newMode; notifyAll('mode-change', {mode}); }
  function notifyAll(eventType, payload){ subscribers.forEach(cb => { try { cb(eventType, payload); } catch(e){ console.error(e); } }); }
  function getMode(){ return mode; }
  function getActive(leagueId){ if (mode === 'live' && liveData && liveData[leagueId]) return liveData[leagueId]; return mockData[leagueId]; }
  function getAll(){ if (mode === 'live' && liveData) return liveData; return mockData; }
  function subscribe(cb){ subscribers.add(cb); return () => subscribers.delete(cb); }

  async function init(){
    if (!API_CONFIG.baseUrl){ console.info('[DataSource] No API configured. Mock mode.'); setMode('mock'); return; }
    const healthy = await healthCheck();
    if (healthy){
      try { liveData = await fetchAllLeagues(); setMode('live'); startLiveUpdates(); }
      catch(err){ console.warn('[DataSource] Initial fetch failed', err); setMode('degraded'); }
    } else { setMode('degraded'); }
  }

  async function healthCheck(){
    if (simulateFailure) return false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), API_CONFIG.healthCheckTimeoutMs);
      const res = await fetch(`${API_CONFIG.baseUrl}/health`, { headers: authHeaders(), signal: ctrl.signal });
      clearTimeout(timer); return res.ok;
    } catch(err){ return false; }
  }

  function authHeaders(){ const h = { 'Content-Type': 'application/json' }; if (API_CONFIG.apiKey) h['Authorization'] = `Bearer ${API_CONFIG.apiKey}`; return h; }

  async function fetchAllLeagues(){
    const res = await fetch(`${API_CONFIG.baseUrl}/leagues`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return transformBackendShape(await res.json());
  }

  // Transform backend's response shape to match mockData. Plug in shape mapping here.
  function transformBackendShape(raw){ return raw; }

  function startLiveUpdates(){ if (API_CONFIG.wsUrl) connectWebSocket(); else startPolling(); }

  function connectWebSocket(){
    let reconnectDelay = API_CONFIG.wsReconnect.initialDelayMs;
    function open(){
      try {
        ws = new WebSocket(API_CONFIG.wsUrl + (API_CONFIG.apiKey ? `?token=${API_CONFIG.apiKey}` : ''));
        ws.onopen = () => { reconnectDelay = API_CONFIG.wsReconnect.initialDelayMs; };
        ws.onmessage = (event) => { try { applyUpdate(JSON.parse(event.data)); } catch(e){ console.warn(e); } };
        ws.onclose = () => { if (mode !== 'live') return; setTimeout(open, reconnectDelay); reconnectDelay = Math.min(reconnectDelay * API_CONFIG.wsReconnect.factor, API_CONFIG.wsReconnect.maxDelayMs); };
        ws.onerror = (err) => { console.warn('[DataSource] WS error', err); };
      } catch(err){ console.warn(err); startPolling(); }
    }
    open();
  }

  function startPolling(){
    pollingTimers.live = setInterval(async () => {
      try {
        const res = await fetch(`${API_CONFIG.baseUrl}/games?status=live`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        (await res.json()).forEach(applyUpdate);
      } catch(err){ console.warn('[DataSource] Polling failed', err); }
    }, API_CONFIG.polling.liveGames);
  }

  function applyUpdate(update){
    if (!liveData) return;
    const league = liveData[update.leagueId];
    if (!league) return;
    if (update.type === 'score' && league.matches[update.matchIndex]){
      const m = league.matches[update.matchIndex];
      if (typeof update.hs === 'number') m.hs = update.hs;
      if (typeof update.as === 'number') m.as = update.as;
      if (update.time) m.time = update.time;
      if (update.status) m.status = update.status;
    } else if (update.type === 'odds' && league.matches[update.matchIndex]){
      league.matches[update.matchIndex].odds = update.odds;
    } else if (update.type === 'news'){
      league.news.unshift(update.news);
      league.news = league.news.slice(0, 10);
    }
    notifyAll('data-update', update);
  }

  // Fake live mode for testing without a backend
  function startFakeLive(){
    if (fakeLiveTimer) return;
    setMode('fake-live');
    fakeLiveTimer = setInterval(() => {
      const candidates = [];
      Object.entries(mockData).forEach(([leagueId, d]) => {
        if (!d.matches) return;
        d.matches.forEach((m, idx) => { if (m.status === 'LIVE' && m.hs !== null && m.as !== null) candidates.push({leagueId, idx, m}); });
      });
      if (!candidates.length) return;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const team = Math.random() < 0.5 ? 'hs' : 'as';
      pick.m[team] += 1;
      if (pick.m.odds && typeof pick.m.odds.w === 'number'){
        const drift = (Math.random() - 0.5) * 4;
        const newW = Math.max(20, Math.min(80, pick.m.odds.w + drift));
        if (pick.m.odds.d !== undefined){
          const remaining = 100 - newW;
          pick.m.odds.l = Math.round(remaining * (pick.m.odds.l / (pick.m.odds.l + pick.m.odds.d)));
          pick.m.odds.d = 100 - Math.round(newW) - pick.m.odds.l;
        } else { pick.m.odds.l = 100 - Math.round(newW); }
        pick.m.odds.w = Math.round(newW);
      }
      notifyAll('data-update', {type:'score', leagueId: pick.leagueId, matchIndex: pick.idx});
    }, 3500);
  }

  function stopFakeLive(){
    if (fakeLiveTimer){ clearInterval(fakeLiveTimer); fakeLiveTimer = null; }
    setMode(API_CONFIG.baseUrl ? 'live' : 'mock');
  }

  function isFakeLive(){ return fakeLiveTimer !== null; }

  function setSimulateFailure(v){
    simulateFailure = v;
    if (v && fakeLiveTimer) stopFakeLive();
    if (v) setMode('degraded');
    else setMode(API_CONFIG.baseUrl ? 'live' : 'mock');
  }

  return { init, getMode, getActive, getAll, subscribe, startFakeLive, stopFakeLive, isFakeLive, setSimulateFailure };
})();
