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

function hlwRenderPipeline(data) {
  const body = document.getElementById('pipeline-body');
  const empty = document.getElementById('pipeline-empty');
  if (!data.pipeline.length) {
    body.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  body.innerHTML = hlwPipelineRowsHtml(data.pipeline);
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
        ${hlwAmountWithName(row.amounts.bookkeeper, row.bookkeeper)}
        <td class="amount">—</td>
        <td class="amount">—</td>
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

function hlwRenderDashboard(data) {
  hlwRenderMeta(data);
  hlwRenderSnapshot(data);
  hlwRenderPipeline(data);
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
          <thead><tr><th>Client</th><th>Type</th><th class="num-col">Gross profit</th><th class="num-col">Procurer 10%</th><th class="num-col">Preparer 45%</th><th class="num-col">Reviewer 15%</th><th class="num-col">Capital accts 30%</th></tr></thead>
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

const HLW_SKYLINE_HEIGHTS = [10, 18, 28, 14, 40, 22, 16, 34, 12, 26];

function hlwReportSkylineHtml() {
  let bars = '';
  for (let i = 0; i < 90; i++) {
    bars += `<div class="report-skyline-bar" style="height:${HLW_SKYLINE_HEIGHTS[i % HLW_SKYLINE_HEIGHTS.length]}px"></div>`;
  }
  return bars;
}

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
        ${hlwReportWaterfallCell(row.amounts.bookkeeper, row.bookkeeper)}
        <td class="amount">—</td>
        <td class="amount">—</td>
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
      <div class="report-cover-top">
        <div class="report-cover-wordmark">H L W&nbsp;&nbsp;&nbsp;FINANCIAL</div>
      </div>
      <div class="report-skyline">${hlwReportSkylineHtml()}</div>
      <div class="report-cover-bottom">
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
        <thead><tr><th>Client</th><th>Type</th><th class="th-r">Gross profit</th><th class="th-r">Procurer 10%</th><th class="th-r">Preparer 45%</th><th class="th-r">Reviewer 15%</th><th class="th-r">Capital 30%</th></tr></thead>
        <tbody>${hlwReportWaterfallRowsHtml(data.waterfall)}</tbody>
      </table>
      <p class="report-note">Tax prep: 10% procurer / 45% preparer / 15% reviewer / 30% capital accounts.
        Bookkeeping: 60% guaranteed payment to assigned bookkeeper, remaining 40% to capital accounts.</p>
      <div class="report-meta-line" style="margin-top:18px;">TOTAL THIS PERIOD, BY PARTNER</div>
      <div class="report-bar-chart">${hlwReportTotalsChartHtml(data)}</div>` : ''}
    </section>`;
}
