/**
 * Campaign fragment pool editor — world-scoped template list management.
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

import { custom_fragment_token_help_html } from './newspaper_custom_fragment.js';
import {
  get_effective_pool,
  get_pool_meta,
  is_custom_entry,
  save_pool_entry,
  delete_pool_entry,
  reset_pool,
  list_fragment_types,
  list_genres,
  list_pools_for_selection,
  truncate_preview,
} from './newspaper_pool_overrides.js';

function localize(key) {
  return game.i18n.localize(`dc.containers.doc.${key}`);
}

class FragmentPoolEditorApp extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: 'fragment-pool-editor',
    classes: ['deadlands-classic', 'dc-dialog', 'dc-custom-fragment-dialog', 'dc-fragment-pool-editor-app', 'themed', 'theme-light'],
    tag: 'div',
    position: { width: 580 },
    window: { title: 'Fragment Pool Editor', icon: 'fa-solid fa-list' },
  };

  static PARTS = {
    main: {
      template: 'modules/dc-containers/templates/documents/newspaper_fragment_pool_editor.hbs',
      scrollable: ['.dc-custom-fragment-help-scroll', '.dc-pool-editor-entry-list'],
    },
  };

  static #open = null;

  constructor() {
    super({
      window: { title: localize('editor_pool_title') },
    });
    this.fragment_type = 'main';
    this.genre = 'crime';
    this.pool_key = list_pools_for_selection('main', 'crime')[0]?.key || 'main_fragments_starts';
    this.selected_index = null;
    this.template_text = '';
  }

  static async open() {
    if (!game.user.isGM) {
      ui.notifications.warn(localize('editor_pool_gm_only'));
      return;
    }

    let app = FragmentPoolEditorApp.#open;
    if (app?.rendered) {
      app.bringToFront();
      return app;
    }

    app = new FragmentPoolEditorApp();
    FragmentPoolEditorApp.#open = app;
    await app.render(true);
    return app;
  }

  async close(options = {}) {
    const closed = await super.close(options);
    if (FragmentPoolEditorApp.#open === this) FragmentPoolEditorApp.#open = null;
    return closed;
  }

  async _prepareContext(options) {
    const pools = list_pools_for_selection(this.fragment_type, this.genre);
    if (!pools.some(p => p.key === this.pool_key)) {
      this.pool_key = pools[0]?.key || this.pool_key;
      this.selected_index = null;
      this.template_text = '';
    }

    const entries_raw = get_effective_pool(this.pool_key);
    const meta = get_pool_meta(this.pool_key);
    const entries = entries_raw.map((text, index) => ({
      index,
      preview: truncate_preview(text),
      custom: is_custom_entry(this.pool_key, index),
      selected: this.selected_index === index,
    }));

    return {
      fragment_type: this.fragment_type,
      genre: this.genre,
      pool_key: this.pool_key,
      show_genre: this.fragment_type === 'main',
      fragment_types: list_fragment_types(),
      genres: list_genres(),
      pools,
      entries,
      entry_count: `${entries.length}`,
      template_text: this.template_text,
      token_help_html: custom_fragment_token_help_html(),
      can_delete: this.selected_index != null && this.selected_index >= 0,
      has_override: meta.has_override,
      labels: {
        intro: localize('editor_pool_intro'),
        type: localize('editor_pool_type'),
        genre: localize('editor_pool_genre'),
        pool: localize('editor_pool_pool'),
        entries: localize('editor_pool_entries'),
        template: localize('editor_pool_template'),
        placeholder: localize('editor_custom_fragment_placeholder'),
        tokens: localize('editor_custom_fragment_tokens'),
        tokens_hint: localize('editor_custom_fragment_tokens_hint'),
        save: localize('editor_pool_save'),
        new_entry: localize('editor_pool_new_entry'),
        delete: localize('editor_pool_delete'),
        reset_pool: localize('editor_pool_reset'),
        custom_badge: localize('editor_pool_custom_badge'),
        no_entries: localize('editor_pool_no_entries'),
      },
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    root.querySelector('[data-action="changeType"]')?.addEventListener('change', (event) => {
      this.fragment_type = event.target.value;
      if (this.fragment_type === 'side') {
        const side_pools = list_pools_for_selection('side');
        this.pool_key = side_pools[0]?.key || 'flavour_starts';
      } else {
        this.pool_key = list_pools_for_selection('main', this.genre)[0]?.key || this.pool_key;
      }
      this.selected_index = null;
      this.template_text = '';
      this.render();
    });

    root.querySelector('[data-action="changeGenre"]')?.addEventListener('change', (event) => {
      this.genre = event.target.value;
      this.pool_key = list_pools_for_selection('main', this.genre)[0]?.key || this.pool_key;
      this.selected_index = null;
      this.template_text = '';
      this.render();
    });

    root.querySelector('[data-action="changePool"]')?.addEventListener('change', (event) => {
      this.pool_key = event.target.value;
      this.selected_index = null;
      this.template_text = '';
      this.render();
    });

    root.querySelectorAll('[data-action="selectEntry"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index, 10);
        const pool = get_effective_pool(this.pool_key);
        this.selected_index = index;
        this.template_text = pool[index] || '';
        this.render();
      });
    });

    root.querySelector('[name="template_text"]')?.addEventListener('input', (event) => {
      this.template_text = event.target.value;
    });

    root.querySelector('[data-action="newEntry"]')?.addEventListener('click', () => {
      this.selected_index = null;
      this.template_text = '';
      this.render();
    });

    root.querySelector('[data-action="saveEntry"]')?.addEventListener('click', async () => {
      const textarea = root.querySelector('[name="template_text"]');
      const text = textarea?.value ?? this.template_text;
      const index = this.selected_index != null && this.selected_index >= 0
        ? this.selected_index
        : null;
      const ok = await save_pool_entry(this.pool_key, index, text);
      if (!ok) {
        ui.notifications.warn(localize('editor_pool_save_empty'));
        return;
      }
      if (index == null) {
        const pool = get_effective_pool(this.pool_key);
        this.selected_index = pool.length - 1;
        this.template_text = pool[this.selected_index] || text;
      } else {
        this.template_text = text;
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
      await delete_pool_entry(this.pool_key, this.selected_index);
      this.selected_index = null;
      this.template_text = '';
      ui.notifications.info(localize('editor_pool_deleted'));
      this.render();
    });

    root.querySelector('[data-action="resetPool"]')?.addEventListener('click', async () => {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: localize('editor_pool_reset') },
        content: `<p>${foundry.utils.escapeHTML(localize('editor_pool_reset_confirm'))}</p>`,
      });
      if (!confirmed) return;
      await reset_pool(this.pool_key);
      this.selected_index = null;
      this.template_text = '';
      ui.notifications.info(localize('editor_pool_reset_done'));
      this.render();
    });
  }
}

async function show_fragment_pool_editor() {
  return FragmentPoolEditorApp.open();
}

export {
  FragmentPoolEditorApp,
  show_fragment_pool_editor,
};
