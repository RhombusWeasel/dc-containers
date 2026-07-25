const TEMPLATE = 'modules/dc-containers/templates/documents/journal_sheet.hbs';

async function render_journal_html(data) {
  if (!data) return '';
  const entries = (data.entries || []).map(entry => ({
    ...entry,
    body_html: (entry.body || '').split('\n').map(line =>
      line.trim() ? `<p>${foundry.utils.escapeHTML(line)}</p>` : ''
    ).join(''),
  }));
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, { ...data, entries });
}

export { render_journal_html };
