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
  const cells = [
    ['Revenue', hlwFmtMoney(s.revenue)],
    ['Expenses', hlwFmtMoney(s.expenses)],
    ['Net income', hlwFmtMoney(s.netIncome)],
    ['Cash on hand', hlwFmtMoney(s.cash)],
    ['Active clients', s.activeClients || 0]
  ];
  return cells.map(([label, value]) =>
    `<div><div class="metric-label">${hlwEsc(label)}</div><div class="metric-value">${hlwEsc(value)}</div></div>`
  ).join('');
}

function hlwRenderSnapshot(data) {
  document.getElementById('snapshot-grid').innerHTML = hlwSnapshotCellsHtml(data.snapshot);
}

function hlwStageChipClass(stage) {
  const s = String(stage).trim().toLowerCase();
  return s.includes('active') ? 'stage-chip active-eng' : 'stage-chip';
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
        <td>Bookkeeping</td>
        <td class="amount">${hlwEsc(hlwFmtMoney(row.gross))}</td>
        <td class="amount">${hlwEsc(hlwFmtMoney(row.amounts.bookkeeper))}</td>
        <td class="amount">—</td>
        <td class="amount">—</td>
        <td class="amount">${hlwEsc(hlwFmtMoney(row.amounts.capital))}</td>
      </tr>`;
    }
    return `<tr>
      <td class="hi">${hlwEsc(row.client)}</td>
      <td>Tax Prep</td>
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

// Returns a Chart.js config for the given card, or null if that card has no
// chart (only the waterfall card does, for now).
function hlwBuildModalChartConfig(cardKey, data) {
  if (cardKey !== 'waterfall' || !data.waterfall.length) return null;
  const agg = hlwAggregateEarningsByPartner(data.waterfall);
  if (!agg.byPartner.length) return null;

  const labels = agg.byPartner.map(p => p.partner).concat('Capital accts');
  const values = agg.byPartner.map(p => p.amount).concat(agg.capitalTotal);
  const gold = '#8a7a3f';
  const cream = 'rgba(247,245,239,0.85)';
  const gridColor = 'rgba(247,245,239,0.1)';

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Total this month',
        data: values,
        backgroundColor: labels.map(l => l === 'Capital accts' ? 'rgba(247,245,239,0.25)' : gold),
        borderRadius: 2,
        maxBarThickness: 56
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => hlwFmtMoney(ctx.parsed.y) },
          backgroundColor: '#0a0a0a',
          borderColor: gridColor,
          borderWidth: 1,
          titleFont: { family: 'JetBrains Mono' },
          bodyFont: { family: 'JetBrains Mono' }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: cream, font: { family: 'Helvetica Neue', size: 12 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: cream,
            font: { family: 'JetBrains Mono', size: 10 },
            callback: v => hlwFmtMoney(v)
          }
        }
      }
    }
  };
}
