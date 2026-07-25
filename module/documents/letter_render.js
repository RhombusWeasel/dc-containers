const TEMPLATE = 'modules/dc-containers/templates/documents/letter_sheet.hbs';

async function render_letter_html(data) {
  if (!data) return '';
  const ctx = {
    ...data,
    body_html: (data.body || []).map(p => `<p>${foundry.utils.escapeHTML(p)}</p>`).join(''),
  };
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, ctx);
}

export { render_letter_html };
