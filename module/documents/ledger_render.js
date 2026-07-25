const TEMPLATE = 'modules/dc-containers/templates/documents/ledger_sheet.hbs';

function parse_amount(value) {
  const n = parseFloat(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function compute_ledger_balances(data) {
  const result = foundry.utils.deepClone(data);
  let running = 0;
  result.rows = (result.rows || []).map(row => {
    running += parse_amount(row.debit) - parse_amount(row.credit);
    return { ...row, balance: running.toFixed(2) };
  });
  return result;
}

async function render_ledger_html(data) {
  if (!data) return '';
  const computed = compute_ledger_balances(data);
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, computed);
}

export { render_ledger_html, compute_ledger_balances };
