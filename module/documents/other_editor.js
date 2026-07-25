/**
 * Other document editor config.
 */

import { create_document_editor_class, DocumentEditorSheet } from './document_editor_base.js';
import { migrate_other_data, create_other_data } from './document_data_utils.js';
import { render_other_html } from './other_render.js';

function read_other_from_dom(root, data) {
  const get = (name) => root.querySelector(`[name="${name}"]`)?.value ?? '';
  return create_other_data({
    ...data,
    title: get('title'),
    body: get('body'),
    style: get('style') || 'plain',
  });
}

const other_editor_config = {
  category: 'other',
  data_key: 'other_data',
  anchor_field: 'text_content',
  icon: 'fa-file-lines',
  title_key: 'other_editor_title',
  template: 'modules/dc-containers/templates/documents/other_editor.hbs',
  position: { width: 720, height: 640 },
  hydrate: migrate_other_data,
  read_from_dom: read_other_from_dom,
  render_preview: render_other_html,
  labels: {},
};

const OtherEditorSheet = create_document_editor_class(other_editor_config);
other_editor_config.SheetClass = OtherEditorSheet;

function open_other_editor(editor, preview_target) {
  return DocumentEditorSheet.open(editor, preview_target, other_editor_config);
}

export {
  other_editor_config,
  OtherEditorSheet,
  open_other_editor,
};
