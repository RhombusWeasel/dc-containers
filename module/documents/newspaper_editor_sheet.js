const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

import { normalize_document_data } from './document_categories.js';
import {
  generate_newspaper,
  generate_main_headline,
  ensure_story_context,
  get_fragment_palette_groups,
} from './newspaper_generator.js';
import {
  create_scaffold_newspaper_data,
  hydrate_newspaper_for_editor,
  enrich_layout_for_editor,
  parse_ref_key,
  place_palette_item,
  regenerate_slot,
  transfer_slot,
  clear_slot,
  slot_detail_context,
  add_custom_fragment,
  reset_story_context,
  resize_editor_grid,
  read_newspaper_from_dom,
  layout_to_newspaper_data,
} from './newspaper_editor.js';
import { get_slot } from './newspaper_layout.js';
import { wire_newspaper_drag_drop } from './newspaper_editor_drag.js';
import { show_custom_fragment_dialog } from './newspaper_custom_fragment.js';
import { show_fragment_pool_editor } from './newspaper_fragment_pool_editor.js';
import { show_value_list_editor } from './newspaper_value_list_editor.js';

function localize(key) {
  return game.i18n.localize(`dc.containers.doc.${key}`);
}

class NewspaperEditorSheet extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: 'newspaper-editor-sheet',
    classes: ['deadlands-classic', 'newspaper-editor-sheet-app', 'sheet', 'themed', 'theme-light'],
    tag: 'div',
    position: { width: 1200, height: 800 },
    window: { resizable: true, title: 'Newspaper Editor' },
  };

  static PARTS = {
    main: {
      template: 'modules/dc-containers/templates/documents/newspaper_editor_sheet.hbs',
      scrollable: ['.newspaper-editor-scroll'],
    },
  };

  static #open = null;

  /**
   * @param {Object} editor — gear Editor instance
   * @param {HTMLElement} preview_target — button anchor for preview row
   */
  constructor(editor, preview_target) {
    super({
      window: { title: localize('newspaper_editor_title') },
    });
    this.#editor = editor;
    this.#preview_target = preview_target;
    this.newspaper_data = hydrate_newspaper_for_editor(
      editor.data?.newspaper_data,
    );
    this.selected_ref_key = null;
    this.detail_fields = {};
    this.show_generate_panel = false;
    this.grid_columns = this.newspaper_data.columns ?? 2;
    this.grid_rows = this.newspaper_data.layout?.slots_per_column ?? 3;
    this.gen_options = {
      mode: 'random',
      columns: this.grid_columns,
      side_articles: 4,
      advertisements: 2,
      seed: '',
      main_lead: 'crime',
      hybrid_headline: '',
      hybrid_body: '',
    };
  }

  #editor;
  #preview_target;

  static async open(editor, preview_target) {
    let sheet = NewspaperEditorSheet.#open;
    if (sheet?.rendered) {
      sheet._rebind(editor, preview_target);
    } else {
      sheet = new NewspaperEditorSheet(editor, preview_target);
      NewspaperEditorSheet.#open = sheet;
    }

    try {
      await sheet.render(true);
    } catch (err) {
      if (NewspaperEditorSheet.#open === sheet) NewspaperEditorSheet.#open = null;
      console.error('dc-containers | Failed to open newspaper editor:', err);
      ui.notifications.error(localize('open_failed'));
      throw err;
    }
    return sheet;
  }

  _rebind(editor, preview_target) {
    this.#editor = editor;
    this.#preview_target = preview_target;
    this.newspaper_data = hydrate_newspaper_for_editor(editor.data?.newspaper_data);
    this.grid_columns = this.newspaper_data.columns ?? 2;
    this.grid_rows = this.newspaper_data.layout?.slots_per_column ?? 3;
    this.selected_ref_key = null;
    this.detail_fields = {};
  }

  /**
   * Sync DOM into newspaper_data, then re-render.
   * @param {Object} [options]
   * @param {boolean} [options.sync=true] — set false after programmatic data changes
   */
  _render(options = {}) {
    const { sync = true, ...render_options } = options;
    if (sync && this.rendered) this._sync_from_dom();
    return this.render({ force: true, ...render_options });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = this.newspaper_data;
    const selected_ref = parse_ref_key(this.selected_ref_key);
    let detail = { empty: true };

    if (selected_ref && data.layout) {
      const slot = get_slot(data.layout, selected_ref);
      detail = slot_detail_context(slot);
    }

    context.paper_name = data.paper_name;
    context.date = data.date;
    context.price = data.price;
    context.volume = data.volume;
    context.issue = data.issue;
    context.columns = data.columns ?? 2;
    context.main_article = data.main_article || { headline: '', paragraphs: [] };
    context.layout = enrich_layout_for_editor(data.layout, this.selected_ref_key);
    context.colophon = data.colophon || '';
    context.show_generate_panel = this.show_generate_panel;
    context.gen_options = this.gen_options;
    context.palette_groups = get_fragment_palette_groups();
    context.custom_fragments = data.custom_fragments || [];
    context.grid_columns = this.grid_columns;
    context.grid_rows = this.grid_rows;
    context.selected_ref_key = this.selected_ref_key || '';
    context.detail = detail;
    context.labels = this._labels();
    return context;
  }

  _labels() {
    return {
      generate_options: localize('editor_generate_options'),
      generate: localize('editor_generate'),
      suggest_headline: localize('editor_suggest_headline'),
      reset_story: localize('editor_reset_story'),
      save: localize('editor_save'),
      cancel: localize('editor_cancel'),
      mode: localize('mode'),
      mode_random: localize('mode_random'),
      mode_hybrid: localize('mode_hybrid'),
      mode_scaffold: localize('mode_scaffold'),
      columns: localize('columns'),
      side_articles: localize('side_articles'),
      advertisements: localize('advertisements'),
      seed: localize('seed'),
      seed_placeholder: localize('seed_placeholder'),
      main_lead: localize('main_lead'),
      main_lead_crime: localize('main_lead_crime'),
      main_lead_any: localize('main_lead_any'),
      hybrid_headline: localize('hybrid_headline'),
      hybrid_headline_placeholder: localize('hybrid_headline_placeholder'),
      hybrid_body: localize('hybrid_body'),
      hybrid_body_placeholder: localize('hybrid_body_placeholder'),
      date: localize('date'),
      price: localize('editor_masthead_price'),
      main_headline: localize('editor_main_headline'),
      main_fragment: localize('editor_main_fragment'),
      side_headline: localize('side_article_headline'),
      side_body: localize('side_article_body'),
      side_continued: localize('side_article_continued'),
      palette_title: localize('editor_palette_title'),
      palette_hint: localize('editor_palette_hint'),
      palette_custom: localize('editor_palette_custom'),
      add_custom_fragment: localize('editor_add_custom_fragment'),
      edit_fragment_pools: localize('editor_edit_fragment_pools'),
      edit_value_lists: localize('editor_edit_value_lists'),
      edit_custom_fragment: localize('editor_edit_custom_fragment'),
      grid_settings: localize('editor_grid_settings'),
      grid_rows: localize('editor_grid_rows'),
      apply_grid: localize('editor_apply_grid'),
      paper_layout: localize('editor_paper_layout'),
      detail_title: localize('editor_detail_title'),
      detail_empty: localize('editor_detail_empty'),
      empty_slot: localize('editor_empty_slot'),
      drag_slot: localize('editor_drag_slot'),
      side_article_badge: localize('editor_side_badge'),
      ad_badge: localize('editor_ad_badge'),
      ad_title: localize('editor_ad_title'),
      ad_lines: localize('editor_ad_lines'),
      ad_note: localize('editor_ad_note'),
      regenerate_slot: localize('editor_regenerate_slot'),
      clear_slot: localize('editor_clear_slot'),
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    root.querySelector('[data-action="toggleGenerate"]')?.addEventListener('click', () => {
      this.show_generate_panel = !this.show_generate_panel;
      this._render();
    });

    root.querySelector('[data-action="generate"]')?.addEventListener('click', () => {
      this._on_generate();
    });

    root.querySelector('[data-action="suggestHeadline"]')?.addEventListener('click', () => {
      this._on_suggest_headline();
    });

    root.querySelector('[data-action="resetStory"]')?.addEventListener('click', () => {
      this._on_reset_story();
    });

    root.querySelector('[data-action="save"]')?.addEventListener('click', () => {
      this._on_save();
    });

    root.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      this.close();
    });

    root.querySelector('[data-action="editFragmentPools"]')?.addEventListener('click', () => {
      this._on_edit_fragment_pools();
    });

    root.querySelector('[data-action="editValueLists"]')?.addEventListener('click', () => {
      this._on_edit_value_lists();
    });

    root.querySelector('[data-action="resizeGrid"]')?.addEventListener('click', () => {
      this._on_resize_grid();
    });

    root.querySelector('[data-action="regenerateSlot"]')?.addEventListener('click', () => {
      this._on_regenerate_slot();
    });

    root.querySelector('[data-action="clearSlot"]')?.addEventListener('click', () => {
      this._on_clear_slot();
    });

    wire_newspaper_drag_drop(root, {
      on_slot_drop: (payload, ref) => this._on_slot_drop(payload, ref),
      on_slot_select: (ref_key) => this._on_slot_select(ref_key),
      on_custom_fragment_edit: (fragment_id) => this._on_edit_custom_fragment(fragment_id),
    });

    this._wire_detail_field_inputs(root);
  }

  _wire_detail_field_inputs(root) {
    const detail = root.querySelector('.newspaper-detail-panel');
    if (!detail || detail.querySelector('.editor-panel-empty')) return;

    const bind = (name, key) => {
      const el = detail.querySelector(`[name="${name}"]`);
      if (!el) return;
      el.addEventListener('input', () => {
        this.detail_fields[key] = el.value;
      });
    };

    bind('detail_text', 'text');
    bind('detail_headline', 'headline');
    bind('detail_body', 'body');
    bind('detail_continued', 'continued');
    bind('detail_ad_title', 'ad_title');
    bind('detail_ad_lines', 'ad_lines');
    bind('detail_ad_note', 'ad_note');
  }

  _on_edit_custom_fragment(fragment_id) {
    const fragment = this.newspaper_data.custom_fragments?.find(f => f.id === fragment_id);
    if (!fragment) return;
    this._open_custom_fragment_dialog(fragment);
  }

  _sync_from_dom() {
    this.newspaper_data = read_newspaper_from_dom(
      this.newspaper_data,
      this.element,
      this.selected_ref_key,
      this.detail_fields,
    );
    this._sync_gen_options_from_dom();
  }

  _sync_gen_options_from_dom() {
    const root = this.element;
    this.gen_options = {
      mode: root.querySelector('[name="gen_mode"]')?.value || 'random',
      columns: parseInt(root.querySelector('[name="gen_columns"]')?.value || '2', 10),
      side_articles: parseInt(root.querySelector('[name="gen_side"]')?.value || '4', 10),
      advertisements: parseInt(root.querySelector('[name="gen_ads"]')?.value || '2', 10),
      seed: root.querySelector('[name="gen_seed"]')?.value?.trim() || '',
      main_lead: root.querySelector('[name="gen_main_lead"]')?.value || 'crime',
      hybrid_headline: root.querySelector('[name="gen_hybrid_headline"]')?.value?.trim() || '',
      hybrid_body: root.querySelector('[name="gen_hybrid_body"]')?.value?.trim() || '',
    };
  }

  async _on_generate() {
    this._sync_from_dom();
    const opts = this.gen_options;
    try {
      const generated = await generate_newspaper({
        paper_name: this.newspaper_data.paper_name || 'The Tombstone Epitaph',
        mode: opts.mode,
        date: this.newspaper_data.date || undefined,
        columns: opts.columns,
        side_articles: opts.side_articles,
        advertisements: opts.advertisements,
        main_lead: opts.main_lead,
        seed: opts.seed || undefined,
        main_article_headline: opts.hybrid_headline || undefined,
        main_article_text: opts.hybrid_body || undefined,
      });
      this.newspaper_data = hydrate_newspaper_for_editor({
        ...generated,
        story_context: this.newspaper_data.story_context,
        custom_fragments: this.newspaper_data.custom_fragments,
      });
      this.grid_columns = generated.columns ?? opts.columns;
      this.grid_rows = generated.layout?.slots_per_column ?? this.grid_rows;
      this.detail_fields = {};
      this._render({ sync: false });
    } catch (err) {
      console.error('dc-containers | Failed to generate newspaper:', err);
      ui.notifications.error(localize('generate_failed'));
    }
  }

  async _on_suggest_headline() {
    this._sync_from_dom();
    const story_type = this.newspaper_data.story_type || 'crime';
    if (!this.newspaper_data.story_context) {
      this.newspaper_data.story_context = await ensure_story_context(
        () => Math.random(),
        story_type,
        null,
        { paper_name: this.newspaper_data.paper_name },
      );
    }
    this.newspaper_data.main_article = {
      ...this.newspaper_data.main_article,
      headline: generate_main_headline(() => Math.random(), this.newspaper_data.story_context, story_type),
    };
    this._render({ sync: false });
  }

  _on_reset_story() {
    if (!window.confirm(localize('editor_reset_story_confirm'))) return;
    this._sync_from_dom();
    this.newspaper_data = reset_story_context(this.newspaper_data);
    this._render({ sync: false });
  }

  _on_edit_fragment_pools() {
    show_fragment_pool_editor();
  }

  _on_edit_value_lists() {
    show_value_list_editor();
  }

  _on_add_custom_fragment() {
    this._open_custom_fragment_dialog();
  }

  async _open_custom_fragment_dialog(existing = null) {
    const result = await show_custom_fragment_dialog(existing || {});
    if (!result) return;
    this._sync_from_dom();
    if (existing?.id) {
      const idx = this.newspaper_data.custom_fragments?.findIndex(f => f.id === existing.id) ?? -1;
      if (idx >= 0) {
        this.newspaper_data.custom_fragments[idx] = {
          ...this.newspaper_data.custom_fragments[idx],
          label: result.label,
          text: result.text,
        };
      }
    } else {
      this.newspaper_data = add_custom_fragment(this.newspaper_data, result.label, result.text);
    }
    this._render({ sync: false });
  }

  _on_resize_grid() {
    this._sync_from_dom();
    const root = this.element;
    const columns = parseInt(root.querySelector('[name="grid_columns"]')?.value || '2', 10);
    const rows = parseInt(root.querySelector('[name="grid_rows"]')?.value || '3', 10);
    this.grid_columns = columns;
    this.grid_rows = rows;
    this.newspaper_data = resize_editor_grid(this.newspaper_data, columns, rows);
    this.detail_fields = {};
    this._render({ sync: false });
  }

  async _on_slot_drop(payload, ref) {
    this._sync_from_dom();
    try {
      if (payload.source === 'palette' && payload.palette_id) {
        this.newspaper_data = await place_palette_item(
          this.newspaper_data,
          ref,
          payload.palette_id,
        );
        this.selected_ref_key = `${ref.zone === 'center' ? `center:${ref.col}:${ref.row}` : `${ref.zone}:${ref.row}`}`;
      } else if (payload.source === 'slot' && payload.slot_ref) {
        this.newspaper_data = transfer_slot(
          this.newspaper_data,
          payload.slot_ref,
          ref,
        );
        this.selected_ref_key = `${ref.zone === 'center' ? `center:${ref.col}:${ref.row}` : `${ref.zone}:${ref.row}`}`;
      }
      this.detail_fields = {};
      this._render({ sync: false });
    } catch (err) {
      console.error('dc-containers | Slot drop failed:', err);
    }
  }

  _on_slot_select(ref_key) {
    this._sync_from_dom();
    this.selected_ref_key = ref_key;
    this.detail_fields = {};
    this._render({ sync: false });
  }

  async _on_regenerate_slot() {
    const ref = parse_ref_key(this.selected_ref_key);
    if (!ref) return;
    this._sync_from_dom();
    try {
      this.newspaper_data = await regenerate_slot(this.newspaper_data, ref);
      this.detail_fields = {};
      this._render({ sync: false });
    } catch (err) {
      console.error('dc-containers | Regenerate slot failed:', err);
    }
  }

  _on_clear_slot() {
    const ref = parse_ref_key(this.selected_ref_key);
    if (!ref) return;
    this._sync_from_dom();
    this.newspaper_data = clear_slot(this.newspaper_data, ref);
    this.selected_ref_key = null;
    this.detail_fields = {};
    this._render({ sync: false });
  }

  _on_save() {
    this._sync_from_dom();
    this.newspaper_data = layout_to_newspaper_data(this.newspaper_data);
    this.#editor.data.newspaper_data = foundry.utils.deepClone(this.newspaper_data);
    this.#editor.data.category = 'newspaper';
    normalize_document_data(this.#editor.data);

    const category_select = this.#editor.element?.querySelector('select.category');
    if (category_select) category_select.value = 'newspaper';

    const preview_el = this.#preview_target?.parentElement?.querySelector('.textarea-preview');
    if (preview_el) {
      let text = `${this.newspaper_data.paper_name} — ${this.newspaper_data.date}`;
      if (text.length > 30) text = text.substring(0, 30) + '...';
      preview_el.textContent = text;
    }

    this.detail_fields = {};
    ui.notifications.info(localize('editor_saved'));
    this._render({ sync: false });
  }

  async close(options = {}) {
    if (NewspaperEditorSheet.#open === this) NewspaperEditorSheet.#open = null;
    return super.close(options);
  }
}

export default NewspaperEditorSheet;
