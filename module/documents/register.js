/**
 * Document system registration — wires the document gear type, GM tab,
 * gear partials, schemas, templates, and use-item handler into the
 * Deadlands-Classic system via the extension APIs.
 */

import DocumentSheet from "./document_sheet.js";
import {
	document_category_options,
	normalize_document_data,
} from "./document_categories.js";
import { document_data_defaults } from "./document_data_utils.js";
import { build_embed_url } from "./document_embed.js";
import { sync_document_editor_buttons } from "./document_editor_registry.js";
import { render_document_html } from "./document_render.js";
import * as newspaper_generator from "./newspaper_generator.js";
import { show_fragment_pool_editor } from "./newspaper_fragment_pool_editor.js";
import { show_value_list_editor } from "./newspaper_value_list_editor.js";
import { render_newspaper_html } from "./newspaper_render.js";
import { render_wanted_poster_html } from "./wanted_poster_render.js";
import { render_letter_html } from "./letter_render.js";
import { render_journal_html } from "./journal_render.js";
import { render_ledger_html } from "./ledger_render.js";
import { render_map_html } from "./map_render.js";
import { render_other_html } from "./other_render.js";
import { open_wanted_poster_editor } from "./wanted_poster_editor.js";
import { open_letter_editor } from "./letter_editor.js";
import { open_journal_editor } from "./journal_editor.js";
import { open_ledger_editor } from "./ledger_editor.js";
import { open_map_editor } from "./map_editor.js";
import { open_book_editor } from "./book_editor.js";
import { open_web_page_editor } from "./web_page_editor.js";
import { open_other_editor } from "./other_editor.js";
import { generate_wanted_poster_data } from "./wanted_poster_editor.js";
import { generate_letter_data } from "./letter_editor.js";
import { wire_template_gallery } from "./document_template_gallery.js";
import { DOCUMENT_TEMPLATES, get_template_groups } from "./document_templates.js";

const MODULE_ID = "dc-containers";

const DATA_DEFAULTS = document_data_defaults();

// ─── Use-item handler ─────────────────────────────────────────────────────

async function preview_handler(actor, path, key, item) {
	if (!item) return;
	await open(item, actor);
}

async function use_handler(actor, path, key, item) {
	if (path !== 'char.gear.documents') return;
	if (!item) return;
	const doc = normalize_document_data(foundry.utils.deepClone(item));
	const sheet = new DocumentSheet(doc, actor);
	try {
		await sheet.render(true);
	} catch (err) {
		console.error('dc-containers | Failed to open document reader:', err);
		ui.notifications.error(game.i18n.localize('dc.containers.doc.open_failed'));
	}
	return sheet;
}

// ─── Pre-built document templates ─────────────────────────────────────────
// Rich, pre-filled templates now live in document_templates.js.
const document_templates = DOCUMENT_TEMPLATES;

// ─── Public API ───────────────────────────────────────────────────────────

async function open(item, actor) {
	if (!item) return;
	const doc = normalize_document_data(foundry.utils.deepClone(item));
	const sheet = new DocumentSheet(doc, actor);
	await sheet.render(true);
	return sheet;
}

function create_template(category, overrides = {}) {
	return normalize_document_data({
		label: '',
		cost: 0,
		quantity: 1,
		weight: 1,
		category: category || 'book',
		content_type: 'ia_book',
		url: '',
		text_content: '',
		image: '',
		description: '',
		rarity: 'common',
		user_made: true,
		boons: [],
		count: 0,
		...DATA_DEFAULTS,
		...overrides,
	});
}

function build_new_object() {
	return {
		label: '',
		cost: 0,
		quantity: 1,
		weight: 1,
		category: 'book',
		content_type: 'ia_book',
		url: '',
		text_content: '',
		image: '',
		description: '',
		rarity: 'common',
		user_made: true,
		boons: [],
		...DATA_DEFAULTS,
	};
}

function build_editor_schema(rarity_options) {
	const categories = document_category_options();
	return {
		new_object: build_new_object(),
		data: {
			name:          { key: 'label',        type: 'text',      value: 'label',        label: game.i18n.localize("dc.shared.name") },
			category:      { key: 'category',      type: 'dropdown',  value: 'category',      options: categories, translation_path: 'dc.containers.doc.categories', label: game.i18n.localize("dc.shared.category") },
			url:           { key: 'url',           type: 'text',      value: 'url',           label: game.i18n.localize("dc.containers.doc.url") },
			image:         { key: 'image',          type: 'text',      value: 'image',         label: game.i18n.localize("dc.containers.doc.image") },
			value:         { key: 'cost',           type: 'number',    value: 'cost',           label: game.i18n.localize("dc.shared.cost") },
			quantity:      { key: 'quantity',       type: 'number',    value: 'quantity',       label: game.i18n.localize("dc.shared.quantity") },
			weight:        { key: 'weight',         type: 'number',    value: 'weight',         label: game.i18n.localize("dc.shared.weight") },
			rarity:        { key: 'rarity',         type: 'dropdown',  value: 'rarity',         options: rarity_options, translation_path: 'dc.equipment.rarity', label: game.i18n.localize("dc.shared.rarity") },
			text_content:  { key: 'text_content',   type: 'text_area', value: 'text_content',   label: game.i18n.localize("dc.containers.doc.text_content") },
			description:   { key: 'description',    type: 'text_area', value: 'description',    label: game.i18n.localize("dc.shared.description") },
		},
		func: (form_data) => normalize_document_data(form_data),
	};
}

function build_viewer_schema(rarity_options) {
	const categories = document_category_options();
	return {
		new_object: build_new_object(),
		data: {
			name:          { key: 'label',        type: 'text',      value: 'label',        label: game.i18n.localize("dc.shared.name") },
			category:      { key: 'category',      type: 'dropdown',  value: 'category',      options: categories, translation_path: 'dc.containers.doc.categories', label: game.i18n.localize("dc.shared.category") },
			url:           { key: 'url',           type: 'text',      value: 'url',           label: game.i18n.localize("dc.containers.doc.url") },
			image:         { key: 'image',          type: 'text',      value: 'image',         label: game.i18n.localize("dc.containers.doc.image") },
			value:         { key: 'cost',           type: 'number',    value: 'cost',           label: game.i18n.localize("dc.shared.cost") },
			quantity:      { key: 'quantity',       type: 'number',    value: 'quantity',       label: game.i18n.localize("dc.shared.quantity") },
			weight:        { key: 'weight',         type: 'number',    value: 'weight',         label: game.i18n.localize("dc.shared.weight") },
			rarity:        { key: 'rarity',         type: 'dropdown',  value: 'rarity',         options: rarity_options, translation_path: 'dc.equipment.rarity', label: game.i18n.localize("dc.shared.rarity") },
			text_content:  { key: 'text_content',   type: 'text_area', value: 'text_content',   label: game.i18n.localize("dc.containers.doc.text_content") },
			description:   { key: 'description',    type: 'text_area', value: 'description',    label: game.i18n.localize("dc.shared.description") },
		}
	};
}

async function _ensure_gear_documents() {
	if (!game.user.isGM || !game.dc?.system?.gear) return;
	if (game.dc.system.gear.documents !== undefined) return;
	game.dc.system.gear.documents = {};
	if (game.dc.utils?.update_system) {
		await game.dc.utils.update_system();
	}
}

function _is_documents_editor(editor) {
	return editor.path === 'gear.documents' || editor.path === 'char.gear.documents';
}

async function _prepare_viewer_context(context) {
	if (context.item_type !== 'documents') return;
	const rendered = await render_document_html(context.data);
	context.document_html = rendered.html;
	context.embed_url = rendered.embed_url || context.embed_url;
	if (context.data?.content_type === 'newspaper' && context.data?.newspaper_data) {
		context.newspaper_html = rendered.html;
	}
}

export function register_documents() {
	const generate_random_name = game.dc.generate_random_name;
	if (generate_random_name) {
		newspaper_generator.init(generate_random_name);
	}

	_ensure_gear_documents();

	const rarity_options = game.dc.system.equipment.rarity || {};
	const editor_schema = build_editor_schema(rarity_options);
	const viewer_schema = build_viewer_schema(rarity_options);

	game.dc.register_gear_type("documents", {
		editor_schema,
		viewer_schema,
		viewer_partial: "modules/dc-containers/templates/documents/viewer_documents.hbs",
		use_handler,
		preview_handler,
	});

	game.dc.register_gear_partial("documents", {
		label: "Documents",
		player_partial: "modules/dc-containers/templates/documents/gear_documents.hbs",
		gm_partial: "modules/dc-containers/templates/documents/gm_documents.hbs",
		gm_tab: { id: "documents", label: "Documents", order: 50 },
		order: 50,
	});

	game.dc.register_gm_tab("dc-containers.documents", {
		group: "gear",
		id: "documents",
		label: "Documents",
		order: 50,
	});

	game.dc.register_gear_templates("documents", document_templates);

	Hooks.on("dcItemViewerPrepareContext", async (viewer, context) => {
		await _prepare_viewer_context(context);
	});

	// Wire up the template gallery in the GM Documents tab after each render.
	// The GM sheet is ApplicationV2, so we use the renderApplicationV2 hook.
	Hooks.on("renderApplicationV2", (app, element) => {
		const el = element instanceof HTMLElement ? element : element?.[0];
		if (!el) return;
		const gallery = el.querySelector?.(".dc-doc-template-gallery-placeholder");
		if (!gallery) return;
		wire_template_gallery(el, app);
	});

	Hooks.on("dcEditorRender", (editor, element) => {
		if (!_is_documents_editor(editor)) return;

		normalize_document_data(editor.data);
		sync_document_editor_buttons(editor, element);

		const category_select = element.querySelector('select.category');
		if (!category_select) return;

		if (editor._bound_document_category_change) {
			category_select.removeEventListener('change', editor._bound_document_category_change);
		}
		editor._bound_document_category_change = () => {
			editor._sync_form_to_data();
			normalize_document_data(editor.data);
			sync_document_editor_buttons(editor, element);
		};
		category_select.addEventListener('change', editor._bound_document_category_change);
	});

	const module_api = game.modules.get(MODULE_ID);
	if (module_api) {
		module_api.api = module_api.api || {};
		module_api.api.document = {
			open,
			build_embed_url,
			create_template,
			render_document_html,
			render_newspaper_html,
			render_wanted_poster_html,
			render_letter_html,
			render_journal_html,
			render_ledger_html,
			render_map_html,
			render_other_html,
			generate_newspaper: newspaper_generator.generate_newspaper,
			generate_article: newspaper_generator.generate_article,
			generate_wanted_poster: generate_wanted_poster_data,
			generate_letter: generate_letter_data,
			register_newspaper_content: newspaper_generator.register_newspaper_content,
			list_newspaper_content: newspaper_generator.list_newspaper_content,
			register_article_blueprint: newspaper_generator.register_article_blueprint,
			list_blueprints: newspaper_generator.list_blueprints,
			get_effective_pool: newspaper_generator.get_effective_pool,
			show_fragment_pool_editor,
			show_value_list_editor,
			open_wanted_poster_editor,
			open_letter_editor,
			open_journal_editor,
			open_ledger_editor,
			open_map_editor,
			open_book_editor,
			open_web_page_editor,
			open_other_editor,
			get_template_groups,
		};
	}

	console.log("dc-containers | Document system registered.");
}

export { build_embed_url };
