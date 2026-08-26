// Parses the connected .xlsx workbook (via SheetJS) into the plain JS shape
// render.js expects. Expected workbook structure — see reference/TEMPLATE.md
// or reference/HLW_PM_Template.xlsx:
//
//   Sheet "Snapshot"   — two columns, Key / Value. Recognized keys (case-insensitive):
//                        Period, Revenue, Expenses, Net Income, Cash On Hand,
//                        Active Clients, Entities
//   Sheet "Pipeline"   — columns: Client, Engagement, Type, Stage, Procurer
//                        Type is "Recurring" or "One-off".
//   Sheet "Hours"      — columns: Partner, Hours Logged
//   Sheet "Capital"    — columns: Partner, Capital Account Status, Capital Balance (optional)
//   Sheet "Waterfall"  — columns: Client, Engagement Type, Gross Profit,
//                        Procurer, Preparer, Reviewer, Bookkeeper
//                        Engagement Type is "Tax Prep" or "Bookkeeping".
//
// Sheet names are matched case-insensitively and with surrounding whitespace
// trimmed, so "snapshot ", "SNAPSHOT" etc. all work. Missing sheets simply
// render as empty sections rather than erroring out — a partner filling in
// the workbook incrementally shouldn't break the page.

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

function hlwParseSnapshot(workbook) {
  const rows = hlwSheetToRows(hlwFindSheet(workbook, 'Snapshot'));
  const out = { period: '', revenue: 0, expenses: 0, netIncome: 0, cash: 0, activeClients: 0, entities: '' };
  const map = {
    period: ['period'],
    revenue: ['revenue'],
    expenses: ['expenses'],
    netIncome: ['net income', 'netincome'],
    cash: ['cash on hand', 'cash'],
    activeClients: ['active clients', 'clients'],
    entities: ['entities']
  };
  rows.forEach(row => {
    const key = String(hlwGetField(row, 'Key', 'Metric')).trim().toLowerCase();
    const value = hlwGetField(row, 'Value');
    for (const [outKey, aliases] of Object.entries(map)) {
      if (aliases.includes(key)) {
        out[outKey] = ['revenue', 'expenses', 'netIncome', 'cash'].includes(outKey) ? hlwToNumber(value) : value;
      }
    }
  });
  return out;
}

function hlwParsePipeline(workbook) {
  return hlwSheetToRows(hlwFindSheet(workbook, 'Pipeline')).map(row => ({
    client: hlwGetField(row, 'Client'),
    engagement: hlwGetField(row, 'Engagement'),
    type: hlwGetField(row, 'Type'),
    stage: hlwGetField(row, 'Stage'),
    procurer: hlwGetField(row, 'Procurer')
  })).filter(r => r.client);
}

function hlwParseHoursAndCapital(workbook) {
  const hours = hlwSheetToRows(hlwFindSheet(workbook, 'Hours'));
  const capital = hlwSheetToRows(hlwFindSheet(workbook, 'Capital'));
  const byPartner = {};
  const order = [];

  hours.forEach(row => {
    const name = String(hlwGetField(row, 'Partner')).trim();
    if (!name) return;
    if (!byPartner[name]) { byPartner[name] = { partner: name, hours: 0, capitalStatus: '', capitalBalance: null }; order.push(name); }
    byPartner[name].hours = hlwToNumber(hlwGetField(row, 'Hours Logged', 'Hours'));
  });

  capital.forEach(row => {
    const name = String(hlwGetField(row, 'Partner')).trim();
    if (!name) return;
    if (!byPartner[name]) { byPartner[name] = { partner: name, hours: 0, capitalStatus: '', capitalBalance: null }; order.push(name); }
    byPartner[name].capitalStatus = hlwGetField(row, 'Capital Account Status', 'Status');
    const balance = hlwGetField(row, 'Capital Balance', 'Balance');
    byPartner[name].capitalBalance = balance === '' ? null : hlwToNumber(balance);
  });

  return order.map(name => byPartner[name]);
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

    if (isBookkeeping) {
      const split = HLW_WATERFALL_SPLIT.bookkeeping;
      return {
        client, type: 'Bookkeeping', gross,
        bookkeeper: hlwGetField(row, 'Bookkeeper'),
        amounts: { bookkeeper: gross * split.bookkeeper, capital: gross * split.capital }
      };
    }
    const split = HLW_WATERFALL_SPLIT.taxPrep;
    return {
      client, type: 'Tax Prep', gross,
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

// Top-level entry point: File -> parsed data object for render.js.
async function hlwParseWorkbook(file) {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array' });
  return {
    snapshot: hlwParseSnapshot(workbook),
    pipeline: hlwParsePipeline(workbook),
    partners: hlwParseHoursAndCapital(workbook),
    waterfall: hlwParseWaterfall(workbook),
    fileName: file.name,
    lastModified: file.lastModified
  };
}
