const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

/**
 * Document Reader Sheet — opens when a player "uses" a document item.
 * Renders content based on the document's content_type:
 *   - ia_book: Internet Archive BookReader embedded via iframe
 *   - url:     Generic URL embedded via iframe
 *   - text:    Rich text content rendered inline
 *   - image:   Image displayed inline
 *   - newspaper: Structured newspaper data rendered via newspaper_sheet.hbs
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

	/**
	 * @param {Object} item - The document item data from char.gear.documents
	 * @param {Actor} actor - The actor who owns this document
	 */
	constructor(item, actor) {
		super({ window: { title: item.label || game.i18n.localize("dc.document.reader_title") } });
		this.item = foundry.utils.deepClone(item);
		this.actor = actor;
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.item = this.item;
		context.content_type = this.item.content_type || 'text';
		context.embed_url = this._build_embed_url();
		context.is_gm = game.user.isGM;

		// For newspaper content, render the structured data through the template at read time
		if (context.content_type === 'newspaper' && this.item.newspaper_data) {
			context.newspaper_html = await foundry.applications.handlebars.renderTemplate(
				"modules/dc-containers/templates/documents/newspaper_sheet.hbs",
				this.item.newspaper_data,
			);
		} else {
			context.newspaper_html = '';
		}

		return context;
	}

	/**
	 * Convert the document's URL into an embeddable iframe URL.
	 * For Internet Archive books: https://archive.org/details/BOOK_ID → https://archive.org/embed/BOOK_ID
	 * For generic URLs: use as-is.
	 */
	_build_embed_url() {
		const url = (this.item.url || '').trim();
		if (!url) return '';

		// Internet Archive: convert /details/ to /embed/
		if (url.includes('archive.org/details/')) {
			return url.replace('archive.org/details/', 'archive.org/embed/');
		}

		// Already an embed URL? Use as-is.
		if (url.includes('archive.org/embed/')) return url;

		// Generic URL — use directly
		return url;
	}

	_onRender(context, options) {
		super._onRender(context, options);
		// Open links in new tab, not inside the iframe container
		this.element.querySelectorAll('a[target="_blank"]').forEach(a => {
			a.addEventListener('click', (e) => {
				e.preventDefault();
				window.open(a.href, '_blank');
			});
		});
	}
}

export default DocumentSheet;