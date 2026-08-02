/**
 * Shared quick-fill bar helper for document editors.
 *
 * Provides a simple API to build and wire a quick-fill bar of template
 * buttons inside any document editor.  Each button applies pre-built
 * content to the editor's doc_data and re-renders.
 *
 * Usage in an editor's wire_events(root):
 *
 *   wire_quickfill(root, this, {
 *     label: game.i18n.localize("dc.containers.doc.quickfill_label"),
 *     buttons: [
 *       { id: 'business', label: 'Business Letter', icon: 'fa-briefcase',
 *         apply: (doc_data) => ({ ...doc_data, salutation: 'Dear Sir,', ... }) },
 *     ],
 *   });
 */

/**
 * Build the HTML string for a quick-fill bar.
 * @param {Object} opts
 * @param {string} opts.label — bar label text
 * @param {Array} opts.buttons — [{ id, label, icon }]
 * @returns {string}
 */
function build_quickfill_html({ label, buttons }) {
  const btn_html = (buttons || []).map((btn) => {
    const icon = btn.icon ? `<i class="fas ${btn.icon}"></i>` : "";
    return `<button type="button" class="editor-quickfill-btn" data-quickfill="${btn.id}">${icon} ${foundry.utils.escapeHTML(btn.label)}</button>`;
  }).join("");

  const label_html = label ? `<span class="editor-quickfill-label">${foundry.utils.escapeHTML(label)}</span>` : "";
  return `<div class="editor-quickfill-bar">${label_html}${btn_html}</div>`;
}

/**
 * Wire up a quick-fill bar in an editor root element.
 * The bar HTML must already be in the DOM (injected via the template or
 * via _prepareContext).  This function attaches click handlers.
 *
 * @param {HTMLElement} root — editor root element
 * @param {Object} sheet — the editor sheet instance (has doc_data, _read_from_dom, render)
 * @param {Object} config
 * @param {Array} config.buttons — [{ id, apply(doc_data) → new_doc_data }]
 */
function wire_quickfill(root, sheet, { buttons }) {
  const bar = root.querySelector(".editor-quickfill-bar");
  if (!bar) return;

  bar.querySelectorAll("[data-quickfill]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      const id = btn.dataset.quickfill;
      const button_def = buttons.find((b) => b.id === id);
      if (!button_def?.apply) return;

      // Sync DOM → doc_data first so we don't lose current edits
      if (sheet._read_from_dom) sheet._read_from_dom();
      sheet.doc_data = button_def.apply(foundry.utils.deepClone(sheet.doc_data));
      sheet.render({ force: true });
    });
  });
}

export {
  build_quickfill_html,
  wire_quickfill,
};