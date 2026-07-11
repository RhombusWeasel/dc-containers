/**
 * container_contents — custom field type for the boon editor.
 *
 * Renders the full gear catalog as a collapsible tree with a quantity
 * input per item. The contents data is stored as a nested object:
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

// ─── Render ──────────────────────────────────────────────────────────────

function render(field, current_value, sub_id) {
	const contents = current_value || {};
	const sections = _build_catalog_tree(contents);

	let html = `<td class="left width-50"><label class="dl-label">${field.label || "Contents"}</label></td>`;
	html += `<td class="left width-50">`;
	html += `<div class="${sub_id}${field.key} container-contents-editor" data-field-value="${field.value}">`;
	html += `<div class="container-contents-summary">${_count_items(contents)} items</div>`;
	html += `<div class="container-contents-tree scroll" style="max-height:400px; overflow-y:auto;">`;
	html += sections;
	html += `</div>`;
	html += `</div>`;
	html += `</td>`;
	return html;
}

function _build_catalog_tree(contents) {
	const categories = {
		ammo: "dc.gear.ammo",
		armour: "dc.gear.armour",
		melee: "dc.gear.melee",
		ranged: "dc.gear.ranged",
		thrown: "dc.gear.thrown",
		explosives: "dc.gear.explosives",
		misc: "dc.gear.misc",
		goods: "dc.gear.goods",
		services: "dc.gear.services",
	};

	let html = "";
	for (const [cat_key, cat_label] of Object.entries(categories)) {
		const items = [];
		for (const entry of game.dc.gear_catalog.iterate_catalog()) {
			if (entry.category !== cat_key) continue;
			items.push(entry);
		}
		if (items.length === 0) continue;

		const localized_cat = game.i18n.localize(cat_label);
		html += `<h4 class="center dc-header">${localized_cat}</h4>`;
		html += `<table class="container-gm-table">`;
		html += `<tr>`;
		html += `<th class="center width-10">${game.i18n.localize("dc.containers.qty")}</th>`;
		html += `<th>${game.i18n.localize("dc.shared.name")}</th>`;
		html += `<th>${game.i18n.localize("dc.shared.cost")}</th>`;
		html += `</tr>`;

		for (const entry of items) {
			const qty = _get_qty(contents, entry.path);
			const label = entry.item?.label || entry.key;
			const cost = entry.item?.cost ?? 0;

			html += `<tr>`;
			html += `<td class="center">`;
			html += `<input type="number" class="container-qty-input" data-path="${entry.path}" value="${qty}" min="0" ${qty > 0 ? '' : ''} />`;
			html += `</td>`;
			html += `<td class="left">${label}</td>`;
			html += `<td class="right">${_format_currency(cost)}</td>`;
			html += `</tr>`;
		}
		html += `</table>`;
	}
	return html;
}

function _get_qty(contents, path) {
	const entry = game.dc.utils.data_from_path(contents, path);
	if (!entry) return 0;
	return entry.qty ?? 0;
}

function _count_items(contents) {
	let count = 0;
	_walk_contents(contents, (path, entry) => {
		if ((entry.qty ?? 0) > 0) count++;
	});
	return count;
}

function _walk_contents(contents, fn, prefix = "") {
	if (!contents || typeof contents !== "object") return;
	for (const [key, value] of Object.entries(contents)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (value && typeof value === "object" && "qty" in value) {
			fn(path, value);
		} else if (value && typeof value === "object") {
			_walk_contents(value, fn, path);
		}
	}
}

function _format_currency(value) {
	const dollars = Math.floor(value / 100);
	const cents = Math.floor(value % 100);
	return cents < 10 ? `$${dollars}.0${cents}` : `$${dollars}.${cents}`;
}

// ─── Extract ──────────────────────────────────────────────────────────────

function extract(field, element, boon_data) {
	const contents = {};

	if (!element) {
		console.warn("container_contents.extract: element is null");
		return contents;
	}

	// Read all qty inputs — any item with qty > 0 is included
	const inputs = element.querySelectorAll(".container-qty-input");
	for (const input of inputs) {
		const path = input.dataset.path;
		if (!path) continue;
		let qty = parseInt(input.value, 10);
		if (isNaN(qty) || qty <= 0) continue;
		game.dc.utils.modify_path(contents, path, { qty });
	}

	return contents;
}

// ─── on_render — wire up qty change events ─────────────────────────────────

function on_render(field, container, boon_data, re_render) {
	// Update summary on qty change
	container.querySelectorAll(".container-qty-input").forEach((input) => {
		input.addEventListener("input", () => {
			_update_summary(container);
		});
	});
}

function _update_summary(container) {
	let count = 0;
	container.querySelectorAll(".container-qty-input").forEach((input) => {
		const qty = parseInt(input.value, 10);
		if (!isNaN(qty) && qty > 0) count++;
	});
	const summary = container.querySelector(".container-contents-summary");
	if (summary) {
		summary.textContent = `${count} items`;
	}
}

// ─── View — read-only summary ──────────────────────────────────────────────

function view(field, current_value) {
	const contents = current_value || {};
	const count = _count_items(contents);
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