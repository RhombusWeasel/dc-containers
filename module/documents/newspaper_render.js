const NEWSPAPER_TEMPLATE = "modules/dc-containers/templates/documents/newspaper_sheet.hbs";

/**
 * Render structured newspaper_data through newspaper_sheet.hbs.
 * @param {Object} newspaper_data
 * @returns {Promise<string>}
 */
async function render_newspaper_html(newspaper_data) {
  if (!newspaper_data) return '';
  return foundry.applications.handlebars.renderTemplate(NEWSPAPER_TEMPLATE, newspaper_data);
}

export { render_newspaper_html };
