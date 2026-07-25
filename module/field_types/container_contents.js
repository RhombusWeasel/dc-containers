/**
 * container_contents — custom field type for the boon editor.
 *
 * Renders a compact summary with a button to open the full contents editor
 * sheet. The contents data is stored as a nested object:
 * { "category.item": { qty: N } }
 *
 * Registered with the system via game.dc.register_field_type().
 *
 * Handler interface:
 *   render(field, current_value, sub_id) → string  (HTML <td> pair)
 *   extract(field, element, boon_data)    → object  (contents data)
 *   on_render(field, container, boon_data, re_render) → void
 *   view(field, current_value)            → string  (read-only summary)
 */

import { ContainerContentsEditorApp } from "./container_contents_editor.js";
import { container_catalog } from "../lib/container_catalog.js";

// ─── Render ──────────────────────────────────────────────────────────────

function render(field, current_value, sub_id) {
	const contents = current_value || {};
	const count = container_catalog.count_selected_items(contents);

	let html = `<td class="left width-50"><label class="dl-label">${field.label || "Contents"}</label></td>`;
	html += `<td class="left width-50">`;
	html += `<div class="${sub_id}${field.key} container-contents-editor" data-field-value="${field.value}">`;
	html += `<div class="container-contents-summary">${count} item${count === 1 ? "" : "s"}</div>`;
	html += `<button type="button" class="container-contents-open">${game.i18n.localize("dc.containers.edit_contents")}</button>`;
	html += `</div>`;
	html += `</td>`;
	return html;
}

// ─── Extract ──────────────────────────────────────────────────────────────

function extract(field, element, boon_data) {
	return boon_data?.contents || {};
}

// ─── on_render — wire open button ─────────────────────────────────────────

function on_render(field, container, boon_data, re_render) {
	const btn = container.querySelector(".container-contents-open");
	if (!btn) return;

	btn.addEventListener("click", (event) => {
		event.preventDefault();
		if (!boon_data.contents) {
			boon_data.contents = {};
		}

		ContainerContentsEditorApp.open({
			contents: boon_data.contents,
			on_change: (updated) => {
				boon_data.contents = updated;
				_update_summary(container, updated);
			},
		});
	});
}

function _update_summary(container, contents) {
	const count = container_catalog.count_selected_items(contents || {});
	const summary = container.querySelector(".container-contents-summary");
	if (summary) {
		summary.textContent = `${count} item${count === 1 ? "" : "s"}`;
	}
}

// ─── View — read-only summary ──────────────────────────────────────────────

function view(field, current_value) {
	const contents = current_value || {};
	const count = container_catalog.count_selected_items(contents);
	return `${count} item${count === 1 ? "" : "s"}`;
}

// ─── Registration ──────────────────────────────────────────────────────────

function register() {
	game.dc.register_field_type("container_contents", {
		render,
		extract,
		on_render,
		view,
	});
}

export { register };
