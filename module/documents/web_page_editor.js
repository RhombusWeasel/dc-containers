/**
 * Web page editor config.
 */

import { create_document_editor_class, DocumentEditorSheet } from './document_editor_base.js';
import { migrate_web_page_data, create_web_page_data } from './document_data_utils.js';
import { build_embed_url } from './document_embed.js';
import { build_quickfill_html, wire_quickfill } from './editor_quickfill.js';

// Quick-fill presets for the web page editor.
const QUICKFILL_PRESETS = [
  {
    id: 'wiki',
    label: 'Deadlands Wiki',
    icon: 'fa-wikipedia-w',
    apply: (d) => ({ ...d, title: 'Deadlands Wiki', notes: 'Fan-maintained Deadlands reference wiki.' }),
  },
  {
    id: 'peg',
    label: 'Pinnacle Site',
    icon: 'fa-globe',
    apply: (d) => ({ ...d, title: 'Pinnacle Entertainment Group', notes: 'Official publisher site for Deadlands.' }),
  },
];

function read_web_page_from_dom(root, data) {
  const get = (name) => root.querySelector(`[name="${name}"]`)?.value ?? '';
  return create_web_page_data({
    ...data,
    url: get('url'),
    title: get('title'),
    notes: get('notes'),
  });
}

const web_page_editor_config = {
  category: 'web_page',
  data_key: 'web_page_data',
  anchor_field: 'url',
  icon: 'fa-globe',
  title_key: 'web_page_editor_title',
  template: 'modules/dc-containers/templates/documents/web_page_editor.hbs',
  position: { width: 800, height: 720 },
  hydrate: migrate_web_page_data,
  read_from_dom: read_web_page_from_dom,
  sync_legacy_fields(data, doc_data) {
    data.url = doc_data.url || data.url;
  },
  labels: {},
  enrich_context(ctx) {
    ctx.quickfill_html = build_quickfill_html({
      label: game.i18n.localize('dc.containers.doc.quickfill_label'),
      buttons: QUICKFILL_PRESETS.map((p) => ({ id: p.id, label: p.label, icon: p.icon })),
    });
  },
  wire_events(root) {
    wire_quickfill(root, this, { buttons: QUICKFILL_PRESETS });

    root.querySelector('[name="url"]')?.addEventListener('input', () => {
      const url = root.querySelector('[name="url"]')?.value ?? '';
      const iframe = root.querySelector('.web-page-preview-iframe');
      if (iframe) iframe.src = build_embed_url(url);
    });
  },
};

const WebPageEditorSheet = create_document_editor_class(web_page_editor_config);
web_page_editor_config.SheetClass = WebPageEditorSheet;

const orig_web_prepare = WebPageEditorSheet.prototype._prepareContext;
WebPageEditorSheet.prototype._prepareContext = async function(options) {
  const ctx = await orig_web_prepare.call(this, options);
  ctx.embed_url = build_embed_url(this.doc_data?.url);
  return ctx;
};

function open_web_page_editor(editor, preview_target) {
  return DocumentEditorSheet.open(editor, preview_target, web_page_editor_config);
}

export {
  web_page_editor_config,
  WebPageEditorSheet,
  open_web_page_editor,
};