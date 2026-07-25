/**
 * Base ApplicationV2 side editor bound to a gear Editor instance.
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

import { normalize_document_data } from './document_categories.js';
import { preview_for_category } from './document_data_utils.js';

function localize(key) {
  return game.i18n.localize(`dc.containers.doc.${key}`);
}

class DocumentEditorSheet extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: 'document-editor-sheet',
    classes: ['deadlands-classic', 'document-editor-sheet-app', 'sheet', 'themed', 'theme-light'],
    tag: 'div',
    position: { width: 720, height: 640 },
    window: { resizable: true },
  };

  static #open_by_category = new Map();

  /**
   * @param {Object} editor — gear Editor instance
   * @param {HTMLElement} preview_target — anchor element in gear editor row
   * @param {Object} config — category editor config from registry
   */
  constructor(editor, preview_target, config) {
    super({
      window: { title: localize(config.title_key) },
      position: config.position || DocumentEditorSheet.DEFAULT_OPTIONS.position,
    });
    this.#editor = editor;
    this.#preview_target = preview_target;
    this.#config = config;
    this.doc_data = config.hydrate(editor.data);
  }

  #editor;
  #preview_target;
  #config;

  static async open(editor, preview_target, config) {
    const SheetClass = config.SheetClass || DocumentEditorSheet;
    let sheet = DocumentEditorSheet.#open_by_category.get(config.category);
    if (sheet?.rendered) {
      sheet._rebind(editor, preview_target, config);
    } else {
      sheet = new SheetClass(editor, preview_target, config);
      DocumentEditorSheet.#open_by_category.set(config.category, sheet);
    }

    try {
      await sheet.render(true);
    } catch (err) {
      DocumentEditorSheet.#open_by_category.delete(config.category);
      console.error(`dc-containers | Failed to open ${config.category} editor:`, err);
      ui.notifications.error(localize('open_failed'));
      throw err;
    }
    return sheet;
  }

  _rebind(editor, preview_target, config) {
    this.#editor = editor;
    this.#preview_target = preview_target;
    this.#config = config;
    this.doc_data = config.hydrate(editor.data);
  }

  get config() {
    return this.#config;
  }

  static PARTS = {
    main: {
      template: 'modules/dc-containers/templates/documents/document_editor_sheet.hbs',
      scrollable: ['.document-editor-scroll'],
    },
  };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.category = this.#config.category;
    ctx.doc_data = this.doc_data;
    ctx.labels = this.#config.labels || {};
    ctx.preview_html = this.#config.render_preview
      ? await this.#config.render_preview(this.doc_data)
      : '';
    if (this.#config.enrich_context) {
      this.#config.enrich_context(ctx);
    }
    return ctx;
  }

  _read_from_dom() {
    if (this.#config.read_from_dom) {
      this.doc_data = this.#config.read_from_dom(this.element, this.doc_data);
    }
  }

  _save_to_editor() {
    this._read_from_dom();
    if (this.#config.prepare_save) {
      this.doc_data = this.#config.prepare_save(this.doc_data);
    }
    this.#editor.data[this.#config.data_key] = foundry.utils.deepClone(this.doc_data);
    this.#editor.data.category = this.#config.category;
    normalize_document_data(this.#editor.data);

    if (this.#config.sync_legacy_fields) {
      this.#config.sync_legacy_fields(this.#editor.data, this.doc_data);
    }

    const preview_text = preview_for_category(this.#config.category, this.doc_data);
    if (preview_text) this.#editor.data.text_content = preview_text;

    const category_select = this.#editor.element?.querySelector('select.category');
    if (category_select) category_select.value = this.#config.category;

    const preview_el = this.#preview_target?.parentElement?.querySelector('.textarea-preview')
      || this.#preview_target?.parentElement?.querySelector('.document-editor-preview');
    if (preview_el && preview_text) preview_el.textContent = preview_text;

    ui.notifications.info(localize('editor_saved'));
    this.render({ force: true });
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    root.querySelector('[data-action="save"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      this._save_to_editor();
    });

    root.querySelector('[data-action="cancel"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      this.close();
    });

    if (this.#config.wire_events) {
      this.#config.wire_events.call(this, root);
    }
  }

  async close(options = {}) {
    if (DocumentEditorSheet.#open_by_category.get(this.#config.category) === this) {
      DocumentEditorSheet.#open_by_category.delete(this.#config.category);
    }
    return super.close(options);
  }
}

function create_document_editor_class(config) {
  class CategoryEditorSheet extends DocumentEditorSheet {
    static PARTS = {
      main: {
        template: config.template,
        scrollable: ['.document-editor-scroll'],
      },
    };
  }
  return CategoryEditorSheet;
}

async function browse_image(current, callback) {
  const fp = new foundry.applications.apps.FilePicker.implementation({
    current,
    type: 'image',
    callback,
    position: {
      top: this?.position?.top ?? 100,
      left: this?.position?.left ?? 100,
    },
  });
  await fp.browse();
}

export {
  DocumentEditorSheet,
  create_document_editor_class,
  localize,
  browse_image,
};
