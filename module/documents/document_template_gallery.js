/**
 * Template gallery wiring for the GM Documents tab.
 *
 * Injects a draggable template gallery into the GM Documents tab.
 * Template cards are built client-side from get_template_groups() and
 * injected into the .dc-doc-template-gallery-placeholder element.
 * Clicking or dragging a card creates a new document item from that template.
 */

import { get_template_groups } from "./document_templates.js";
import { normalize_document_data } from "./document_categories.js";

const GALLERY_HTML_TEMPLATE = `
<div class="dc-doc-template-gallery">
  <a class="dc-doc-template-gallery-toggle">
    <i class="fas fa-chevron-down"></i>
    <i class="fas fa-layer-group"></i>
    <span class="dc-doc-template-gallery-title"></span>
    <span class="dc-doc-template-gallery-hint"></span>
  </a>
  <div class="dc-doc-template-gallery-body"></div>
</div>
`;

/**
 * Build the gallery HTML string from template groups.
 * @returns {string}
 */
function build_gallery_html(collapsed) {
  const groups = get_template_groups();
  const title = game.i18n.localize("dc.containers.doc.template_gallery_title");
  const hint = game.i18n.localize("dc.containers.doc.template_gallery_hint");

  const groups_html = groups.map((group) => {
    const cards = group.templates.map((tmpl) => {
      const desc = foundry.utils.escapeHTML(tmpl.description || "");
      const label = foundry.utils.escapeHTML(tmpl.label || "");
      return `
        <div class="dc-doc-template-card" data-template-key="${foundry.utils.escapeHTML(tmpl.key)}" title="${desc}">
          <i class="fas ${group.icon}"></i>
          <div class="dc-doc-template-card-body">
            <div class="dc-doc-template-card-label">${label}</div>
            <div class="dc-doc-template-card-desc">${desc}</div>
          </div>
        </div>`;
    }).join("");

    return `
      <div class="dc-doc-template-group">
        <div class="dc-doc-template-group-header">
          <i class="fas ${group.icon}"></i>
          <span>${foundry.utils.escapeHTML(group.label)}</span>
          <span class="dc-doc-template-group-count">(${group.templates.length})</span>
        </div>
        <div class="dc-doc-template-cards">${cards}</div>
      </div>`;
  }).join("");

  return `
  <div class="dc-doc-template-gallery${collapsed ? " dc-doc-gallery-collapsed" : ""}">
    <a class="dc-doc-template-gallery-toggle">
      <i class="fas fa-chevron-down${collapsed ? "" : " fa-rotate-180"}"></i>
      <i class="fas fa-layer-group"></i>
      <span class="dc-doc-template-gallery-title">${foundry.utils.escapeHTML(title)}</span>
      <span class="dc-doc-template-gallery-hint">${foundry.utils.escapeHTML(hint)}</span>
    </a>
    <div class="dc-doc-template-gallery-body">${groups_html}</div>
  </div>`;
}

/**
 * Create a new document gear item from a template.
 * Uses game.dc.utils.modify_path + update_system (same pattern as _onNewPath).
 *
 * @param {Application} app — the GM sheet application
 * @param {string} template_key — the key in DOCUMENT_TEMPLATES
 */
async function create_from_template(app, template_key) {
  const templates = game.dc.get_gear_templates?.("documents");
  if (!templates || !templates[template_key]) return;

  const template_data = foundry.utils.deepClone(templates[template_key]);
  normalize_document_data(template_data);

  // Ensure gear.documents exists
  if (game.dc.system.gear.documents === undefined) {
    game.dc.system.gear.documents = {};
  }

  // Generate a unique key from the template label
  let base_key = game.dc.utils.string_to_key(template_data.label || template_key);
  let key = base_key;
  let counter = 2;
  while (game.dc.system.gear.documents[key] !== undefined) {
    key = `${base_key}_${counter++}`;
  }

  // Insert and save
  game.dc.utils.modify_path(game.dc.system, `gear.documents.${key}`, template_data);
  game.dc.utils.update_system(app.actor);

  // Re-render the GM sheet to show the new item
  if (app?.rendered) app.render({ force: true });

  ui.notifications.info(game.i18n.format("dc.containers.doc.template_added", {
    name: template_data.label,
  }));
}

/**
 * Wire up the template gallery in the GM Documents tab.
 * Called from the renderApplication hook when the placeholder is found.
 *
 * @param {HTMLElement} root — the GM sheet root element
 * @param {Application} app — the GM sheet application
 */
function wire_template_gallery(root, app) {
  const placeholder = root.querySelector(".dc-doc-template-gallery-placeholder");
  if (!placeholder) return;

  // Check collapsed state from the GM actor's tab settings
  const collapsed = app?.actor?.system?.tabs?.gear?.tabs?.documents?.gallery_collapsed === true;

  // Inject gallery HTML
  placeholder.innerHTML = build_gallery_html(collapsed);

  const gallery = placeholder.querySelector(".dc-doc-template-gallery");
  if (!gallery) return;

  // Toggle collapsible section
  const toggle = gallery.querySelector(".dc-doc-template-gallery-toggle");
  if (toggle) {
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      const body = gallery.querySelector(".dc-doc-template-gallery-body");
      if (!body) return;
      const is_open = gallery.classList.toggle("dc-doc-gallery-collapsed") === false;
      const chevron = toggle.querySelector(".fa-chevron-down");
      if (chevron) chevron.classList.toggle("fa-rotate-180", is_open);

      // Persist collapsed state
      const actor = app?.actor;
      if (actor) {
        game.dc.utils.save_actor(actor, (system) => {
          system.tabs = system.tabs || {};
          system.tabs.gear = system.tabs.gear || {};
          system.tabs.gear.tabs = system.tabs.gear.tabs || {};
          system.tabs.gear.tabs.documents = system.tabs.gear.tabs.documents || {};
          system.tabs.gear.tabs.documents.gallery_collapsed = !is_open;
        });
      }
    });
  }

  // Click-to-add on template cards
  gallery.querySelectorAll("[data-template-key]").forEach((card) => {
    // Click creates the document
    card.addEventListener("click", (event) => {
      event.preventDefault();
      const key = card.dataset.templateKey;
      create_from_template(app, key);
    });

    // HTML5 drag-and-drop
    card.setAttribute("draggable", "true");
    card.addEventListener("dragstart", (event) => {
      const key = card.dataset.templateKey;
      event.dataTransfer.setData("text/plain", JSON.stringify({
        source: "document-template-gallery",
        template_key: key,
      }));
      event.dataTransfer.effectAllowed = "copy";
    });
  });

  // Drop zone on the documents table area
  const drop_zone = root.querySelector(".dc-doc-template-drop-zone") ?? root.querySelector("table");
  if (drop_zone) {
    drop_zone.addEventListener("dragover", (event) => {
      if (!event.dataTransfer?.types?.includes("text/plain")) return;
      event.preventDefault();
      drop_zone.classList.add("dc-doc-drop-active");
    });
    drop_zone.addEventListener("dragleave", () => {
      drop_zone.classList.remove("dc-doc-drop-active");
    });
    drop_zone.addEventListener("drop", (event) => {
      event.preventDefault();
      drop_zone.classList.remove("dc-doc-drop-active");
      try {
        const payload = JSON.parse(event.dataTransfer.getData("text/plain"));
        if (payload?.source === "document-template-gallery" && payload.template_key) {
          create_from_template(app, payload.template_key);
        }
      } catch (_err) {
        // Not our payload — ignore
      }
    });
  }
}

export {
  wire_template_gallery,
  create_from_template,
};