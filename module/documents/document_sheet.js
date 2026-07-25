const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

import { normalize_document_data } from "./document_categories.js";
import { render_document_html } from "./document_render.js";

/**
 * Renders content based on the document's content_type and structured data.
 */
class DocumentSheet extends HandlebarsApplicationMixin(ApplicationV2) {

	static DEFAULT_OPTIONS = {
		id: "document-sheet-{id}",
		classes: ["deadlands-classic", "document-sheet", "sheet", "themed", "theme-light"],
		tag: "div",
		position: { width: 800, height: 600 },
		window: {
			resizable: true,
		},
	};

	static PARTS = {
		main: {
			template: "modules/dc-containers/templates/documents/document_sheet.hbs",
			root: true,
		},
	};

	constructor(item, actor) {
		const is_newspaper = (item.content_type || 'text') === 'newspaper';
		const position = is_newspaper ? { width: 960, height: 700 } : { width: 800, height: 600 };
		super({
			window: { title: item.label || game.i18n.localize("dc.containers.doc.reader_title") },
			position,
		});
		this.item = normalize_document_data(foundry.utils.deepClone(item));
		this.actor = actor;
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.item = this.item;
		context.content_type = this.item.content_type || 'text';
		context.document_category = this.item.category || '';
		context.is_gm = game.user.isGM;

		const rendered = await render_document_html(this.item);
		context.document_html = rendered.html || '';
		context.embed_url = rendered.embed_url || '';
		context.newspaper_html = this.item.category === 'newspaper' ? context.document_html : '';

		if (this.item.sourcebook_data?.url) context.item.url = this.item.sourcebook_data.url;
		if (this.item.web_page_data?.url) context.item.url = this.item.web_page_data.url;
		if (this.item.map_data?.image) context.item.image = this.item.map_data.image;
		if (this.item.wanted_poster_data?.portrait) context.item.image = this.item.wanted_poster_data.portrait;

		return context;
	}

	_onRender(context, options) {
		super._onRender(context, options);
		this.element.querySelectorAll('a[target="_blank"]').forEach(a => {
			a.addEventListener('click', (e) => {
				e.preventDefault();
				window.open(a.href, '_blank');
			});
		});
	}
}

export default DocumentSheet;
