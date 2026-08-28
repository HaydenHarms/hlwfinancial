// Takes parsed workbook data (see parse-excel.js) and renders it into the
// dashboard DOM — both the compact cards on the main page and the expanded
// "window" content shown when a card is clicked (see app.js for the
// open/close wiring).

function hlwFmtMoney(n) {
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
}

function hlwFmtHours(n) {
  return (Math.round(n * 10) / 10).toLocaleString('en-US');
}

function hlwEsc(str) {
  const div = document.createElement('div');
  div.textContent = String(str == null ? '' : str);
  return div.innerHTML;
}

function hlwRenderMeta(data) {
  document.getElementById('meta-period').textContent = data.snapshot.period || '—';
}

function hlwSnapshotCellsHtml(s) {
  const netClass = s.netIncome > 0 ? ' positive' : (s.netIncome < 0 ? ' negative' : '');
  const cells = [
    ['Revenue', hlwFmtMoney(s.revenue), ''],
    ['Expenses', hlwFmtMoney(s.expenses), ''],
    ['Net income', hlwFmtMoney(s.netIncome), netClass],
    ['Cash on hand', hlwFmtMoney(s.cash), ''],
    ['Active clients', s.activeClients || 0, '']
  ];
  return cells.map(([label, value, cls]) =>
    `<div><div class="metric-label">${hlwEsc(label)}</div><div class="metric-value${cls}">${hlwEsc(value)}</div></div>`
  ).join('');
}

function hlwRenderSnapshot(data) {
  document.getElementById('snapshot-grid').innerHTML = hlwSnapshotCellsHtml(data.snapshot);
}

function hlwStageChipClass(stage) {
  const s = String(stage).trim().toLowerCase();
  if (s.includes('active')) return 'stage-chip stage-active';
  if (s.includes('onboard')) return 'stage-chip stage-onboarding';
  if (s.includes('review')) return 'stage-chip stage-review';
  if (s.includes('docs') || s.includes('document')) return 'stage-chip stage-docs';
  if (s.includes('prospect')) return 'stage-chip stage-prospect';
  return 'stage-chip stage-other';
}

function hlwPipelineRowsHtml(rows) {
  return rows.map(row => {
    const isRecurring = String(row.type).trim().toLowerCase().includes('recur');
    const stage = String(row.stage || '').trim();
    const partner = String(row.partner || '').trim();
    return `<tr data-stage="${hlwEsc(stage)}" data-partner="${hlwEsc(partner)}">
      <td class="hi">${hlwEsc(row.client)}</td>
      <td>${hlwEsc(row.engagement)}</td>
      <td><span class="rec-chip${isRecurring ? ' recurring' : ''}">${hlwEsc(row.type || (isRecurring ? 'Recurring' : 'One-off'))}</span></td>
      <td><span class="${hlwStageChipClass(row.stage)}">${hlwEsc(row.stage)}</span></td>
      <td>${hlwEsc(row.partner)}</td>
    </tr>`;
  }).join('');
}

// `filters` (optional, {stage, partner}) is the same pipelineFilterState
// object app.js uses for the modal's filter dropdowns (see
// wirePipelineFilters/closeModal in app.js) -- applying it here too keeps
// the compact card in sync with whatever was last selected in the modal,
// rather than always showing the full unfiltered list.
function hlwRenderPipeline(data, filters) {
  const body = document.getElementById('pipeline-body');
  const empty = document.getElementById('pipeline-empty');
  const badge = document.getElementById('pipeline-filter-badge');
  const f = filters || {};
  const isFiltered = !!(f.stage || f.partner);

  if (badge) {
    badge.hidden = !isFiltered;
    if (isFiltered) {
      badge.textContent = 'Filtered: ' + [f.stage, f.partner].filter(Boolean).join(' · ');
    }
  }

  if (!data.pipeline.length) {
    body.innerHTML = '';
    empty.textContent = 'No pipeline data in the workbook.';
    empty.hidden = false;
    return;
  }

  const rows = data.pipeline.filter(r =>
    (!f.stage || String(r.stage || '').trim() === f.stage) &&
    (!f.partner || String(r.partner || '').trim() === f.partner)
  );

  if (!rows.length) {
    body.innerHTML = '';
    empty.textContent = 'No engagements match the active filter.';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  body.innerHTML = hlwPipelineRowsHtml(rows);
}

function hlwPartnersListHtml(partners) {
  return partners.map(p => {
    const balanceRow = p.capitalBalance !== null
      ? `<div class="partner-row"><span>Capital balance</span><span>${hlwEsc(hlwFmtMoney(p.capitalBalance))}</span></div>`
      : '';
    return `<div class="partner">
      <div class="partner-name">${hlwEsc(p.partner)}</div>
      <div class="partner-row"><span>Hours logged</span><span>${hlwEsc(hlwFmtHours(p.hours))}</span></div>
      ${balanceRow}
    </div>`;
  }).join('');
}

function hlwRenderPartners(data) {
  const list = document.getElementById('partners-list');
  const empty = document.getElementById('partners-empty');
  if (!data.partners.length) {
    list.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  list.innerHTML = hlwPartnersListHtml(data.partners);
}

// Pairs a dollar amount with the partner assigned to that role, as a
// small sub-label under the figure — e.g. "$540" with "Drew Wigley"
// beneath it. Falls back to just the amount if no name was entered in
// that row's Procurer/Preparer/Reviewer/Bookkeeper column.
function hlwAmountWithName(amount, name) {
  const nameHtml = name ? `<div class="cell-sub">${hlwEsc(name)}</div>` : '';
  return `<td class="amount">${hlwEsc(hlwFmtMoney(amount))}${nameHtml}</td>`;
}

function hlwWaterfallRowsHtml(rows) {
  return rows.map(row => {
    if (row.type === 'Bookkeeping') {
      return `<tr>
        <td class="hi">${hlwEsc(row.client)}</td>
        <td><span class="engagement-chip type-bookkeeping">Bookkeeping</span></td>
        <td class="amount">${hlwEsc(hlwFmtMoney(row.gross))}</td>
        <td class="amount">—</td>
        <td class="amount">—</td>
        <td class="amount">—</td>
        ${hlwAmountWithName(row.amounts.bookkeeper, row.bookkeeper)}
        <td class="amount">${hlwEsc(hlwFmtMoney(row.amounts.capital))}</td>
      </tr>`;
    }
    return `<tr>
      <td class="hi">${hlwEsc(row.client)}</td>
      <td><span class="engagement-chip type-tax">Tax Prep</span></td>
      <td class="amount">${hlwEsc(hlwFmtMoney(row.gross))}</td>
      ${hlwAmountWithName(row.amounts.procurer, row.procurer)}
      ${hlwAmountWithName(row.amounts.preparer, row.preparer)}
      ${hlwAmountWithName(row.amounts.reviewer, row.reviewer)}
      <td class="amount">—</td>
      <td class="amount">${hlwEsc(hlwFmtMoney(row.amounts.capital))}</td>
    </tr>`;
  }).join('');
}

function hlwRenderWaterfall(data) {
  const body = document.getElementById('waterfall-body');
  const empty = document.getElementById('waterfall-empty');
  if (!data.waterfall.length) {
    body.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  body.innerHTML = hlwWaterfallRowsHtml(data.waterfall);
}

// `pipelineFilters` is optional and threaded straight through to
// hlwRenderPipeline -- see its comment above.
function hlwRenderDashboard(data, pipelineFilters) {
  hlwRenderMeta(data);
  hlwRenderSnapshot(data);
  hlwRenderPipeline(data, pipelineFilters);
  hlwRenderPartners(data);
  hlwRenderWaterfall(data);
}

// ---- Expanded card ("window") content — see app.js for open/close wiring ----

const HLW_MODAL_META = {
  pipeline: { title: 'Client pipeline' },
  partners: { title: 'Hours & capital' },
  waterfall: { title: 'Profit-split waterfall — this month' }
};

function hlwModalSubtitle(cardKey, data) {
  switch (cardKey) {
    case 'pipeline': return data.pipeline.length + ' engagement' + (data.pipeline.length === 1 ? '' : 's');
    case 'partners': return data.partners.length + ' partner' + (data.partners.length === 1 ? '' : 's') + ' tracked';
    case 'waterfall': return data.waterfall.length + ' engagement' + (data.waterfall.length === 1 ? '' : 's') + ' this period';
    default: return '';
  }
}

function hlwPipelineBreakdownHtml(rows) {
  const byStage = {};
  rows.forEach(r => {
    const stage = String(r.stage).trim() || 'Unspecified';
    byStage[stage] = (byStage[stage] || 0) + 1;
  });
  const items = Object.entries(byStage).map(([stage, count]) =>
    `<div class="breakdown-item"><b>${hlwEsc(count)}</b> ${hlwEsc(stage)}</div>`
  ).join('');
  return `<div class="breakdown-list">${items}</div>`;
}

// Two custom dropdown filters (stage, partner) for the pipeline modal's
// full engagement table. Deliberately NOT native <select> elements --
// the open options list of a native <select> is rendered by the OS/browser
// and largely unstylable (font, colors), which is exactly what made the
// first version hard to read. This builds the same look/behavior as the
// site's other custom dropdowns (e.g. the period selector).
// Options are derived from whatever values actually appear in the data --
// no hardcoded stage/partner list to keep in sync. `selected` lets the
// caller restore a previously-chosen filter (see wirePipelineFilters in
// app.js, which persists filter state across modal close/reopen).
function hlwFilterDropdownHtml(id, label, allLabel, options, selected) {
  const optionsHtml = options.map(opt =>
    `<button type="button" class="filter-option${opt === selected ? ' active' : ''}" data-value="${hlwEsc(opt)}">${hlwEsc(opt)}</button>`
  ).join('');
  const currentLabel = selected || allLabel;
  return `<div class="filter-dropdown" id="${id}" data-value="${hlwEsc(selected || '')}">
    <button type="button" class="filter-dropdown-trigger" aria-haspopup="listbox" aria-label="${hlwEsc(label)}">
      <span class="filter-dropdown-value">${hlwEsc(currentLabel)}</span>
      <svg viewBox="0 0 20 20" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7.5 10 12.5 15 7.5"/></svg>
    </button>
    <div class="filter-dropdown-menu" role="listbox" hidden>
      <button type="button" class="filter-option${selected ? '' : ' active'}" data-value="">${hlwEsc(allLabel)}</button>
      ${optionsHtml}
    </div>
  </div>`;
}

function hlwPipelineFiltersHtml(rows, selectedStage, selectedPartner) {
  const stages = Array.from(new Set(rows.map(r => String(r.stage || '').trim()).filter(Boolean))).sort();
  const partners = Array.from(new Set(rows.map(r => String(r.partner || '').trim()).filter(Boolean))).sort();
  return `<div class="pipeline-filters">
    ${hlwFilterDropdownHtml('pipeline-filter-stage', 'Filter by stage', 'All stages', stages, selectedStage)}
    ${hlwFilterDropdownHtml('pipeline-filter-partner', 'Filter by partner', 'All partners', partners, selectedPartner)}
  </div>`;
}

// Builds the HTML for the expanded body of whichever card was clicked.
// `pipelineFilters` (optional, {stage, partner}) restores a previously
// chosen filter selection -- see wirePipelineFilters in app.js.
function hlwBuildModalBody(cardKey, data, pipelineFilters) {
  switch (cardKey) {
    case 'pipeline': {
      if (!data.pipeline.length) return '<div class="table-empty">No pipeline data in the workbook.</div>';
      const filters = pipelineFilters || {};
      return `
        ${hlwPipelineBreakdownHtml(data.pipeline)}
        <div class="modal-section-sub">All engagements</div>
        ${hlwPipelineFiltersHtml(data.pipeline, filters.stage, filters.partner)}
        <table class="data-table" id="pipeline-modal-table">
          <thead><tr><th>Client</th><th>Engagement</th><th>Type</th><th>Stage</th><th>Partner</th></tr></thead>
          <tbody>${hlwPipelineRowsHtml(data.pipeline)}</tbody>
        </table>
        <div class="table-empty" id="pipeline-filter-empty" hidden>No engagements match those filters.</div>`;
    }

    case 'partners':
      if (!data.partners.length) return '<div class="table-empty">No hours/capital data in the workbook.</div>';
      return hlwPartnersListHtml(data.partners);

    case 'waterfall': {
      if (!data.waterfall.length) return '<div class="table-empty">No waterfall data in the workbook.</div>';
      const agg = hlwAggregateEarningsByPartner(data.waterfall);
      const totalsRows = agg.byPartner.map(p =>
        `<tr><td class="hi">${hlwEsc(p.partner)}</td><td class="amount">${hlwEsc(hlwFmtMoney(p.amount))}</td></tr>`
      ).join('') + `<tr><td>Capital accounts</td><td class="amount">${hlwEsc(hlwFmtMoney(agg.capitalTotal))}</td></tr>`;
      return `
        <div class="modal-section-sub">By engagement</div>
        <table class="data-table">
          <thead><tr><th>Client</th><th>Type</th><th class="num-col">Gross profit</th><th class="num-col">Procurer 10%</th><th class="num-col">Preparer 45%</th><th class="num-col">Reviewer 15%</th><th class="num-col">Bookkeeper 60%</th><th class="num-col">Capital accts 30%</th></tr></thead>
          <tbody>${hlwWaterfallRowsHtml(data.waterfall)}</tbody>
        </table>
        <div class="waterfall-note">Tax prep: 10% procurer / 45% preparer / 15% reviewer / 30% capital accounts. Bookkeeping: 60% guaranteed payment to assigned bookkeeper, remaining 40% to capital accounts.</div>
        <div class="modal-section-sub">Total this month, by partner</div>
        <table class="data-table modal-totals">
          <thead><tr><th>Partner</th><th class="num-col">Total</th></tr></thead>
          <tbody>${totalsRows}</tbody>
        </table>`;
    }
    default:
      return '';
  }
}

// Builds a Plottable (github.com/palantir/plottable) bar chart of this
// month's total earnings by partner, plus what's retained in capital
// accounts, for the waterfall card modal. Returns a Plottable.Components.Table
// ready for .renderTo(...), or null if there's nothing to chart. Only the
// waterfall card has a chart, for now.
function hlwBuildWaterfallChart(data) {
  if (typeof Plottable === 'undefined' || !data.waterfall.length) return null;
  const agg = hlwAggregateEarningsByPartner(data.waterfall);
  if (!agg.byPartner.length) return null;

  const rows = agg.byPartner.map(p => ({ label: p.partner, amount: p.amount, isCapital: false }));
  rows.push({ label: 'Capital accts', amount: agg.capitalTotal, isCapital: true });

  const gold = '#b6a25c';
  const muted = 'rgba(247,245,239,0.3)';

  const xScale = new Plottable.Scales.Category();
  const yScale = new Plottable.Scales.Linear();
  // Pad the y-domain above the tallest bar. Without this, the tallest bar
  // touches the top of the plot with zero headroom, and Plottable silently
  // refuses to draw ANY bar labels (not just that one) when a label doesn't
  // fit -- confirmed by rendering this exact chart standalone and inspecting
  // the generated SVG; the bar-label-text-area group existed but was empty.
  const maxAmount = Math.max(0, ...rows.map(r => r.amount));
  yScale.domain([0, maxAmount > 0 ? maxAmount * 1.2 : 1]);

  const xAxis = new Plottable.Axes.Category(xScale, 'bottom');
  const yAxis = new Plottable.Axes.Numeric(yScale, 'left');
  yAxis.formatter(v => hlwFmtMoney(v));

  const gridlines = new Plottable.Components.Gridlines(null, yScale);

  const barPlot = new Plottable.Plots.Bar('vertical');
  barPlot.addDataset(new Plottable.Dataset(rows));
  barPlot.x(d => d.label, xScale);
  barPlot.y(d => d.amount, yScale);
  barPlot.attr('fill', d => d.isCapital ? muted : gold);
  // Not using Plottable's built-in labelsEnabled()/labelFormatter() -- its
  // Typesettable-based label writer proved unreliable to verify (it silently
  // no-ops if SVG text measurement fails, per its own source, swallowing the
  // error). Drawing bar-value labels manually instead, right after renderTo,
  // using the bars' own rendered <rect> coordinates -- see
  // hlwDrawBarValueLabels below, called from app.js.
  barPlot.animated(false);

  const plotArea = new Plottable.Components.Group([gridlines, barPlot]);

  const table = new Plottable.Components.Table([
    [yAxis, plotArea],
    [null, xAxis]
  ]);

  return { table, rows };
}

// Draws each bar's dollar value as plain SVG <text> above it, using the
// bars' own already-rendered <rect> coordinates -- call this right after
// table.renderTo(container). `rows` must be in the same order as the
// dataset passed to the Bar plot (hlwBuildWaterfallChart guarantees this).
// Safe to call repeatedly (e.g. on resize): clears any labels it previously
// drew before adding new ones.
function hlwDrawBarValueLabels(container, rows) {
  container.querySelectorAll('.hlw-bar-value-label').forEach(el => el.remove());
  const rects = container.querySelectorAll('.bar-area rect');
  if (!rects.length || !rows) return;
  const svgNS = 'http://www.w3.org/2000/svg';
  rects.forEach((rect, i) => {
    const row = rows[i];
    if (!row) return;
    const x = parseFloat(rect.getAttribute('x')) + parseFloat(rect.getAttribute('width')) / 2;
    const barTop = parseFloat(rect.getAttribute('y'));
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('class', 'hlw-bar-value-label');
    text.setAttribute('x', x);
    text.setAttribute('y', Math.max(barTop - 6, 10));
    text.setAttribute('text-anchor', 'middle');
    text.textContent = hlwFmtMoney(row.amount);
    rect.parentNode.appendChild(text);
  });
}

// ---- PDF export report ----
// Builds a dedicated, standalone report document (cover page + content
// pages) as its own HTML fragment -- entirely separate from the on-screen
// dashboard DOM, not just the dashboard cards reflowed onto paper. Printed
// via print.css's .report-* rules (only active for print/"Save as PDF"),
// triggered by the Export PDF button in app.js. Same bar-heights sequence
// as the original reportlab prototype, so the cover's skyline matches.

// Approved cover-page diagram (flowing, braided ribbon lines, HLW's own
// signal-color palette, disorganized-left to organized-right) -- a fixed,
// deterministic piece of art, not regenerated per export. Embedded INLINE
// (not an external <img src>) so it's guaranteed present in the DOM before
// window.print() fires, no network/load-timing risk. Generated by
// build_cover_svg.py (kept as the source of truth / regeneration script,
// not part of the deployed site).
const HLW_COVER_DIAGRAM_SVG = `<svg viewBox="0 0 850 473" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><path d="M0,85.27 C425.00,85.27 425.00,413.90 850,413.90" stroke="#eef3ef" stroke-width="1.5" fill="none" opacity="0.93"/><path d="M0,198.76 C425.00,198.76 425.00,441.98 850,441.98" stroke="#eef3ef" stroke-width="0.92" fill="none" opacity="0.87"/><path d="M0,445.47 C425.00,445.47 425.00,464.01 850,464.01" stroke="#eef3ef" stroke-width="1.85" fill="none" opacity="0.78"/><path d="M0,422.82 C425.00,422.82 425.00,464.39 850,464.39" stroke="#eef3ef" stroke-width="1.11" fill="none" opacity="0.91"/><path d="M0,9.69 C425.00,9.69 425.00,419.76 850,419.76" stroke="#eef3ef" stroke-width="1.31" fill="none" opacity="0.79"/><path d="M0,359.00 C425.00,359.00 425.00,462.05 850,462.05" stroke="#eef3ef" stroke-width="1.35" fill="none" opacity="0.83"/><path d="M0,52.82 C425.00,52.82 425.00,417.79 850,417.79" stroke="#eef3ef" stroke-width="1.83" fill="none" opacity="0.9"/><path d="M0,26.33 C425.00,26.33 425.00,441.65 850,441.65" stroke="#eef3ef" stroke-width="1.42" fill="none" opacity="0.96"/><path d="M0,339.54 C425.00,339.54 425.00,449.01 850,449.01" stroke="#eef3ef" stroke-width="1.62" fill="none" opacity="0.99"/><path d="M0,466.70 C425.00,466.70 425.00,433.10 850,433.10" stroke="#eef3ef" stroke-width="1.21" fill="none" opacity="0.95"/><path d="M0,30.12 C425.00,30.12 425.00,434.70 850,434.70" stroke="#eef3ef" stroke-width="0.99" fill="none" opacity="0.83"/><path d="M0,33.29 C425.00,33.29 425.00,430.22 850,430.22" stroke="#eef3ef" stroke-width="1.93" fill="none" opacity="0.98"/><path d="M0,374.91 C425.00,374.91 425.00,446.59 850,446.59" stroke="#eef3ef" stroke-width="1.7" fill="none" opacity="0.84"/><path d="M0,79.85 C425.00,79.85 425.00,439.02 850,439.02" stroke="#eef3ef" stroke-width="1.85" fill="none" opacity="0.77"/><path d="M0,9.81 C425.00,9.81 425.00,459.17 850,459.17" stroke="#eef3ef" stroke-width="1.29" fill="none" opacity="0.93"/><path d="M0,347.50 C425.00,347.50 425.00,468.96 850,468.96" stroke="#eef3ef" stroke-width="1.42" fill="none" opacity="0.84"/><path d="M0,381.51 C425.00,381.51 425.00,458.81 850,458.81" stroke="#eef3ef" stroke-width="1.75" fill="none" opacity="0.95"/><path d="M0,303.77 C425.00,303.77 425.00,470.43 850,470.43" stroke="#eef3ef" stroke-width="1.33" fill="none" opacity="0.93"/><path d="M0,449.27 C425.00,449.27 425.00,432.88 850,432.88" stroke="#eef3ef" stroke-width="1.7" fill="none" opacity="0.84"/><path d="M0,218.31 C425.00,218.31 425.00,417.25 850,417.25" stroke="#eef3ef" stroke-width="0.93" fill="none" opacity="0.94"/><path d="M0,214.16 C425.00,214.16 425.00,450.27 850,450.27" stroke="#eef3ef" stroke-width="1.86" fill="none" opacity="0.85"/><path d="M0,173.88 C425.00,173.88 425.00,422.91 850,422.91" stroke="#eef3ef" stroke-width="1.93" fill="none" opacity="0.96"/><path d="M0,347.28 C425.00,347.28 425.00,465.48 850,465.48" stroke="#eef3ef" stroke-width="1.74" fill="none" opacity="0.92"/><path d="M0,91.30 C425.00,91.30 425.00,458.99 850,458.99" stroke="#eef3ef" stroke-width="1.33" fill="none" opacity="0.86"/><path d="M0,150.83 C425.00,150.83 425.00,446.98 850,446.98" stroke="#eef3ef" stroke-width="1.76" fill="none" opacity="0.89"/><path d="M0,150.50 C425.00,150.50 425.00,425.87 850,425.87" stroke="#eef3ef" stroke-width="2.0" fill="none" opacity="0.83"/><path d="M0,207.28 C425.00,207.28 425.00,349.45 850,349.45" stroke="#5fae82" stroke-width="1.29" fill="none" opacity="0.77"/><path d="M0,162.58 C425.00,162.58 425.00,386.69 850,386.69" stroke="#5fae82" stroke-width="2.17" fill="none" opacity="0.91"/><path d="M0,127.38 C425.00,127.38 425.00,383.52 850,383.52" stroke="#5fae82" stroke-width="1.72" fill="none" opacity="0.96"/><path d="M0,252.44 C425.00,252.44 425.00,398.86 850,398.86" stroke="#5fae82" stroke-width="1.44" fill="none" opacity="0.82"/><path d="M0,245.49 C425.00,245.49 425.00,399.54 850,399.54" stroke="#5fae82" stroke-width="1.84" fill="none" opacity="0.87"/><path d="M0,235.32 C425.00,235.32 425.00,383.04 850,383.04" stroke="#5fae82" stroke-width="1.48" fill="none" opacity="0.89"/><path d="M0,459.37 C425.00,459.37 425.00,400.14 850,400.14" stroke="#5fae82" stroke-width="1.99" fill="none" opacity="0.78"/><path d="M0,263.23 C425.00,263.23 425.00,366.02 850,366.02" stroke="#5fae82" stroke-width="2.09" fill="none" opacity="0.83"/><path d="M0,440.25 C425.00,440.25 425.00,358.30 850,358.30" stroke="#5fae82" stroke-width="1.45" fill="none" opacity="0.99"/><path d="M0,281.67 C425.00,281.67 425.00,400.12 850,400.12" stroke="#5fae82" stroke-width="1.6" fill="none" opacity="0.81"/><path d="M0,337.23 C425.00,337.23 425.00,375.38 850,375.38" stroke="#5fae82" stroke-width="1.56" fill="none" opacity="0.78"/><path d="M0,68.55 C425.00,68.55 425.00,399.97 850,399.97" stroke="#5fae82" stroke-width="2.14" fill="none" opacity="0.99"/><path d="M0,169.23 C425.00,169.23 425.00,346.70 850,346.70" stroke="#5fae82" stroke-width="1.62" fill="none" opacity="0.93"/><path d="M0,306.53 C425.00,306.53 425.00,347.13 850,347.13" stroke="#5fae82" stroke-width="1.2" fill="none" opacity="0.93"/><path d="M0,26.06 C425.00,26.06 425.00,394.96 850,394.96" stroke="#5fae82" stroke-width="2.19" fill="none" opacity="0.81"/><path d="M0,25.60 C425.00,25.60 425.00,402.99 850,402.99" stroke="#5fae82" stroke-width="1.9" fill="none" opacity="0.86"/><path d="M0,226.22 C425.00,226.22 425.00,399.12 850,399.12" stroke="#5fae82" stroke-width="1.36" fill="none" opacity="0.76"/><path d="M0,290.41 C425.00,290.41 425.00,362.78 850,362.78" stroke="#5fae82" stroke-width="1.79" fill="none" opacity="0.99"/><path d="M0,170.55 C425.00,170.55 425.00,358.83 850,358.83" stroke="#5fae82" stroke-width="0.97" fill="none" opacity="0.96"/><path d="M0,37.07 C425.00,37.07 425.00,401.33 850,401.33" stroke="#5fae82" stroke-width="1.82" fill="none" opacity="0.98"/><path d="M0,385.23 C425.00,385.23 425.00,355.43 850,355.43" stroke="#5fae82" stroke-width="1.13" fill="none" opacity="0.99"/><path d="M0,137.66 C425.00,137.66 425.00,391.59 850,391.59" stroke="#5fae82" stroke-width="1.12" fill="none" opacity="0.82"/><path d="M0,318.56 C425.00,318.56 425.00,358.91 850,358.91" stroke="#5fae82" stroke-width="1.88" fill="none" opacity="0.97"/><path d="M0,151.54 C425.00,151.54 425.00,361.94 850,361.94" stroke="#5fae82" stroke-width="0.94" fill="none" opacity="0.86"/><path d="M0,30.96 C425.00,30.96 425.00,378.58 850,378.58" stroke="#5fae82" stroke-width="1.79" fill="none" opacity="0.89"/><path d="M0,285.56 C425.00,285.56 425.00,380.08 850,380.08" stroke="#5fae82" stroke-width="2.07" fill="none" opacity="0.88"/><path d="M0,407.44 C425.00,407.44 425.00,365.15 850,365.15" stroke="#5fae82" stroke-width="1.08" fill="none" opacity="0.81"/><path d="M0,375.22 C425.00,375.22 425.00,357.78 850,357.78" stroke="#5fae82" stroke-width="1.9" fill="none" opacity="0.98"/><path d="M0,257.50 C425.00,257.50 425.00,352.57 850,352.57" stroke="#5fae82" stroke-width="1.71" fill="none" opacity="0.84"/><path d="M0,429.70 C425.00,429.70 425.00,357.42 850,357.42" stroke="#5fae82" stroke-width="1.2" fill="none" opacity="0.87"/><path d="M0,233.45 C425.00,233.45 425.00,286.47 850,286.47" stroke="#5b93d9" stroke-width="1.39" fill="none" opacity="0.92"/><path d="M0,222.56 C425.00,222.56 425.00,278.75 850,278.75" stroke="#5b93d9" stroke-width="1.44" fill="none" opacity="0.85"/><path d="M0,211.72 C425.00,211.72 425.00,276.59 850,276.59" stroke="#5b93d9" stroke-width="1.26" fill="none" opacity="0.99"/><path d="M0,417.66 C425.00,417.66 425.00,331.85 850,331.85" stroke="#5b93d9" stroke-width="1.89" fill="none" opacity="0.86"/><path d="M0,443.44 C425.00,443.44 425.00,293.27 850,293.27" stroke="#5b93d9" stroke-width="1.67" fill="none" opacity="0.9"/><path d="M0,208.48 C425.00,208.48 425.00,290.24 850,290.24" stroke="#5b93d9" stroke-width="1.33" fill="none" opacity="0.91"/><path d="M0,134.34 C425.00,134.34 425.00,296.02 850,296.02" stroke="#5b93d9" stroke-width="1.36" fill="none" opacity="0.83"/><path d="M0,391.89 C425.00,391.89 425.00,308.05 850,308.05" stroke="#5b93d9" stroke-width="0.92" fill="none" opacity="0.94"/><path d="M0,237.53 C425.00,237.53 425.00,322.10 850,322.10" stroke="#5b93d9" stroke-width="1.54" fill="none" opacity="0.83"/><path d="M0,396.98 C425.00,396.98 425.00,285.60 850,285.60" stroke="#5b93d9" stroke-width="1.26" fill="none" opacity="0.87"/><path d="M0,406.72 C425.00,406.72 425.00,282.10 850,282.10" stroke="#5b93d9" stroke-width="1.34" fill="none" opacity="0.88"/><path d="M0,320.86 C425.00,320.86 425.00,281.49 850,281.49" stroke="#5b93d9" stroke-width="1.88" fill="none" opacity="0.89"/><path d="M0,244.61 C425.00,244.61 425.00,298.11 850,298.11" stroke="#5b93d9" stroke-width="1.31" fill="none" opacity="0.97"/><path d="M0,470.06 C425.00,470.06 425.00,285.71 850,285.71" stroke="#5b93d9" stroke-width="1.17" fill="none" opacity="0.92"/><path d="M0,361.64 C425.00,361.64 425.00,324.75 850,324.75" stroke="#5b93d9" stroke-width="1.29" fill="none" opacity="0.8"/><path d="M0,34.33 C425.00,34.33 425.00,297.83 850,297.83" stroke="#5b93d9" stroke-width="1.63" fill="none" opacity="0.97"/><path d="M0,15.63 C425.00,15.63 425.00,280.55 850,280.55" stroke="#5b93d9" stroke-width="1.75" fill="none" opacity="0.92"/><path d="M0,58.71 C425.00,58.71 425.00,280.96 850,280.96" stroke="#5b93d9" stroke-width="0.94" fill="none" opacity="0.91"/><path d="M0,132.37 C425.00,132.37 425.00,289.68 850,289.68" stroke="#5b93d9" stroke-width="1.76" fill="none" opacity="0.78"/><path d="M0,253.72 C425.00,253.72 425.00,280.63 850,280.63" stroke="#5b93d9" stroke-width="0.99" fill="none" opacity="0.92"/><path d="M0,374.43 C425.00,374.43 425.00,303.02 850,303.02" stroke="#5b93d9" stroke-width="1.42" fill="none" opacity="0.93"/><path d="M0,35.97 C425.00,35.97 425.00,291.92 850,291.92" stroke="#5b93d9" stroke-width="2.08" fill="none" opacity="0.99"/><path d="M0,18.16 C425.00,18.16 425.00,275.34 850,275.34" stroke="#5b93d9" stroke-width="1.9" fill="none" opacity="0.86"/><path d="M0,360.63 C425.00,360.63 425.00,313.91 850,313.91" stroke="#5b93d9" stroke-width="1.48" fill="none" opacity="0.93"/><path d="M0,285.94 C425.00,285.94 425.00,276.10 850,276.10" stroke="#5b93d9" stroke-width="1.51" fill="none" opacity="0.97"/><path d="M0,369.07 C425.00,369.07 425.00,314.63 850,314.63" stroke="#5b93d9" stroke-width="1.71" fill="none" opacity="0.95"/><path d="M0,137.80 C425.00,137.80 425.00,298.91 850,298.91" stroke="#5b93d9" stroke-width="1.72" fill="none" opacity="0.96"/><path d="M0,152.02 C425.00,152.02 425.00,285.31 850,285.31" stroke="#5b93d9" stroke-width="1.25" fill="none" opacity="0.86"/><path d="M0,46.57 C425.00,46.57 425.00,313.02 850,313.02" stroke="#5b93d9" stroke-width="2.07" fill="none" opacity="0.84"/><path d="M0,452.37 C425.00,452.37 425.00,300.44 850,300.44" stroke="#5b93d9" stroke-width="1.6" fill="none" opacity="0.99"/><path d="M0,335.85 C425.00,335.85 425.00,236.83 850,236.83" stroke="#4fb8ae" stroke-width="1.88" fill="none" opacity="0.87"/><path d="M0,341.30 C425.00,341.30 425.00,219.76 850,219.76" stroke="#4fb8ae" stroke-width="1.0" fill="none" opacity="0.9"/><path d="M0,247.70 C425.00,247.70 425.00,234.13 850,234.13" stroke="#4fb8ae" stroke-width="1.05" fill="none" opacity="0.98"/><path d="M0,52.85 C425.00,52.85 425.00,264.68 850,264.68" stroke="#4fb8ae" stroke-width="1.31" fill="none" opacity="0.82"/><path d="M0,444.61 C425.00,444.61 425.00,264.26 850,264.26" stroke="#4fb8ae" stroke-width="1.81" fill="none" opacity="0.99"/><path d="M0,82.76 C425.00,82.76 425.00,258.00 850,258.00" stroke="#4fb8ae" stroke-width="1.7" fill="none" opacity="0.82"/><path d="M0,282.11 C425.00,282.11 425.00,212.95 850,212.95" stroke="#4fb8ae" stroke-width="1.93" fill="none" opacity="0.91"/><path d="M0,50.63 C425.00,50.63 425.00,219.60 850,219.60" stroke="#4fb8ae" stroke-width="1.28" fill="none" opacity="0.87"/><path d="M0,109.09 C425.00,109.09 425.00,224.30 850,224.30" stroke="#4fb8ae" stroke-width="1.62" fill="none" opacity="0.79"/><path d="M0,356.32 C425.00,356.32 425.00,233.52 850,233.52" stroke="#4fb8ae" stroke-width="1.43" fill="none" opacity="0.89"/><path d="M0,74.58 C425.00,74.58 425.00,260.10 850,260.10" stroke="#4fb8ae" stroke-width="1.05" fill="none" opacity="0.89"/><path d="M0,456.42 C425.00,456.42 425.00,214.75 850,214.75" stroke="#4fb8ae" stroke-width="1.81" fill="none" opacity="0.99"/><path d="M0,471.03 C425.00,471.03 425.00,227.32 850,227.32" stroke="#4fb8ae" stroke-width="1.71" fill="none" opacity="0.99"/><path d="M0,295.41 C425.00,295.41 425.00,258.97 850,258.97" stroke="#4fb8ae" stroke-width="1.81" fill="none" opacity="0.76"/><path d="M0,163.43 C425.00,163.43 425.00,260.24 850,260.24" stroke="#4fb8ae" stroke-width="1.51" fill="none" opacity="0.86"/><path d="M0,144.23 C425.00,144.23 425.00,215.99 850,215.99" stroke="#4fb8ae" stroke-width="1.77" fill="none" opacity="0.85"/><path d="M0,417.24 C425.00,417.24 425.00,208.97 850,208.97" stroke="#4fb8ae" stroke-width="2.04" fill="none" opacity="0.77"/><path d="M0,389.52 C425.00,389.52 425.00,233.97 850,233.97" stroke="#4fb8ae" stroke-width="1.86" fill="none" opacity="0.86"/><path d="M0,74.99 C425.00,74.99 425.00,263.51 850,263.51" stroke="#4fb8ae" stroke-width="1.74" fill="none" opacity="0.8"/><path d="M0,282.15 C425.00,282.15 425.00,219.00 850,219.00" stroke="#4fb8ae" stroke-width="1.42" fill="none" opacity="0.9"/><path d="M0,288.66 C425.00,288.66 425.00,212.87 850,212.87" stroke="#4fb8ae" stroke-width="1.15" fill="none" opacity="0.86"/><path d="M0,244.14 C425.00,244.14 425.00,258.03 850,258.03" stroke="#4fb8ae" stroke-width="1.65" fill="none" opacity="0.95"/><path d="M0,174.87 C425.00,174.87 425.00,217.68 850,217.68" stroke="#4fb8ae" stroke-width="1.26" fill="none" opacity="0.76"/><path d="M0,172.23 C425.00,172.23 425.00,244.67 850,244.67" stroke="#4fb8ae" stroke-width="1.99" fill="none" opacity="0.81"/><path d="M0,333.83 C425.00,333.83 425.00,251.72 850,251.72" stroke="#4fb8ae" stroke-width="1.8" fill="none" opacity="0.99"/><path d="M0,274.28 C425.00,274.28 425.00,233.10 850,233.10" stroke="#4fb8ae" stroke-width="1.6" fill="none" opacity="0.75"/><path d="M0,3.18 C425.00,3.18 425.00,236.11 850,236.11" stroke="#4fb8ae" stroke-width="1.39" fill="none" opacity="0.78"/><path d="M0,167.58 C425.00,167.58 425.00,245.03 850,245.03" stroke="#4fb8ae" stroke-width="1.58" fill="none" opacity="0.85"/><path d="M0,364.23 C425.00,364.23 425.00,209.58 850,209.58" stroke="#4fb8ae" stroke-width="2.05" fill="none" opacity="0.92"/><path d="M0,198.42 C425.00,198.42 425.00,248.06 850,248.06" stroke="#4fb8ae" stroke-width="2.12" fill="none" opacity="0.91"/><path d="M0,316.13 C425.00,316.13 425.00,179.89 850,179.89" stroke="#d9a441" stroke-width="2.09" fill="none" opacity="0.97"/><path d="M0,132.14 C425.00,132.14 425.00,138.93 850,138.93" stroke="#d9a441" stroke-width="1.26" fill="none" opacity="0.84"/><path d="M0,117.05 C425.00,117.05 425.00,165.14 850,165.14" stroke="#d9a441" stroke-width="2.12" fill="none" opacity="0.8"/><path d="M0,180.45 C425.00,180.45 425.00,187.79 850,187.79" stroke="#d9a441" stroke-width="1.07" fill="none" opacity="0.84"/><path d="M0,260.57 C425.00,260.57 425.00,183.95 850,183.95" stroke="#d9a441" stroke-width="2.02" fill="none" opacity="0.81"/><path d="M0,450.46 C425.00,450.46 425.00,163.79 850,163.79" stroke="#d9a441" stroke-width="1.07" fill="none" opacity="0.79"/><path d="M0,206.87 C425.00,206.87 425.00,186.51 850,186.51" stroke="#d9a441" stroke-width="0.99" fill="none" opacity="0.8"/><path d="M0,379.22 C425.00,379.22 425.00,187.20 850,187.20" stroke="#d9a441" stroke-width="1.16" fill="none" opacity="0.76"/><path d="M0,309.36 C425.00,309.36 425.00,185.43 850,185.43" stroke="#d9a441" stroke-width="0.96" fill="none" opacity="0.88"/><path d="M0,67.08 C425.00,67.08 425.00,173.79 850,173.79" stroke="#d9a441" stroke-width="1.05" fill="none" opacity="0.78"/><path d="M0,255.68 C425.00,255.68 425.00,194.65 850,194.65" stroke="#d9a441" stroke-width="0.94" fill="none" opacity="0.77"/><path d="M0,95.53 C425.00,95.53 425.00,186.68 850,186.68" stroke="#d9a441" stroke-width="1.21" fill="none" opacity="0.82"/><path d="M0,203.09 C425.00,203.09 425.00,189.22 850,189.22" stroke="#d9a441" stroke-width="1.26" fill="none" opacity="0.87"/><path d="M0,224.66 C425.00,224.66 425.00,167.69 850,167.69" stroke="#d9a441" stroke-width="1.48" fill="none" opacity="0.95"/><path d="M0,94.55 C425.00,94.55 425.00,167.98 850,167.98" stroke="#d9a441" stroke-width="1.07" fill="none" opacity="0.97"/><path d="M0,201.01 C425.00,201.01 425.00,197.73 850,197.73" stroke="#d9a441" stroke-width="1.76" fill="none" opacity="0.8"/><path d="M0,437.45 C425.00,437.45 425.00,155.27 850,155.27" stroke="#d9a441" stroke-width="1.73" fill="none" opacity="0.94"/><path d="M0,48.86 C425.00,48.86 425.00,148.67 850,148.67" stroke="#d9a441" stroke-width="1.45" fill="none" opacity="0.84"/><path d="M0,149.41 C425.00,149.41 425.00,153.86 850,153.86" stroke="#d9a441" stroke-width="1.37" fill="none" opacity="1.0"/><path d="M0,216.85 C425.00,216.85 425.00,165.17 850,165.17" stroke="#d9a441" stroke-width="1.23" fill="none" opacity="0.8"/><path d="M0,121.77 C425.00,121.77 425.00,190.96 850,190.96" stroke="#d9a441" stroke-width="2.05" fill="none" opacity="0.79"/><path d="M0,187.60 C425.00,187.60 425.00,172.56 850,172.56" stroke="#d9a441" stroke-width="1.62" fill="none" opacity="0.8"/><path d="M0,29.20 C425.00,29.20 425.00,185.59 850,185.59" stroke="#d9a441" stroke-width="1.07" fill="none" opacity="0.85"/><path d="M0,360.56 C425.00,360.56 425.00,178.88 850,178.88" stroke="#d9a441" stroke-width="1.43" fill="none" opacity="0.95"/><path d="M0,469.81 C425.00,469.81 425.00,166.50 850,166.50" stroke="#d9a441" stroke-width="2.05" fill="none" opacity="0.88"/><path d="M0,183.65 C425.00,183.65 425.00,197.22 850,197.22" stroke="#d9a441" stroke-width="1.9" fill="none" opacity="0.78"/><path d="M0,255.94 C425.00,255.94 425.00,160.43 850,160.43" stroke="#d9a441" stroke-width="1.54" fill="none" opacity="0.94"/><path d="M0,159.62 C425.00,159.62 425.00,173.81 850,173.81" stroke="#d9a441" stroke-width="1.21" fill="none" opacity="0.86"/><path d="M0,420.59 C425.00,420.59 425.00,181.99 850,181.99" stroke="#d9a441" stroke-width="1.37" fill="none" opacity="0.82"/><path d="M0,285.22 C425.00,285.22 425.00,166.21 850,166.21" stroke="#d9a441" stroke-width="2.18" fill="none" opacity="0.82"/><path d="M0,435.54 C425.00,435.54 425.00,151.71 850,151.71" stroke="#d9a441" stroke-width="1.94" fill="none" opacity="0.97"/><path d="M0,89.36 C425.00,89.36 425.00,164.33 850,164.33" stroke="#d9a441" stroke-width="1.82" fill="none" opacity="0.85"/><path d="M0,50.82 C425.00,50.82 425.00,115.05 850,115.05" stroke="#9b8ad9" stroke-width="1.53" fill="none" opacity="0.8"/><path d="M0,24.27 C425.00,24.27 425.00,100.17 850,100.17" stroke="#9b8ad9" stroke-width="1.28" fill="none" opacity="0.95"/><path d="M0,74.52 C425.00,74.52 425.00,69.78 850,69.78" stroke="#9b8ad9" stroke-width="2.08" fill="none" opacity="0.85"/><path d="M0,403.78 C425.00,403.78 425.00,103.16 850,103.16" stroke="#9b8ad9" stroke-width="2.05" fill="none" opacity="0.98"/><path d="M0,39.89 C425.00,39.89 425.00,85.61 850,85.61" stroke="#9b8ad9" stroke-width="1.14" fill="none" opacity="0.99"/><path d="M0,328.61 C425.00,328.61 425.00,124.58 850,124.58" stroke="#9b8ad9" stroke-width="2.18" fill="none" opacity="0.95"/><path d="M0,413.48 C425.00,413.48 425.00,125.49 850,125.49" stroke="#9b8ad9" stroke-width="1.69" fill="none" opacity="0.95"/><path d="M0,460.94 C425.00,460.94 425.00,97.21 850,97.21" stroke="#9b8ad9" stroke-width="1.18" fill="none" opacity="0.92"/><path d="M0,26.21 C425.00,26.21 425.00,87.44 850,87.44" stroke="#9b8ad9" stroke-width="1.39" fill="none" opacity="0.95"/><path d="M0,11.33 C425.00,11.33 425.00,88.18 850,88.18" stroke="#9b8ad9" stroke-width="1.3" fill="none" opacity="0.92"/><path d="M0,414.03 C425.00,414.03 425.00,97.75 850,97.75" stroke="#9b8ad9" stroke-width="2.0" fill="none" opacity="0.86"/><path d="M0,237.63 C425.00,237.63 425.00,88.14 850,88.14" stroke="#9b8ad9" stroke-width="1.15" fill="none" opacity="0.97"/><path d="M0,284.92 C425.00,284.92 425.00,84.95 850,84.95" stroke="#9b8ad9" stroke-width="1.6" fill="none" opacity="0.85"/><path d="M0,17.43 C425.00,17.43 425.00,110.78 850,110.78" stroke="#9b8ad9" stroke-width="2.03" fill="none" opacity="0.9"/><path d="M0,69.86 C425.00,69.86 425.00,94.07 850,94.07" stroke="#9b8ad9" stroke-width="1.16" fill="none" opacity="0.79"/><path d="M0,139.19 C425.00,139.19 425.00,122.79 850,122.79" stroke="#9b8ad9" stroke-width="2.0" fill="none" opacity="0.95"/><path d="M0,438.98 C425.00,438.98 425.00,75.29 850,75.29" stroke="#9b8ad9" stroke-width="1.18" fill="none" opacity="0.76"/><path d="M0,1.96 C425.00,1.96 425.00,107.44 850,107.44" stroke="#9b8ad9" stroke-width="1.43" fill="none" opacity="0.89"/><path d="M0,410.93 C425.00,410.93 425.00,86.06 850,86.06" stroke="#9b8ad9" stroke-width="1.22" fill="none" opacity="0.96"/><path d="M0,11.74 C425.00,11.74 425.00,124.60 850,124.60" stroke="#9b8ad9" stroke-width="1.35" fill="none" opacity="0.76"/><path d="M0,102.58 C425.00,102.58 425.00,73.66 850,73.66" stroke="#9b8ad9" stroke-width="2.0" fill="none" opacity="0.76"/><path d="M0,25.27 C425.00,25.27 425.00,105.85 850,105.85" stroke="#9b8ad9" stroke-width="1.17" fill="none" opacity="0.83"/><path d="M0,371.93 C425.00,371.93 425.00,94.43 850,94.43" stroke="#9b8ad9" stroke-width="1.85" fill="none" opacity="0.82"/><path d="M0,62.00 C425.00,62.00 425.00,72.89 850,72.89" stroke="#9b8ad9" stroke-width="1.99" fill="none" opacity="0.78"/><path d="M0,37.15 C425.00,37.15 425.00,78.25 850,78.25" stroke="#9b8ad9" stroke-width="1.58" fill="none" opacity="0.92"/><path d="M0,233.71 C425.00,233.71 425.00,106.21 850,106.21" stroke="#9b8ad9" stroke-width="1.55" fill="none" opacity="0.94"/><path d="M0,285.47 C425.00,285.47 425.00,79.39 850,79.39" stroke="#9b8ad9" stroke-width="1.34" fill="none" opacity="1.0"/><path d="M0,212.22 C425.00,212.22 425.00,109.62 850,109.62" stroke="#9b8ad9" stroke-width="1.12" fill="none" opacity="0.92"/><path d="M0,330.15 C425.00,330.15 425.00,78.44 850,78.44" stroke="#9b8ad9" stroke-width="2.12" fill="none" opacity="0.85"/><path d="M0,163.72 C425.00,163.72 425.00,109.65 850,109.65" stroke="#9b8ad9" stroke-width="2.1" fill="none" opacity="0.96"/><path d="M0,265.84 C425.00,265.84 425.00,3.28 850,3.28" stroke="#e0806a" stroke-width="1.53" fill="none" opacity="0.91"/><path d="M0,395.72 C425.00,395.72 425.00,12.19 850,12.19" stroke="#e0806a" stroke-width="1.51" fill="none" opacity="0.91"/><path d="M0,325.52 C425.00,325.52 425.00,2.79 850,2.79" stroke="#e0806a" stroke-width="2.04" fill="none" opacity="0.78"/><path d="M0,403.99 C425.00,403.99 425.00,52.06 850,52.06" stroke="#e0806a" stroke-width="1.7" fill="none" opacity="0.89"/><path d="M0,165.36 C425.00,165.36 425.00,23.43 850,23.43" stroke="#e0806a" stroke-width="2.1" fill="none" opacity="0.91"/><path d="M0,219.87 C425.00,219.87 425.00,21.62 850,21.62" stroke="#e0806a" stroke-width="2.19" fill="none" opacity="0.98"/><path d="M0,437.07 C425.00,437.07 425.00,55.79 850,55.79" stroke="#e0806a" stroke-width="1.36" fill="none" opacity="0.96"/><path d="M0,325.60 C425.00,325.60 425.00,55.03 850,55.03" stroke="#e0806a" stroke-width="1.86" fill="none" opacity="0.96"/><path d="M0,378.50 C425.00,378.50 425.00,34.87 850,34.87" stroke="#e0806a" stroke-width="1.81" fill="none" opacity="0.77"/><path d="M0,181.93 C425.00,181.93 425.00,48.50 850,48.50" stroke="#e0806a" stroke-width="1.02" fill="none" opacity="0.83"/><path d="M0,296.24 C425.00,296.24 425.00,27.13 850,27.13" stroke="#e0806a" stroke-width="0.99" fill="none" opacity="0.79"/><path d="M0,315.04 C425.00,315.04 425.00,33.03 850,33.03" stroke="#e0806a" stroke-width="1.67" fill="none" opacity="0.98"/><path d="M0,441.28 C425.00,441.28 425.00,17.72 850,17.72" stroke="#e0806a" stroke-width="2.05" fill="none" opacity="0.88"/><path d="M0,304.10 C425.00,304.10 425.00,6.09 850,6.09" stroke="#e0806a" stroke-width="1.42" fill="none" opacity="0.99"/><path d="M0,444.25 C425.00,444.25 425.00,25.03 850,25.03" stroke="#e0806a" stroke-width="1.22" fill="none" opacity="0.99"/><path d="M0,237.22 C425.00,237.22 425.00,57.12 850,57.12" stroke="#e0806a" stroke-width="0.95" fill="none" opacity="0.9"/><path d="M0,133.34 C425.00,133.34 425.00,0.24 850,0.24" stroke="#e0806a" stroke-width="1.53" fill="none" opacity="0.99"/><path d="M0,216.98 C425.00,216.98 425.00,12.87 850,12.87" stroke="#e0806a" stroke-width="1.81" fill="none" opacity="0.97"/><path d="M0,359.36 C425.00,359.36 425.00,15.08 850,15.08" stroke="#e0806a" stroke-width="1.91" fill="none" opacity="0.94"/><path d="M0,217.73 C425.00,217.73 425.00,45.50 850,45.50" stroke="#e0806a" stroke-width="0.95" fill="none" opacity="0.8"/><path d="M0,183.27 C425.00,183.27 425.00,55.88 850,55.88" stroke="#e0806a" stroke-width="1.8" fill="none" opacity="0.92"/><path d="M0,389.36 C425.00,389.36 425.00,43.53 850,43.53" stroke="#e0806a" stroke-width="0.98" fill="none" opacity="0.97"/><path d="M0,360.63 C425.00,360.63 425.00,12.99 850,12.99" stroke="#e0806a" stroke-width="1.67" fill="none" opacity="0.86"/><path d="M0,13.73 C425.00,13.73 425.00,48.35 850,48.35" stroke="#e0806a" stroke-width="1.35" fill="none" opacity="0.91"/><path d="M0,388.19 C425.00,388.19 425.00,56.09 850,56.09" stroke="#e0806a" stroke-width="1.58" fill="none" opacity="0.86"/><path d="M0,4.61 C425.00,4.61 425.00,6.81 850,6.81" stroke="#e0806a" stroke-width="1.84" fill="none" opacity="0.8"/><path d="M0,249.31 C425.00,249.31 425.00,10.03 850,10.03" stroke="#e0806a" stroke-width="1.93" fill="none" opacity="0.8"/><path d="M0,364.57 C425.00,364.57 425.00,26.79 850,26.79" stroke="#e0806a" stroke-width="1.87" fill="none" opacity="0.84"/></svg>`;

function hlwReportStatBlock(label, value, cls) {
  return `<div class="report-stat"><div class="report-stat-label">${hlwEsc(label)}</div><div class="report-stat-value${cls ? ' ' + cls : ''}">${hlwEsc(value)}</div></div>`;
}

function hlwReportPipelineRowsHtml(rows) {
  return rows.map(row => {
    const isRecurring = String(row.type).trim().toLowerCase().includes('recur');
    return `<tr>
      <td class="hi">${hlwEsc(row.client)}</td>
      <td>${hlwEsc(row.engagement)}</td>
      <td class="${isRecurring ? 'report-recurring' : 'report-dim'}">${hlwEsc(row.type)}</td>
      <td><span class="${hlwStageChipClass(row.stage)}">${hlwEsc(row.stage)}</span></td>
      <td>${hlwEsc(row.partner)}</td>
    </tr>`;
  }).join('');
}

function hlwReportHoursCapitalRowsHtml(partners) {
  return partners.map(p => `<tr>
    <td class="hi">${hlwEsc(p.partner)}</td>
    <td>${hlwEsc(hlwFmtHours(p.hours))}</td>
    <td></td>
    <td class="amount">${p.capitalBalance !== null ? hlwEsc(hlwFmtMoney(p.capitalBalance)) : '—'}</td>
  </tr>`).join('');
}

function hlwReportWaterfallCell(amount, name) {
  if (!amount && !name) return '<td class="amount">—</td>';
  const nameHtml = name ? `<div class="report-cell-sub">${hlwEsc(name)}</div>` : '';
  return `<td class="amount">${hlwEsc(hlwFmtMoney(amount))}${nameHtml}</td>`;
}

function hlwReportWaterfallRowsHtml(rows) {
  return rows.map(row => {
    const typeClass = row.type === 'Bookkeeping' ? 'report-type-bookkeeping' : 'report-type-tax';
    if (row.type === 'Bookkeeping') {
      return `<tr>
        <td class="hi">${hlwEsc(row.client)}</td>
        <td class="${typeClass}">${hlwEsc(row.type)}</td>
        <td class="amount">${hlwEsc(hlwFmtMoney(row.gross))}</td>
        <td class="amount">—</td>
        <td class="amount">—</td>
        <td class="amount">—</td>
        ${hlwReportWaterfallCell(row.amounts.bookkeeper, row.bookkeeper)}
        <td class="amount">${hlwEsc(hlwFmtMoney(row.amounts.capital))}</td>
      </tr>`;
    }
    return `<tr>
      <td class="hi">${hlwEsc(row.client)}</td>
      <td class="${typeClass}">${hlwEsc(row.type)}</td>
      <td class="amount">${hlwEsc(hlwFmtMoney(row.gross))}</td>
      ${hlwReportWaterfallCell(row.amounts.procurer, row.procurer)}
      ${hlwReportWaterfallCell(row.amounts.preparer, row.preparer)}
      ${hlwReportWaterfallCell(row.amounts.reviewer, row.reviewer)}
      <td class="amount">—</td>
      <td class="amount">${hlwEsc(hlwFmtMoney(row.amounts.capital))}</td>
    </tr>`;
  }).join('');
}

function hlwReportTotalsChartHtml(data) {
  const agg = hlwAggregateEarningsByPartner(data.waterfall);
  const rows = agg.byPartner.map(p => ({ label: p.partner, amount: p.amount, isCapital: false }));
  rows.push({ label: 'Capital accounts', amount: agg.capitalTotal, isCapital: true });
  rows.sort((a, b) => b.amount - a.amount);
  const max = Math.max(1, ...rows.map(r => r.amount));
  return rows.map(r => `
    <div class="report-bar-row">
      <div class="report-bar-label">${hlwEsc(r.label)}</div>
      <div class="report-bar-track">
        <div class="report-bar-fill${r.isCapital ? ' report-bar-capital' : ''}" style="width:${Math.max(2, (r.amount / max) * 100)}%"></div>
      </div>
      <div class="report-bar-value">${hlwEsc(hlwFmtMoney(r.amount))}</div>
    </div>`).join('');
}

function hlwPipelineStageSummary(rows) {
  const counts = {};
  rows.forEach(r => {
    const stage = String(r.stage || '').trim() || 'Unspecified';
    counts[stage] = (counts[stage] || 0) + 1;
  });
  return Object.entries(counts).map(([stage, n]) => `${n} ${stage}`).join('   ·   ');
}

// Builds the full report HTML fragment. Returns null if there's no
// connected data to report on (export button is hidden in that case
// anyway, but this stays safe to call regardless).
function hlwBuildReportHtml(data) {
  if (!data || !data.snapshot) return null;
  const s = data.snapshot;
  const period = s.period || 'This period';
  const generated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const netClass = s.netIncome > 0 ? 'report-positive' : (s.netIncome < 0 ? 'report-negative' : '');

  return `
    <section class="report-cover">
      <div class="report-cover-wordmark">H L W&nbsp;&nbsp;&nbsp;FINANCIAL</div>
      <div class="report-cover-diagram">${HLW_COVER_DIAGRAM_SVG}</div>
      <div class="report-cover-text">
        <div class="report-eyebrow">A PRACTICE MANAGEMENT REPORT</div>
        <h1 class="report-cover-title">Firm Overview</h1>
        <p class="report-cover-desc">Practice-wide snapshot of pipeline, hours, capital, and profit split.</p>
        <hr class="report-cover-rule">
        <div class="report-cover-footer">
          <span>PERIOD&nbsp;&nbsp;${hlwEsc(String(period).toUpperCase())}</span>
          <span>PREPARED ${hlwEsc(generated.toUpperCase())} · CONFIDENTIAL</span>
        </div>
      </div>
    </section>

    <section class="report-content">
      <div class="report-continuity">FIRM OVERVIEW&nbsp;&nbsp;&nbsp;&nbsp;${hlwEsc(String(period).toUpperCase())}</div>
      <hr class="report-hr">
      <p class="report-summary">HLW Financial closed ${hlwEsc(period)} with ${hlwEsc(hlwFmtMoney(s.revenue))} in revenue
        against ${hlwEsc(hlwFmtMoney(s.expenses))} in expenses, for net income of ${hlwEsc(hlwFmtMoney(s.netIncome))}.
        The firm is carrying ${hlwEsc(hlwFmtMoney(s.cash))} in cash on hand across ${hlwEsc(s.activeClients || 0)} active
        clients, with ${hlwEsc(data.pipeline.length)} engagements moving through the pipeline this period.</p>

      <div class="report-stats">
        ${hlwReportStatBlock('Revenue', hlwFmtMoney(s.revenue))}
        ${hlwReportStatBlock('Expenses', hlwFmtMoney(s.expenses))}
        ${hlwReportStatBlock('Net income', hlwFmtMoney(s.netIncome), netClass)}
        ${hlwReportStatBlock('Cash on hand', hlwFmtMoney(s.cash))}
        ${hlwReportStatBlock('Active clients', String(s.activeClients || 0))}
      </div>

      ${data.pipeline.length ? `
      <h2 class="report-section">Client Pipeline</h2>
      <div class="report-meta-line">${hlwEsc(data.pipeline.length)} engagements&nbsp;&nbsp;&nbsp;&nbsp;${hlwEsc(hlwPipelineStageSummary(data.pipeline))}</div>
      <table class="report-table">
        <thead><tr><th>Client</th><th>Engagement</th><th>Type</th><th>Stage</th><th>Partner</th></tr></thead>
        <tbody>${hlwReportPipelineRowsHtml(data.pipeline)}</tbody>
      </table>` : ''}

      ${data.partners.length ? `
      <h2 class="report-section">Hours &amp; Capital</h2>
      <table class="report-table">
        <thead><tr><th>Partner</th><th>Hours logged (this period)</th><th></th><th class="th-r">Capital balance</th></tr></thead>
        <tbody>${hlwReportHoursCapitalRowsHtml(data.partners)}</tbody>
      </table>` : ''}

      ${data.waterfall.length ? `
      <h2 class="report-section">Profit-Split Waterfall</h2>
      <table class="report-table">
        <thead><tr><th>Client</th><th>Type</th><th class="th-r">Gross profit</th><th class="th-r">Procurer 10%</th><th class="th-r">Preparer 45%</th><th class="th-r">Reviewer 15%</th><th class="th-r">Bookkeeper 60%</th><th class="th-r">Capital 30%</th></tr></thead>
        <tbody>${hlwReportWaterfallRowsHtml(data.waterfall)}</tbody>
      </table>
      <p class="report-note">Tax prep: 10% procurer / 45% preparer / 15% reviewer / 30% capital accounts.
        Bookkeeping: 60% guaranteed payment to assigned bookkeeper, remaining 40% to capital accounts.</p>
      <div class="report-meta-line" style="margin-top:18px;">TOTAL THIS PERIOD, BY PARTNER</div>
      <div class="report-bar-chart">${hlwReportTotalsChartHtml(data)}</div>` : ''}
    </section>`;
}
