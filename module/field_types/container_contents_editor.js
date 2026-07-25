/**
 * Container contents editor — popout ApplicationV2 sheet for the open_container boon.
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

import { container_catalog } from "../lib/container_catalog.js";

function localize(key) {
  return game.i18n.localize(key);
}

class ContainerContentsEditorApp extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "container-contents-editor",
    classes: ["deadlands-classic", "dc-container-contents-editor-app", "sheet", "themed", "theme-light"],
    tag: "div",
    position: { width: 640, height: 560 },
    window: {
      title: "Container Contents",
      icon: "fa-solid fa-box-open",
      resizable: true,
    },
  };

  static PARTS = {
    main: {
      template: "modules/dc-containers/templates/container_contents_editor.hbs",
      scrollable: [".container-contents-tree"],
    },
  };

  static #open = null;

  constructor({ contents = {}, on_change = null } = {}) {
    super({
      window: { title: localize("dc.containers.contents_editor_title") },
    });
    this.contents = foundry.utils.deepClone(contents);
    this.on_change = on_change;
    this._search_term = "";
  }

  static async open({ contents = {}, on_change = null } = {}) {
    let app = ContainerContentsEditorApp.#open;
    if (app?.rendered) {
      app.contents = foundry.utils.deepClone(contents);
      app.on_change = on_change;
      await app.render(true);
      app.bringToFront();
      return app;
    }

    app = new ContainerContentsEditorApp({ contents, on_change });
    ContainerContentsEditorApp.#open = app;
    await app.render(true);
    return app;
  }

  async close(options = {}) {
    const closed = await super.close(options);
    if (ContainerContentsEditorApp.#open === this) {
      ContainerContentsEditorApp.#open = null;
    }
    return closed;
  }

  async _prepareContext(options) {
    const selected_count = container_catalog.count_selected_items(this.contents);
    return {
      selected_count,
      sections: container_catalog.build_catalog_sections(this.contents),
      labels: {
        items: selected_count === 1 ? "item" : "items",
        search: localize("dc.shared.search_gear"),
        qty: localize("dc.containers.qty"),
        name: localize("dc.shared.name"),
        cost: localize("dc.shared.cost"),
      },
    };
  }

  _set_qty(path, qty) {
    qty = Math.max(0, qty);
    if (qty <= 0) {
      game.dc.utils.delete_path(this.contents, path);
    } else {
      game.dc.utils.modify_path(this.contents, path, { qty });
    }

    this.on_change?.(foundry.utils.deepClone(this.contents));
    this._update_qty_display(path, qty);
    this._update_summary();
  }

  _update_qty_display(path, qty) {
    const value_el = this.element?.querySelector(`.container-qty-value[data-path="${CSS.escape(path)}"]`);
    if (value_el) {
      value_el.textContent = String(qty);
    }
  }

  _update_summary() {
    const count = container_catalog.count_selected_items(this.contents);
    const summary = this.element?.querySelector(".container-contents-editor-summary");
    if (summary) {
      summary.textContent = `${count} ${count === 1 ? "item" : "items"}`;
    }
  }

  _apply_search(term) {
    this._search_term = term.trim().toLowerCase();
    const rows = this.element?.querySelectorAll(".container-contents-row") || [];
    for (const row of rows) {
      const search = row.dataset.search || "";
      row.style.display = (!this._search_term || search.includes(this._search_term)) ? "" : "none";
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const font_size = game.settings.get("Deadlands-Classic", "font_size");
    this.element.classList.remove("typed-small", "typed-medium", "typed-large");
    this.element.classList.add(`typed-${font_size}`);

    const root = this.element;

    root.querySelector(".container-contents-search")?.addEventListener("input", (event) => {
      this._apply_search(event.target.value);
    });

    root.querySelectorAll(".container-qty-inc").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const path = btn.dataset.path;
        if (!path) return;
        const qty = container_catalog.get_qty(this.contents, path) + 1;
        this._set_qty(path, qty);
      });
    });

    root.querySelectorAll(".container-qty-dec").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const path = btn.dataset.path;
        if (!path) return;
        const qty = container_catalog.get_qty(this.contents, path) - 1;
        this._set_qty(path, qty);
      });
    });

    if (this._search_term) {
      const input = root.querySelector(".container-contents-search");
      if (input) {
        input.value = this._search_term;
        this._apply_search(this._search_term);
      }
    }
  }
}

export { ContainerContentsEditorApp };
