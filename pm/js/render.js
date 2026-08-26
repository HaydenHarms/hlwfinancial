// Takes parsed workbook data (see parse-excel.js) and renders it into the
// dashboard DOM. Pure rendering — no fetching, no parsing here.

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
  document.getElementById('meta-entities').textContent = data.snapshot.entities || '—';
}

function hlwRenderSnapshot(data) {
  const s = data.snapshot;
  const cells = [
    ['Revenue', hlwFmtMoney(s.revenue)],
    ['Expenses', hlwFmtMoney(s.expenses)],
    ['Net income', hlwFmtMoney(s.netIncome)],
    ['Cash on hand', hlwFmtMoney(s.cash)],
    ['Active clients', s.activeClients || 0]
  ];
  const grid = document.getElementById('snapshot-grid');
  grid.innerHTML = cells.map(([label, value]) =>
    `<div><div class="metric-label">${hlwEsc(label)}</div><div class="metric-value">${hlwEsc(value)}</div></div>`
  ).join('');
}

function hlwStageChipClass(stage) {
  const s = String(stage).trim().toLowerCase();
  return s.includes('active') ? 'stage-chip active-eng' : 'stage-chip';
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
  body.innerHTML = data.pipeline.map(row => {
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

function hlwRenderPartners(data) {
  const list = document.getElementById('partners-list');
  const empty = document.getElementById('partners-empty');
  if (!data.partners.length) {
    list.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  list.innerHTML = data.partners.map(p => {
    const statusIsActive = String(p.capitalStatus).trim().toLowerCase() === 'active';
    const balanceRow = p.capitalBalance !== null
      ? `<div class="partner-row"><span>Capital balance</span><span>${hlwEsc(hlwFmtMoney(p.capitalBalance))}</span></div>`
      : '';
    return `<div class="partner">
      <div class="partner-name">${hlwEsc(p.partner)}</div>
      <div class="partner-row"><span>Hours logged</span><span>${hlwEsc(hlwFmtHours(p.hours))}</span></div>
      <div class="partner-row"><span>Capital account</span><span class="${statusIsActive ? 'capital-active' : ''}">${hlwEsc(p.capitalStatus || '—')}</span></div>
      ${balanceRow}
    </div>`;
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
  body.innerHTML = data.waterfall.map(row => {
    if (row.type === 'Bookkeeping') {
      return `<tr>
        <td class="hi">${hlwEsc(row.client)}</td>
        <td>Bookkeeping</td>
        <td class="amount">${hlwEsc(hlwFmtMoney(row.gross))}</td>
        <td class="amount">${hlwEsc(hlwFmtMoney(row.amounts.bookkeeper))} <span title="${hlwEsc(row.bookkeeper)}"></span></td>
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

function hlwRenderDashboard(data) {
  hlwRenderMeta(data);
  hlwRenderSnapshot(data);
  hlwRenderPipeline(data);
  hlwRenderPartners(data);
  hlwRenderWaterfall(data);
}
