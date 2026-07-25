/**
 * Sourcebook editor config.
 */

import { create_document_editor_class, DocumentEditorSheet } from './document_editor_base.js';
import { migrate_sourcebook_data, create_sourcebook_data } from './document_data_utils.js';
import { build_embed_url } from './document_embed.js';

function read_sourcebook_from_dom(root, data) {
  const get = (name) => root.querySelector(`[name="${name}"]`)?.value ?? '';
  return create_sourcebook_data({
    ...data,
    url: get('url'),
    title: get('title'),
    author: get('author'),
    default_page: get('default_page'),
    notes: get('notes'),
  });
}

const sourcebook_editor_config = {
  category: 'sourcebook',
  data_key: 'sourcebook_data',
  anchor_field: 'url',
  icon: 'fa-book',
  title_key: 'sourcebook_editor_title',
  template: 'modules/dc-containers/templates/documents/sourcebook_editor.hbs',
  position: { width: 800, height: 720 },
  hydrate: migrate_sourcebook_data,
  read_from_dom: read_sourcebook_from_dom,
  sync_legacy_fields(data, doc_data) {
    data.url = doc_data.url || data.url;
  },
  labels: {},
  wire_events(root) {
    root.querySelector('[name="url"]')?.addEventListener('input', () => {
      const url = root.querySelector('[name="url"]')?.value ?? '';
      const iframe = root.querySelector('.sourcebook-preview-iframe');
      if (iframe) iframe.src = build_embed_url(url);
    });
  },
};

const SourcebookEditorSheet = create_document_editor_class(sourcebook_editor_config);
sourcebook_editor_config.SheetClass = SourcebookEditorSheet;

// Override _prepareContext on the subclass
const orig_prepare = SourcebookEditorSheet.prototype._prepareContext;
SourcebookEditorSheet.prototype._prepareContext = async function(options) {
  const ctx = await orig_prepare.call(this, options);
  ctx.embed_url = build_embed_url(this.doc_data?.url);
  return ctx;
};

function open_sourcebook_editor(editor, preview_target) {
  return DocumentEditorSheet.open(editor, preview_target, sourcebook_editor_config);
}

export {
  sourcebook_editor_config,
  SourcebookEditorSheet,
  open_sourcebook_editor,
};
