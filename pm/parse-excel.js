// Parses the connected .xlsx workbook (via SheetJS) into the plain JS shape
// render.js expects. Expected workbook structure — see HLW_PM_Mock_Data.xlsx
// for a filled-in example of this schema:
//
//   Sheet "Snapshot"   — one row per reporting period (e.g. one row added
//                        each month). Columns: Date, Revenue, Expenses,
//                        Net Income, Cash On Hand, Active Clients, Entities.
//                        Date is any day within that period's month (the
//                        1st is the convention in the mock file, but any
//                        date that month works) -- typed as a real Excel
//                        date, not a text label, so it can be filtered by
//                        the on-page Period selector.
//   Sheet "Pipeline"   — columns: Client, Engagement, Type, Stage, Partner,
//                        Date. Type is "Recurring" or "One-off". Partner is
//                        who's assigned to that engagement (not necessarily
//                        who procured it -- see Waterfall's own Procurer
//                        column for that, a different, profit-split-specific
//                        role). Date is when the row was opened/last moved --
//                        a blank Date means the row always shows regardless
//                        of the selected period (so a new engagement dropped
//                        in without a date yet doesn't just vanish).
//   Sheet "Hours"      — columns: Partner, Hours Logged, Date. One row per
//                        time a partner's hours are logged (e.g. monthly) --
//                        not one aggregate row per partner anymore. Rows are
//                        summed per partner within the selected period.
//   Sheet "Capital"    — columns: Partner, Capital Account Status, Capital
//                        Balance (optional). Still one row per partner --
//                        this is a running balance, not a period flow, so
//                        it's unaffected by the Period selector.
//   Sheet "Waterfall"  — columns: Client, Engagement Type, Gross Profit,
//                        Procurer, Preparer, Reviewer, Bookkeeper, Date.
//                        Engagement Type is "Tax Prep" or "Bookkeeping".
//                        Date is when the engagement's profit was realized;
//                        rows outside the selected period are excluded.
//
// Sheet names are matched case-insensitively and with surrounding whitespace
// trimmed, so "snapshot ", "SNAPSHOT" etc. all work. Missing sheets simply
// render as empty sections rather than erroring out — a partner filling in
// the workbook incrementally shouldn't break the page. Snapshot, Hours, and
// Waterfall rows with no parseable Date are dropped (a dateless financial
// figure can't be attributed to any period); Pipeline rows with no Date are
// kept and always shown -- see hlwInRangePipeline below.

const HLW_WATERFALL_SPLIT = {
  taxPrep: { procurer: 0.10, preparer: 0.45, reviewer: 0.15, capital: 0.30 },
  bookkeeping: { bookkeeper: 0.60, capital: 0.40 }
};

function hlwFindSheet(workbook, name) {
  const target = name.trim().toLowerCase();
  const match = workbook.SheetNames.find(n => n.trim().toLowerCase() === target);
  return match ? workbook.Sheets[match] : null;
}

function hlwSheetToRows(sheet) {
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function hlwGetField(row, ...candidates) {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const target = candidate.trim().toLowerCase();
    const key = keys.find(k => k.trim().toLowerCase() === target);
    if (key !== undefined) return row[key];
  }
  return '';
}

function hlwToNumber(val) {
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Cells formatted as Excel dates already arrive as JS Date objects (workbook
// is read with cellDates:true -- see hlwParseWorkbook). This is a fallback
// for a raw serial number (in case a cell's date formatting didn't stick)
// or a typed-in text date ("8/15/2026", "2026-08-15") -- both common when a
// partner is hand-editing the sheet rather than using a date picker.
function hlwParseDate(val) {
  if (val instanceof Date) return isNaN(val) ? null : val;
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + val * 86400000);
    return isNaN(d) ? null : d;
  }
  const s = String(val || '').trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function hlwParseSnapshotRows(workbook) {
  return hlwSheetToRows(hlwFindSheet(workbook, 'Snapshot')).map(row => ({
    date: hlwParseDate(hlwGetField(row, 'Date', 'Period')),
    revenue: hlwToNumber(hlwGetField(row, 'Revenue')),
    expenses: hlwToNumber(hlwGetField(row, 'Expenses')),
    netIncome: hlwToNumber(hlwGetField(row, 'Net Income', 'NetIncome')),
    cash: hlwToNumber(hlwGetField(row, 'Cash On Hand', 'Cash')),
    activeClients: hlwToNumber(hlwGetField(row, 'Active Clients', 'Clients')),
    entities: hlwGetField(row, 'Entities')
  })).filter(r => r.date).sort((a, b) => a.date - b.date);
}

function hlwParsePipeline(workbook) {
  return hlwSheetToRows(hlwFindSheet(workbook, 'Pipeline')).map(row => ({
    client: hlwGetField(row, 'Client'),
    engagement: hlwGetField(row, 'Engagement'),
    type: hlwGetField(row, 'Type'),
    stage: hlwGetField(row, 'Stage'),
    partner: hlwGetField(row, 'Partner'),
    date: hlwParseDate(hlwGetField(row, 'Date'))
  })).filter(r => r.client);
}

function hlwParseHoursRows(workbook) {
  return hlwSheetToRows(hlwFindSheet(workbook, 'Hours')).map(row => ({
    partner: String(hlwGetField(row, 'Partner')).trim(),
    hours: hlwToNumber(hlwGetField(row, 'Hours Logged', 'Hours')),
    date: hlwParseDate(hlwGetField(row, 'Date'))
  })).filter(r => r.partner);
}

function hlwParseCapitalRows(workbook) {
  return hlwSheetToRows(hlwFindSheet(workbook, 'Capital')).map(row => {
    const balance = hlwGetField(row, 'Capital Balance', 'Balance');
    return {
      partner: String(hlwGetField(row, 'Partner')).trim(),
      capitalStatus: hlwGetField(row, 'Capital Account Status', 'Status'),
      capitalBalance: balance === '' ? null : hlwToNumber(balance)
    };
  }).filter(r => r.partner);
}

// Applies the operating-agreement waterfall math to each engagement row.
function hlwParseWaterfall(workbook) {
  const rows = hlwSheetToRows(hlwFindSheet(workbook, 'Waterfall'));
  return rows.map(row => {
    const client = hlwGetField(row, 'Client');
    if (!client) return null;
    const typeRaw = String(hlwGetField(row, 'Engagement Type', 'Type')).trim().toLowerCase();
    const isBookkeeping = typeRaw.includes('book');
    const gross = hlwToNumber(hlwGetField(row, 'Gross Profit'));
    const date = hlwParseDate(hlwGetField(row, 'Date'));

    if (isBookkeeping) {
      const split = HLW_WATERFALL_SPLIT.bookkeeping;
      return {
        client, type: 'Bookkeeping', gross, date,
        bookkeeper: hlwGetField(row, 'Bookkeeper'),
        amounts: { bookkeeper: gross * split.bookkeeper, capital: gross * split.capital }
      };
    }
    const split = HLW_WATERFALL_SPLIT.taxPrep;
    return {
      client, type: 'Tax Prep', gross, date,
      procurer: hlwGetField(row, 'Procurer'),
      preparer: hlwGetField(row, 'Preparer'),
      reviewer: hlwGetField(row, 'Reviewer'),
      amounts: {
        procurer: gross * split.procurer,
        preparer: gross * split.preparer,
        reviewer: gross * split.reviewer,
        capital: gross * split.capital
      }
    };
  }).filter(Boolean);
}

// Aggregates waterfall $ by the partner name in each role column, across all
// engagements — "who's actually getting paid what this period". Named people
// only; blank role cells are ignored, capital-account dollars are summed
// separately since they aren't attributed to one partner. Powers the bar
// chart in the expanded waterfall card. Operates on whatever waterfall rows
// it's handed -- caller is responsible for period-filtering first.
function hlwAggregateEarningsByPartner(waterfallRows) {
  const totals = {};
  let capitalTotal = 0;
  const add = (name, amount) => {
    const key = String(name).trim();
    if (!key) return;
    totals[key] = (totals[key] || 0) + amount;
  };
  waterfallRows.forEach(row => {
    capitalTotal += row.amounts.capital || 0;
    if (row.type === 'Bookkeeping') {
      add(row.bookkeeper, row.amounts.bookkeeper);
    } else {
      add(row.procurer, row.amounts.procurer);
      add(row.preparer, row.amounts.preparer);
      add(row.reviewer, row.amounts.reviewer);
    }
  });
  return {
    byPartner: Object.entries(totals).map(([partner, amount]) => ({ partner, amount })).sort((a, b) => b.amount - a.amount),
    capitalTotal
  };
}

// ---- Period filtering ----
// A "range" is { key, start, end, label } (see hlwComputePeriodRange in
// app.js). hlwBuildPeriodView turns the raw, unfiltered parse below into the
// exact { snapshot, pipeline, partners, waterfall } shape render.js expects
// -- every render/report function downstream (dashboard cards, modals,
// the PDF export) reads from that shape and has no idea a period filter
// exists, which is what makes the filter apply everywhere at once instead
// of needing to be threaded through each render function individually.

// Financial rows (Snapshot/Waterfall/Hours) need a real date to mean
// anything for a given period -- undated rows are dropped.
function hlwInRangeStrict(date, range) {
  return !!date && date >= range.start && date <= range.end;
}

// Pipeline rows without a date are a client that hasn't been dated yet, not
// a client that doesn't exist -- keep them visible in every period rather
// than silently hiding them (same "shouldn't break the page" reasoning as
// missing sheets, see the schema comment up top).
function hlwInRangePipeline(date, range) {
  return !date || (date >= range.start && date <= range.end);
}

function hlwBuildPeriodView(raw, range) {
  const snapRows = raw.snapshotRows.filter(r => hlwInRangeStrict(r.date, range));
  let snapshot;
  if (snapRows.length) {
    const latest = snapRows[snapRows.length - 1]; // snapshotRows sorted ascending at parse time
    snapshot = {
      period: range.label,
      revenue: snapRows.reduce((s, r) => s + r.revenue, 0),
      expenses: snapRows.reduce((s, r) => s + r.expenses, 0),
      netIncome: snapRows.reduce((s, r) => s + r.netIncome, 0),
      cash: latest.cash,
      activeClients: latest.activeClients,
      entities: latest.entities
    };
  } else {
    snapshot = { period: range.label, revenue: 0, expenses: 0, netIncome: 0, cash: 0, activeClients: 0, entities: '' };
  }

  const pipeline = raw.pipeline.filter(r => hlwInRangePipeline(r.date, range));
  const waterfall = raw.waterfall.filter(r => hlwInRangeStrict(r.date, range));

  const hoursByPartner = {};
  raw.hours.filter(r => hlwInRangeStrict(r.date, range)).forEach(r => {
    hoursByPartner[r.partner] = (hoursByPartner[r.partner] || 0) + r.hours;
  });

  const order = [];
  const byPartner = {};
  raw.capital.forEach(c => {
    if (!byPartner[c.partner]) { byPartner[c.partner] = { partner: c.partner, hours: 0, capitalStatus: '', capitalBalance: null }; order.push(c.partner); }
    byPartner[c.partner].capitalStatus = c.capitalStatus;
    byPartner[c.partner].capitalBalance = c.capitalBalance;
  });
  Object.keys(hoursByPartner).forEach(name => {
    if (!byPartner[name]) { byPartner[name] = { partner: name, hours: 0, capitalStatus: '', capitalBalance: null }; order.push(name); }
  });
  order.forEach(name => { byPartner[name].hours = hoursByPartner[name] || 0; });

  return { snapshot, pipeline, waterfall, partners: order.map(name => byPartner[name]) };
}

// Top-level entry point: File -> raw parsed workbook (not yet period-
// filtered -- see hlwBuildPeriodView above and applyPeriod in app.js).
async function hlwParseWorkbook(file) {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array', cellDates: true });
  return {
    snapshotRows: hlwParseSnapshotRows(workbook),
    pipeline: hlwParsePipeline(workbook),
    hours: hlwParseHoursRows(workbook),
    capital: hlwParseCapitalRows(workbook),
    waterfall: hlwParseWaterfall(workbook),
    fileName: file.name,
    lastModified: file.lastModified
  };
}
