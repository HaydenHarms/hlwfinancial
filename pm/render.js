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
    return `<tr>
      <td class="hi">${hlwEsc(row.client)}</td>
      <td>${hlwEsc(row.engagement)}</td>
      <td><span class="rec-chip${isRecurring ? ' recurring' : ''}">${hlwEsc(row.type || (isRecurring ? 'Recurring' : 'One-off'))}</span></td>
      <td><span class="${hlwStageChipClass(row.stage)}">${hlwEsc(row.stage)}</span></td>
      <td>${hlwEsc(row.procurer)}</td>
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

function hlwWaterfallRowsHtml(rows) {
  return rows.map(row => {
    if (row.type === 'Bookkeeping') {
      return `<tr>
        <td class="hi">${hlwEsc(row.client)}</td>
        <td><span class="engagement-chip type-bookkeeping">Bookkeeping</span></td>
        <td class="amount">${hlwEsc(hlwFmtMoney(row.gross))}</td>
        <td class="amount">${hlwEsc(hlwFmtMoney(row.amounts.bookkeeper))}</td>
        <td class="amount">—</td>
        <td class="amount">—</td>
        <td class="amount">${hlwEsc(hlwFmtMoney(row.amounts.capital))}</td>
      </tr>`;
    }
    return `<tr>
      <td class="hi">${hlwEsc(row.client)}</td>
      <td><span class="engagement-chip type-tax">Tax Prep</span></td>
      <td class="amount">${hlwEsc(hlwFmtMoney(row.gross))}</td>
      <td class="amount">${hlwEsc(hlwFmtMoney(row.amounts.procurer))}</td>
      <td class="amount">${hlwEsc(hlwFmtMoney(row.amounts.preparer))}</td>
      <td class="amount">${hlwEsc(hlwFmtMoney(row.amounts.reviewer))}</td>
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

// Builds the HTML for the expanded body of whichever card was clicked.
function hlwBuildModalBody(cardKey, data) {
  switch (cardKey) {
    case 'pipeline':
      if (!data.pipeline.length) return '<div class="table-empty">No pipeline data in the workbook.</div>';
      return `
        ${hlwPipelineBreakdownHtml(data.pipeline)}
        <div class="modal-section-sub">All engagements</div>
        <table class="data-table">
          <thead><tr><th>Client</th><th>Engagement</th><th>Type</th><th>Stage</th><th>Procurer</th></tr></thead>
          <tbody>${hlwPipelineRowsHtml(data.pipeline)}</tbody>
        </table>`;

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
          <thead><tr><th>Client</th><th>Type</th><th>Gross profit</th><th>Procurer 10%</th><th>Preparer 45%</th><th>Reviewer 15%</th><th>Capital accts 30%</th></tr></thead>
          <tbody>${hlwWaterfallRowsHtml(data.waterfall)}</tbody>
        </table>
        <div class="waterfall-note">Tax prep: 10% procurer / 45% preparer / 15% reviewer / 30% capital accounts. Bookkeeping: 60% guaranteed payment to assigned bookkeeper, remaining 40% to capital accounts.</div>
        <div class="modal-section-sub">Total this month, by partner</div>
        <table class="data-table modal-totals">
          <thead><tr><th>Partner</th><th>Total</th></tr></thead>
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
