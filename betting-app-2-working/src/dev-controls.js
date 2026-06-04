// =============================================================================
// DEV CONTROLS
// The two buttons under the phone: "Fake live" toggle (simulates score ticks)
// and "Simulate API failure" (puts DataSource into degraded mode).
// Subscribes to DataSource mode changes to re-render the banner.
// =============================================================================

const fakeLiveBtn = document.getElementById('toggle-fake-live');
const failBtn = document.getElementById('simulate-failure');

DataSource.startFakeLive(); // ON by default

fakeLiveBtn.addEventListener('click', () => {
  if (DataSource.isFakeLive()){
    DataSource.stopFakeLive();
    fakeLiveBtn.textContent = 'Fake live: OFF';
    fakeLiveBtn.style.background = 'var(--color-background-secondary)';
    fakeLiveBtn.style.color = 'var(--color-text-secondary)';
  } else {
    DataSource.startFakeLive();
    fakeLiveBtn.textContent = 'Fake live: ON';
    fakeLiveBtn.style.background = 'var(--color-background-info)';
    fakeLiveBtn.style.color = 'var(--color-text-info)';
  }
});

let failureSim = false;
failBtn.addEventListener('click', () => {
  failureSim = !failureSim;
  DataSource.setSimulateFailure(failureSim);
  failBtn.textContent = failureSim ? 'Restore' : 'Simulate API failure';
});

// ============================================================
// LOCAL BACKEND LIVE DATA (multi-sport)
// ============================================================
//
// When ON: fetches every sport endpoint your local backend exposes
// in parallel, replaces ALL matches in mockData with real ESPN data,
// and triggers a full re-render. Mock games are gone — you only see
// real games while this is active.
//
// When OFF: restores the original mock data so the prototype works
// offline again.
//
// Visualizations (heat maps, shot charts, etc.) keep showing because
// they're not fetchable from ESPN's public endpoint — they show as
// sample/illustrative data with a warning banner.
//
