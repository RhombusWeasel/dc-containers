const TEMPLATE = 'modules/dc-containers/templates/documents/other_sheet.hbs';

async function render_other_html(data) {
  if (!data) return '';
  const body_html = (data.body || '').split('\n').map(line =>
    line.trim() ? `<p>${foundry.utils.escapeHTML(line)}</p>` : ''
  ).join('');
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, { ...data, body_html });
}

export { render_other_html };
