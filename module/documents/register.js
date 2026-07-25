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
import * as newspaper_generator from "./newspaper_generator.js";
import { render_newspaper_html } from "./newspaper_render.js";

const MODULE_ID = "dc-containers";

// ─── Use-item handler ─────────────────────────────────────────────────────

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

const document_templates = {
	sourcebook_template: {
		label: "Sourcebook (Internet Archive)",
		cost: 5000,
		quantity: 1,
		weight: 2,
		category: "sourcebook",
		content_type: "ia_book",
		url: "",
		text_content: "",
		image: "",
		rarity: "rare",
		description: "A full sourcebook hosted on the Internet Archive. Paste the archive.org/details/ URL to embed the actual book reader.",
		user_made: false
	},
	journal_template: {
		label: "Journal / Diary",
		cost: 500,
		quantity: 1,
		weight: 1,
		category: "journal",
		content_type: "text",
		url: "",
		text_content: "",
		image: "",
		rarity: "uncommon",
		description: "A handwritten journal or diary. Fill the text content with the journal entries.",
		user_made: false
	},
	wanted_poster_template: {
		label: "Wanted Poster",
		cost: 0,
		quantity: 1,
		weight: 0,
		category: "wanted_poster",
		content_type: "image",
		url: "",
		text_content: "",
		image: "",
		rarity: "common",
		description: "A wanted poster. Set the image path to the poster image. Attach a roll_gate boon for the bounty check.",
		user_made: false
	},
	newspaper_template: {
		label: "Newspaper",
		cost: 50,
		quantity: 1,
		weight: 1,
		category: "newspaper",
		content_type: "newspaper",
		url: "",
		text_content: "",
		newspaper_data: null,
		image: "",
		rarity: "common",
		description: "A periodical or broadsheet. Use the Generate Newspaper button to create procedural layout content stored in newspaper_data.",
		user_made: false
	},
	map_template: {
		label: "Map",
		cost: 1000,
		quantity: 1,
		weight: 0,
		category: "map",
		content_type: "image",
		url: "",
		text_content: "",
		image: "",
		rarity: "uncommon",
		description: "A map. Set the image path to the map image.",
		user_made: false
	}
};

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Open the document reader sheet for an item.
 */
async function open(item, actor) {
	if (!item) return;
	const doc = normalize_document_data(foundry.utils.deepClone(item));
	const sheet = new DocumentSheet(doc, actor);
	await sheet.render(true);
	return sheet;
}

/**
 * Convert a document URL into an embeddable iframe URL.
 */
function build_embed_url(url) {
	url = (url || '').trim();
	if (!url) return '';
	if (url.includes('archive.org/details/')) return url.replace('archive.org/details/', 'archive.org/embed/');
	if (url.includes('archive.org/embed/')) return url;
	return url;
}

/**
 * Create a document item template with sensible defaults.
 */
function create_template(category, overrides = {}) {
	return normalize_document_data({
		label: '',
		cost: 0,
		quantity: 1,
		weight: 1,
		category: category || 'sourcebook',
		content_type: 'ia_book',
		url: '',
		text_content: '',
		newspaper_data: null,
		image: '',
		description: '',
		rarity: 'common',
		user_made: true,
		boons: [],
		count: 0,
		...overrides,
	});
}

// ─── Schema builder (called lazily on dcReady) ────────────────────────────

function build_editor_schema(rarity_options) {
	const categories = document_category_options();
	return {
		new_object: {
			label: '',
			cost: 0,
			quantity: 1,
			weight: 1,
			category: 'sourcebook',
			content_type: 'ia_book',
			url: '',
			text_content: '',
			newspaper_data: null,
			image: '',
			description: '',
			rarity: 'common',
			user_made: true,
			boons: []
		},
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
		new_object: { label: '', cost: 0, quantity: 1, weight: 1, category: 'sourcebook', content_type: 'ia_book', url: '', text_content: '', newspaper_data: null, image: '', description: '', rarity: 'common', user_made: true, boons: [] },
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

// ─── Gear migration ───────────────────────────────────────────────────────

async function _ensure_gear_documents() {
	if (!game.user.isGM || !game.dc?.system?.gear) return;
	if (game.dc.system.gear.documents !== undefined) return;
	game.dc.system.gear.documents = {};
	if (game.dc.utils?.update_system) {
		await game.dc.utils.update_system();
	}
}

// ─── Newspaper generation dialog ──────────────────────────────────────────

function _is_documents_editor(editor) {
	return editor.path === 'gear.documents' || editor.path === 'char.gear.documents';
}

function _is_newspaper_category(editor, element) {
	const select = element.querySelector('select.category');
	const category = select?.value ?? editor.data?.category;
	return category === 'newspaper';
}

function _sync_newspaper_generate_button(editor, element) {
	const text_content_row = element.querySelector('a.editor-edit-textarea[data-key$="text_content"]');
	if (!text_content_row) return;

	const parent = text_content_row.parentElement;
	const existing = parent.querySelector('.editor-generate-newspaper');

	if (!_is_newspaper_category(editor, element)) {
		existing?.remove();
		return;
	}

	if (existing) {
		if (editor.data.newspaper_data) {
			const preview = parent.querySelector('.textarea-preview');
			if (preview) {
				let np = `${editor.data.newspaper_data.paper_name} — ${editor.data.newspaper_data.date}`;
				if (np.length > 30) np = np.substring(0, 30) + '...';
				preview.textContent = np;
			}
		}
		return;
	}

	const btn = document.createElement('a');
	btn.className = 'fas fa-newspaper editor-generate-newspaper';
	btn.dataset.key = text_content_row.dataset.key;
	btn.title = game.i18n.localize('dc.containers.doc.generate_newspaper');
	btn.addEventListener('click', (event) => {
		event.stopPropagation();
		_on_generate_newspaper(editor, btn);
	});
	text_content_row.after(btn);

	if (editor.data.newspaper_data) {
		const preview = parent.querySelector('.textarea-preview');
		if (preview) {
			let np = `${editor.data.newspaper_data.paper_name} — ${editor.data.newspaper_data.date}`;
			if (np.length > 30) np = np.substring(0, 30) + '...';
			preview.textContent = np;
		}
	}
}

function _on_generate_newspaper(editor, target) {
	const key = target.dataset.key;
	const hidden_input = editor.element.querySelector(`.${CSS.escape(key)}`);

	const form_content = `
		<form class="typed-small" style="min-width:400px;">
			<h1 class="center">${game.i18n.localize("dc.containers.doc.generate_newspaper_dialog")}</h1>
			<div class="flexcol" style="gap:8px;">
				<div class="flexrow" style="align-items:center;">
					<label class="dl-label" style="width:120px;" for="np_paper_name">${game.i18n.localize("dc.containers.doc.paper_name")}</label>
					<input type="text" id="np_paper_name" value="The Tombstone Epitaph" style="flex:1;">
				</div>
				<div class="flexrow" style="align-items:center;">
					<label class="dl-label" style="width:120px;" for="np_mode">${game.i18n.localize("dc.containers.doc.mode")}</label>
					<select id="np_mode" style="flex:1;">
						<option value="random">${game.i18n.localize("dc.containers.doc.mode_random")}</option>
						<option value="hybrid">${game.i18n.localize("dc.containers.doc.mode_hybrid")}</option>
						<option value="scaffold">${game.i18n.localize("dc.containers.doc.mode_scaffold")}</option>
					</select>
				</div>
				<div class="flexrow" style="align-items:center;">
					<label class="dl-label" style="width:120px;" for="np_date">${game.i18n.localize("dc.containers.doc.date")}</label>
					<input type="text" id="np_date" value="" placeholder="(random)" style="flex:1;">
				</div>
				<div class="flexrow" style="align-items:center;">
					<label class="dl-label" style="width:120px;" for="np_columns">${game.i18n.localize("dc.containers.doc.columns")}</label>
					<select id="np_columns" style="flex:1;">
						<option value="2">2</option>
						<option value="3">3</option>
					</select>
				</div>
				<div class="flexrow" style="align-items:center;">
					<label class="dl-label" style="width:120px;" for="np_side_articles">${game.i18n.localize("dc.containers.doc.side_articles")}</label>
					<select id="np_side_articles" style="flex:1;">
						<option value="0">0</option>
						<option value="2">2</option>
						<option value="4" selected>4</option>
						<option value="6">6</option>
						<option value="8">8</option>
					</select>
				</div>
				<div class="flexrow" style="align-items:center;">
					<label class="dl-label" style="width:120px;" for="np_seed">${game.i18n.localize("dc.containers.doc.seed")}</label>
					<input type="text" id="np_seed" value="" placeholder="${game.i18n.localize("dc.containers.doc.seed_placeholder")}" style="flex:1;">
				</div>
				<div class="flexrow" style="align-items:center;">
					<label class="dl-label" style="width:120px;" for="np_main_lead">${game.i18n.localize("dc.containers.doc.main_lead")}</label>
					<select id="np_main_lead" style="flex:1;">
						<option value="crime">${game.i18n.localize("dc.containers.doc.main_lead_crime")}</option>
						<option value="any">${game.i18n.localize("dc.containers.doc.main_lead_any")}</option>
					</select>
				</div>
				<div class="flexrow" style="align-items:center;">
					<label class="dl-label" style="width:120px;" for="np_hybrid_headline">${game.i18n.localize("dc.containers.doc.hybrid_headline")}</label>
					<input type="text" id="np_hybrid_headline" value="" placeholder="${game.i18n.localize("dc.containers.doc.hybrid_headline_placeholder")}" style="flex:1;">
				</div>
				<div class="flexrow" style="align-items:center;">
					<label class="dl-label" style="width:120px;" for="np_hybrid_body">${game.i18n.localize("dc.containers.doc.hybrid_body")}</label>
					<textarea id="np_hybrid_body" rows="3" placeholder="${game.i18n.localize("dc.containers.doc.hybrid_body_placeholder")}" style="flex:1;"></textarea>
				</div>
				<div class="flexrow" style="align-items:center;">
					<label class="dl-label" style="width:120px;" for="np_ads">${game.i18n.localize("dc.containers.doc.advertisements")}</label>
					<select id="np_ads" style="flex:1;">
						<option value="0">0</option>
						<option value="1">1</option>
						<option value="2" selected>2</option>
					</select>
				</div>
			</div>
		</form>
	`;

	const callback = async (element) => {
		const seed_val = element.querySelector('#np_seed')?.value?.trim();
		const hybrid_headline = element.querySelector('#np_hybrid_headline')?.value?.trim();
		const hybrid_body = element.querySelector('#np_hybrid_body')?.value?.trim();
		const opts = {
			paper_name: element.querySelector('#np_paper_name')?.value || 'The Tombstone Epitaph',
			mode: element.querySelector('#np_mode')?.value || 'random',
			date: element.querySelector('#np_date')?.value || undefined,
			columns: parseInt(element.querySelector('#np_columns')?.value || '2', 10),
			side_articles: parseInt(element.querySelector('#np_side_articles')?.value || '4', 10),
			advertisements: parseInt(element.querySelector('#np_ads')?.value || '2', 10),
			main_lead: element.querySelector('#np_main_lead')?.value || 'crime',
			seed: seed_val || undefined,
			main_article_headline: hybrid_headline || undefined,
			main_article_text: hybrid_body || undefined,
		};
		try {
			const newspaper_data = await newspaper_generator.generate_newspaper(opts);
			editor.data.newspaper_data = newspaper_data;
			editor.data.category = 'newspaper';
			normalize_document_data(editor.data);
			const category_select = editor.element.querySelector('select.category');
			if (category_select) category_select.value = 'newspaper';
			if (hidden_input) hidden_input.value = '';
			const preview = target.parentElement.querySelector('.textarea-preview');
			if (preview) {
				let text = `${newspaper_data.paper_name} — ${newspaper_data.date}`;
				if (text.length > 30) text = text.substring(0, 30) + '...';
				preview.textContent = text;
			}
		} catch (err) {
			console.error('dc-containers | Failed to generate newspaper:', err);
			ui.notifications.error(game.i18n.localize('dc.containers.doc.generate_failed'));
		}
	};

	game.dc.msg.form(form_content, callback, game.i18n.localize('dc.containers.doc.generate_newspaper'));
}

// ─── Registration ─────────────────────────────────────────────────────────

/**
 * Register the document system with the Deadlands-Classic system.
 * Called on dcReady. Also initialises the newspaper generator with the
 * system's name generator.
 */
export function register_documents() {
	// Initialise the newspaper generator with the system's async name generator
	const generate_random_name = game.dc.generate_random_name;
	if (generate_random_name) {
		newspaper_generator.init(generate_random_name);
	}

	_ensure_gear_documents();

	// Build schemas now that game.i18n and game.dc.system are available
	const rarity_options = game.dc.system.equipment.rarity || {};
	const editor_schema = build_editor_schema(rarity_options);
	const viewer_schema = build_viewer_schema(rarity_options);

	// Register the gear type (editor + viewer schemas + use handler)
	game.dc.register_gear_type("documents", {
		editor_schema,
		viewer_schema,
		viewer_partial: "modules/dc-containers/templates/documents/viewer_documents.hbs",
		use_handler,
	});

	// Register gear partials for player and GM gear tabs
	game.dc.register_gear_partial("documents", {
		player_partial: "modules/dc-containers/templates/documents/gear_documents.hbs",
		gm_partial: "modules/dc-containers/templates/documents/gm_documents.hbs",
		gm_tab: { id: "documents", label: "dc.containers.doc.header", order: 50 },
	});

	// Register GM Marshal sheet tab
	game.dc.register_gm_tab("dc-containers.documents", {
		group: "gear",
		id: "documents",
		label: "dc.containers.doc.header",
		order: 50,
	});

	// Register pre-built document templates
	game.dc.register_gear_templates("documents", document_templates);

	Hooks.on("dcItemViewerPrepareContext", async (viewer, context) => {
		if (context.item_type !== 'documents') return;
		if (context.data?.content_type !== 'newspaper' || !context.data?.newspaper_data) return;
		context.newspaper_html = await render_newspaper_html(context.data.newspaper_data);
	});

	// Listen for editor render to inject the newspaper generate button
	Hooks.on("dcEditorRender", (editor, element) => {
		if (!_is_documents_editor(editor)) return;

		normalize_document_data(editor.data);
		_sync_newspaper_generate_button(editor, element);

		const category_select = element.querySelector('select.category');
		if (!category_select) return;

		if (editor._bound_newspaper_category_change) {
			category_select.removeEventListener('change', editor._bound_newspaper_category_change);
		}
		editor._bound_newspaper_category_change = () => {
			editor._sync_form_to_data();
			normalize_document_data(editor.data);
			_sync_newspaper_generate_button(editor, element);
		};
		category_select.addEventListener('change', editor._bound_newspaper_category_change);
	});

	// Expose document API on the module
	const module_api = game.modules.get(MODULE_ID);
	if (module_api) {
		module_api.api = module_api.api || {};
		module_api.api.document = {
			open,
			build_embed_url,
			create_template,
			render_newspaper_html,
			generate_newspaper: newspaper_generator.generate_newspaper,
			generate_article: newspaper_generator.generate_article,
			register_newspaper_content: newspaper_generator.register_newspaper_content,
			list_newspaper_content: newspaper_generator.list_newspaper_content,
			register_article_blueprint: newspaper_generator.register_article_blueprint,
			list_blueprints: newspaper_generator.list_blueprints,
		};
	}

	console.log("dc-containers | Document system registered.");
}