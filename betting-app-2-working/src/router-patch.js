// =============================================================================
// ROUTER PATCH
// Wraps the base renderContent (from router.js) so Compare and Favorites
// can intercept rendering when their respective pickers are open.
// =============================================================================

// ============================================================
const _origRenderContent = renderContent;
renderContent = function(){
  const c = document.getElementById('content');
  let result;
  if (state.tab === 'compare') result = renderCompareWrapper(c);
  else if (state.tab === 'favorites') result = renderFavoritesWrapper(c);
  else result = _origRenderContent();
  // Reconcile the AI-pick popup after every render: keeps it in sync with live
  // data on the Odds tab, and clears it when navigating away.
  if (typeof renderAiModal === 'function') renderAiModal();
  return result;
};

// ============================================================
// SUBSCRIBE TO DATA UPDATES
// ============================================================
DataSource.subscribe((eventType, payload) => {
  if (eventType === 'mode-change'){
    renderStatusBanner();
    renderContent();
  } else if (eventType === 'data-update'){
    renderContent();
  }
});

// ============================================================
// DEV CONTROLS
// ============================================================
