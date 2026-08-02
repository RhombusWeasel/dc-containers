/**
 * Book editor config.
 */

import { create_document_editor_class, DocumentEditorSheet } from './document_editor_base.js';
import { migrate_book_data, create_book_data } from './document_data_utils.js';
import { build_embed_url } from './document_embed.js';

function read_book_from_dom(root, data) {
  const get = (name) => root.querySelector(`[name="${name}"]`)?.value ?? '';
  return create_book_data({
    ...data,
    url: get('url'),
    title: get('title'),
    author: get('author'),
    default_page: get('default_page'),
    notes: get('notes'),
  });
}

const book_editor_config = {
  category: 'book',
  data_key: 'book_data',
  anchor_field: 'url',
  icon: 'fa-book',
  title_key: 'book_editor_title',
  template: 'modules/dc-containers/templates/documents/book_editor.hbs',
  position: { width: 800, height: 720 },
  hydrate: migrate_book_data,
  read_from_dom: read_book_from_dom,
  sync_legacy_fields(data, doc_data) {
    data.url = doc_data.url || data.url;
  },
  labels: {},
  enrich_context(ctx) {},
  wire_events(root) {
    root.querySelector('[name="url"]')?.addEventListener('input', () => {
      const url = root.querySelector('[name="url"]')?.value ?? '';
      const iframe = root.querySelector('.book-preview-iframe');
      if (iframe) iframe.src = build_embed_url(url);
    });
  },
};

const BookEditorSheet = create_document_editor_class(book_editor_config);
book_editor_config.SheetClass = BookEditorSheet;

// Override _prepareContext on the subclass
const orig_prepare = BookEditorSheet.prototype._prepareContext;
BookEditorSheet.prototype._prepareContext = async function(options) {
  const ctx = await orig_prepare.call(this, options);
  ctx.embed_url = build_embed_url(this.doc_data?.url);
  return ctx;
};

function open_book_editor(editor, preview_target) {
  return DocumentEditorSheet.open(editor, preview_target, book_editor_config);
}

export {
  book_editor_config,
  BookEditorSheet,
  open_book_editor,
};