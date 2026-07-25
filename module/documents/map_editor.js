/**
 * Map editor config.
 */

import { create_document_editor_class, DocumentEditorSheet, browse_image } from './document_editor_base.js';
import {
  migrate_map_data,
  create_map_data,
  create_map_marker,
} from './document_data_utils.js';
import { render_map_html } from './map_render.js';

function read_map_from_dom(root, data) {
  const get = (name) => root.querySelector(`[name="${name}"]`)?.value ?? '';
  const markers = (data.markers || []).map((marker, idx) => ({
    ...marker,
    label: root.querySelector(`[name="marker_label_${idx}"]`)?.value ?? marker.label,
    icon: root.querySelector(`[name="marker_icon_${idx}"]`)?.value ?? marker.icon,
  }));
  return create_map_data({
    ...data,
    image: get('image'),
    title: get('title'),
    scale_label: get('scale_label'),
    markers,
  });
}

const map_editor_config = {
  category: 'map',
  data_key: 'map_data',
  anchor_field: 'image',
  icon: 'fa-map',
  title_key: 'map_editor_title',
  template: 'modules/dc-containers/templates/documents/map_editor.hbs',
  position: { width: 900, height: 720 },
  hydrate: migrate_map_data,
  read_from_dom: read_map_from_dom,
  render_preview: render_map_html,
  sync_legacy_fields(data, doc_data) {
    data.image = doc_data.image || data.image;
  },
  labels: {
    pick_image: 'map_pick_image',
    add_marker: 'map_add_marker',
    click_hint: 'map_click_hint',
  },
  wire_events(root) {
    root.querySelector('[data-action="pickImage"]')?.addEventListener('click', async (event) => {
      event.preventDefault();
      const input = root.querySelector('[name="image"]');
      await browse_image.call(this, input?.value || '', (path) => {
        if (input) input.value = path;
        const img = root.querySelector('.map-editor-preview-img');
        if (img) img.src = path;
      });
    });

    root.querySelector('[data-action="addMarker"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      this._read_from_dom();
      this.doc_data.markers = [...(this.doc_data.markers || []), create_map_marker()];
      this.render({ force: true });
    });

    root.querySelectorAll('[data-action="removeMarker"]').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const idx = parseInt(btn.dataset.index, 10);
        this._read_from_dom();
        this.doc_data.markers.splice(idx, 1);
        this.render({ force: true });
      });
    });

    const preview = root.querySelector('.map-editor-preview');
    preview?.addEventListener('click', (event) => {
      if (!preview.querySelector('.map-editor-preview-img')?.src) return;
      const rect = preview.getBoundingClientRect();
      const x_pct = Math.round(((event.clientX - rect.left) / rect.width) * 100);
      const y_pct = Math.round(((event.clientY - rect.top) / rect.height) * 100);
      this._read_from_dom();
      this.doc_data.markers = [
        ...(this.doc_data.markers || []),
        create_map_marker({ x_pct, y_pct, label: `Marker ${(this.doc_data.markers?.length || 0) + 1}` }),
      ];
      this.render({ force: true });
    });
  },
};

const MapEditorSheet = create_document_editor_class(map_editor_config);
map_editor_config.SheetClass = MapEditorSheet;

function open_map_editor(editor, preview_target) {
  return DocumentEditorSheet.open(editor, preview_target, map_editor_config);
}

export {
  map_editor_config,
  MapEditorSheet,
  open_map_editor,
};
