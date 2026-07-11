const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
import { container, set_open_sheet, get_open_sheet } from "../lib/container.js";

const ScrollPreservationMixin = game.dc.scroll_preservation.ScrollPreservationMixin;

class ContainerSheet extends ScrollPreservationMixin(HandlebarsApplicationMixin(ApplicationV2)) {

	static DEFAULT_OPTIONS = {
		id: "dc-container-{id}",
		classes: ["deadlands-classic", "dc-container-sheet", "sheet", "themed", "theme-light"],
		tag: "form",
		position: { width: 480, height: 540 },
		window: {
			resizable: true,
		},
		form: {
			handler: async () => {},
			submitOnChange: false,
			closeOnSubmit: false,
		},
	};

	static PARTS = {
		main: {
			template: "modules/dc-containers/templates/container-sheet.hbs",
			root: true,
			scrollable: [".scroll"],
		},
	};

	/**
	 * Show the container sheet.
	 * @param {object} container_data — { container_name, items, loot_mode }
	 * @param {string} container_id — unique identifier (behavior UUID, region ID, or actor UUID)
	 * @param {object} actor — the player's actor
	 */
	static show(container_data, container_id, actor) {
		const sheet = new ContainerSheet(container_data, container_id, actor);
		set_open_sheet(sheet);
		sheet.render(true);
		return sheet;
	}

	constructor(container_data, container_id, actor) {
		const container_name = container_data?.container_name || "Container";
		super({ window: { title: container_name } });
		this.container_id = container_id;
		this.container_name = container_name;
		this._container_data = container_data;
		this._actor = actor;
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		const items = container.build_display_items(this._container_data.items);
		const is_empty = items.length === 0;

		context.container_name = this.container_name;
		context.items = items;
		context.is_empty = is_empty;
		context.loot_mode = this._container_data.loot_mode ?? false;

		return context;
	}

	close(options = {}) {
		if (get_open_sheet() === this) {
			set_open_sheet(null);
		}
		return super.close(options);
	}

	_onClickAction(event, target) {
		const action = target.dataset.action;
		if (action === "close") {
			this.close();
		}
		// Phase 3: handle "take" action
	}

	_onRender(context, options) {
		super._onRender(context, options);
		const font_size = game.settings.get("Deadlands-Classic", "font_size");
		this.element.classList.remove("typed-small", "typed-medium", "typed-large");
		this.element.classList.add(`typed-${font_size}`);
	}
}

export { ContainerSheet };