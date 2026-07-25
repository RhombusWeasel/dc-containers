/**
 * Campaign value list editor — cities, animals, crime types, etc.
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

import {
  get_effective_value_list,
  get_value_list_meta,
  is_custom_value_entry,
  save_value_list_entry,
  delete_value_list_entry,
  reset_value_list,
  list_value_categories,
  list_defs_for_category,
  list_nested_parents,
  compose_list_key,
  find_list_def,
  truncate_preview,
} from './newspaper_value_lists.js';

function localize(key) {
  return game.i18n.localize(`dc.containers.doc.${key}`);
}

class ValueListEditorApp extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: 'value-list-editor',
    classes: ['deadlands-classic', 'dc-dialog', 'dc-custom-fragment-dialog', 'dc-value-list-editor-app', 'themed', 'theme-light'],
    tag: 'div',
    position: { width: 580 },
    window: { title: 'Value List Editor', icon: 'fa-solid fa-book' },
  };

  static PARTS = {
    main: {
      template: 'modules/dc-containers/templates/documents/newspaper_value_list_editor.hbs',
      scrollable: ['.dc-pool-editor-entry-list'],
    },
  };

  static #open = null;

  constructor() {
    super({
      window: { title: localize('editor_values_title') },
    });
    this.category = 'location';
    this.list_id = 'states';
    this.parent_id = list_nested_parents('territory')[0]?.id || 'Northern';
    this.selected_index = null;
    this.value_text = '';
  }

  static async open() {
    if (!game.user.isGM) {
      ui.notifications.warn(localize('editor_pool_gm_only'));
      return;
    }

    let app = ValueListEditorApp.#open;
    if (app?.rendered) {
      app.bringToFront();
      return app;
    }

    app = new ValueListEditorApp();
    ValueListEditorApp.#open = app;
    await app.render(true);
    return app;
  }

  async close(options = {}) {
    const closed = await super.close(options);
    if (ValueListEditorApp.#open === this) ValueListEditorApp.#open = null;
    return closed;
  }

  _current_list_key() {
    const def = find_list_def(this.list_id);
    if (def?.nested) {
      return compose_list_key(this.list_id, this.parent_id);
    }
    return this.list_id;
  }

  _sync_parent_for_list() {
    const def = find_list_def(this.list_id);
    if (!def?.nested) return;
    const parents = list_nested_parents(def.nested);
    if (!parents.some((p) => p.id === this.parent_id)) {
      this.parent_id = parents[0]?.id || '';
    }
  }

  async _prepareContext(options) {
    const lists = list_defs_for_category(this.category);
    if (!lists.some((l) => l.id === this.list_id)) {
      this.list_id = lists[0]?.id || this.list_id;
      this.selected_index = null;
      this.value_text = '';
    }
    this._sync_parent_for_list();

    const def = find_list_def(this.list_id);
    const list_key = this._current_list_key();
    const entries_raw = get_effective_value_list(list_key);
    const meta = get_value_list_meta(list_key);
    const entries = entries_raw.map((text, index) => ({
      index,
      preview: truncate_preview(text, def?.format === 'crime' ? 96 : 72),
      custom: is_custom_value_entry(list_key, index),
      selected: this.selected_index === index,
    }));

    let parent_label = '';
    if (def?.nested === 'territory') parent_label = localize('editor_values_territory');
    if (def?.nested === 'state') parent_label = localize('editor_values_state');

    return {
      category: this.category,
      list_id: this.list_id,
      parent_id: this.parent_id,
      show_parent: !!def?.nested,
      parent_label,
      parents: def?.nested ? list_nested_parents(def.nested) : [],
      categories: list_value_categories(),
      lists,
      entries,
      entry_count: `${entries.length}`,
      value_text: this.value_text,
      format_hint: def?.format === 'crime' ? localize('editor_values_crime_format') : '',
      value_placeholder: def?.format === 'crime'
        ? localize('editor_values_crime_placeholder')
        : localize('editor_values_value_placeholder'),
      can_delete: this.selected_index != null && this.selected_index >= 0,
      has_override: meta.has_override,
      labels: {
        intro: localize('editor_values_intro'),
        category: localize('editor_values_category'),
        list: localize('editor_values_list'),
        entries: localize('editor_pool_entries'),
        value: localize('editor_values_value'),
        save: localize('editor_pool_save'),
        new_entry: localize('editor_pool_new_entry'),
        delete: localize('editor_pool_delete'),
        reset_list: localize('editor_pool_reset'),
        custom_badge: localize('editor_pool_custom_badge'),
        no_entries: localize('editor_pool_no_entries'),
      },
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    root.querySelector('[data-action="changeCategory"]')?.addEventListener('change', (event) => {
      this.category = event.target.value;
      const lists = list_defs_for_category(this.category);
      this.list_id = lists[0]?.id || this.list_id;
      this.selected_index = null;
      this.value_text = '';
      this._sync_parent_for_list();
      this.render();
    });

    root.querySelector('[data-action="changeList"]')?.addEventListener('change', (event) => {
      this.list_id = event.target.value;
      this.selected_index = null;
      this.value_text = '';
      this._sync_parent_for_list();
      this.render();
    });

    root.querySelector('[data-action="changeParent"]')?.addEventListener('change', (event) => {
      this.parent_id = event.target.value;
      this.selected_index = null;
      this.value_text = '';
      this.render();
    });

    root.querySelectorAll('[data-action="selectEntry"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index, 10);
        const list_key = this._current_list_key();
        this.selected_index = index;
        this.value_text = get_effective_value_list(list_key)[index] || '';
        this.render();
      });
    });

    root.querySelector('[name="value_text"]')?.addEventListener('input', (event) => {
      this.value_text = event.target.value;
    });

    root.querySelector('[data-action="newEntry"]')?.addEventListener('click', () => {
      this.selected_index = null;
      this.value_text = '';
      this.render();
    });

    root.querySelector('[data-action="saveEntry"]')?.addEventListener('click', async () => {
      const list_key = this._current_list_key();
      const textarea = root.querySelector('[name="value_text"]');
      const text = textarea?.value ?? this.value_text;
      const index = this.selected_index != null && this.selected_index >= 0
        ? this.selected_index
        : null;
      const ok = await save_value_list_entry(list_key, index, text);
      if (!ok) {
        ui.notifications.warn(localize('editor_pool_save_empty'));
        return;
      }
      if (index == null) {
        const pool = get_effective_value_list(list_key);
        this.selected_index = pool.length - 1;
        this.value_text = pool[this.selected_index] || text;
      } else {
        this.value_text = text;
      }
      ui.notifications.info(localize('editor_pool_saved'));
      this.render();
    });

    root.querySelector('[data-action="deleteEntry"]')?.addEventListener('click', async () => {
      if (this.selected_index == null || this.selected_index < 0) return;
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: localize('editor_pool_delete') },
        content: `<p>${foundry.utils.escapeHTML(localize('editor_pool_delete_confirm'))}</p>`,
      });
      if (!confirmed) return;
      await delete_value_list_entry(this._current_list_key(), this.selected_index);
      this.selected_index = null;
      this.value_text = '';
      ui.notifications.info(localize('editor_pool_deleted'));
      this.render();
    });

    root.querySelector('[data-action="resetList"]')?.addEventListener('click', async () => {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: localize('editor_pool_reset') },
        content: `<p>${foundry.utils.escapeHTML(localize('editor_pool_reset_confirm'))}</p>`,
      });
      if (!confirmed) return;
      await reset_value_list(this._current_list_key());
      this.selected_index = null;
      this.value_text = '';
      ui.notifications.info(localize('editor_pool_reset_done'));
      this.render();
    });
  }
}

async function show_value_list_editor() {
  return ValueListEditorApp.open();
}

export {
  ValueListEditorApp,
  show_value_list_editor,
};
