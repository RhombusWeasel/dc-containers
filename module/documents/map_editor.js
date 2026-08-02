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
import { build_quickfill_html, wire_quickfill } from './editor_quickfill.js';

// Quick-fill presets for the map editor — preset marker sets.
const QUICKFILL_PRESETS = [
  {
    id: 'town',
    label: 'Town Buildings',
    icon: 'fa-city',
    apply: (d) => ({ ...d, markers: [
      create_map_marker({ x_pct: 20, y_pct: 30, label: "Sheriff's Office", icon: 'fa-star' }),
      create_map_marker({ x_pct: 50, y_pct: 35, label: 'Saloon', icon: 'fa-beer-mug-empty' }),
      create_map_marker({ x_pct: 35, y_pct: 60, label: 'General Store', icon: 'fa-store' }),
      create_map_marker({ x_pct: 70, y_pct: 55, label: "Doctor's Office", icon: 'fa-staff-snake' }),
      create_map_marker({ x_pct: 80, y_pct: 25, label: 'Livery Stable', icon: 'fa-horse' }),
      create_map_marker({ x_pct: 15, y_pct: 70, label: 'Train Depot', icon: 'fa-train' }),
    ] }),
  },
  {
    id: 'trail',
    label: 'Trail Stops',
    icon: 'fa-route',
    apply: (d) => ({ ...d, markers: [
      create_map_marker({ x_pct: 15, y_pct: 80, label: 'Start', icon: 'fa-flag' }),
      create_map_marker({ x_pct: 40, y_pct: 55, label: 'Waterhole', icon: 'fa-tint' }),
      create_map_marker({ x_pct: 65, y_pct: 40, label: 'Landmark', icon: 'fa-mountain' }),
      create_map_marker({ x_pct: 85, y_pct: 20, label: 'Destination', icon: 'fa-flag-checkered' }),
    ] }),
  },
  {
    id: 'mine',
    label: 'Mine Layout',
    icon: 'fa-hammer',
    apply: (d) => ({ ...d, markers: [
      create_map_marker({ x_pct: 50, y_pct: 10, label: 'Main Entrance', icon: 'fa-door-open' }),
      create_map_marker({ x_pct: 30, y_pct: 45, label: 'Shaft A', icon: 'fa-hammer' }),
      create_map_marker({ x_pct: 65, y_pct: 50, label: 'Shaft B', icon: 'fa-hammer' }),
      create_map_marker({ x_pct: 50, y_pct: 80, label: 'Deep Level', icon: 'fa-arrow-down' }),
    ] }),
  },
  {
    id: 'clear',
    label: 'Clear Markers',
    icon: 'fa-eraser',
    apply: (d) => ({ ...d, markers: [] }),
  },
];

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
  enrich_context(ctx) {
    ctx.quickfill_html = build_quickfill_html({
      label: game.i18n.localize('dc.containers.doc.quickfill_label'),
      buttons: QUICKFILL_PRESETS.map((p) => ({ id: p.id, label: p.label, icon: p.icon })),
    });
  },
  wire_events(root) {
    wire_quickfill(root, this, { buttons: QUICKFILL_PRESETS });

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
