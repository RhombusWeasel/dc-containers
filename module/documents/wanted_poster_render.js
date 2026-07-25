const TEMPLATE = 'modules/dc-containers/templates/documents/wanted_poster_sheet.hbs';

async function render_wanted_poster_html(data) {
  if (!data) return '';
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, data);
}

export { render_wanted_poster_html };
