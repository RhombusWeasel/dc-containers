const TEMPLATE = 'modules/dc-containers/templates/documents/map_sheet.hbs';

async function render_map_html(data) {
  if (!data) return '';
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, data);
}

export { render_map_html };
