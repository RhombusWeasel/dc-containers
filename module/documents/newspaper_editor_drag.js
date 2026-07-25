/**
 * HTML5 drag-and-drop for the newspaper layout editor.
 * Pattern adapted from dc-npc-patrols bt_editor.js.
 */

import { parse_ref_key } from './newspaper_editor.js';

function _parse_payload(ev) {
  try {
    const raw = ev.dataTransfer.getData('text/plain');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _slot_ref_from_el(el) {
  if (!el?.dataset?.slotZone) return null;
  const ref = {
    zone: el.dataset.slotZone,
    row: parseInt(el.dataset.slotRow, 10),
  };
  if (ref.zone === 'center') {
    ref.col = parseInt(el.dataset.slotCol, 10);
    if (Number.isNaN(ref.col)) {
      ref.col = parseInt(el.closest('[data-center-col]')?.dataset?.centerCol, 10);
    }
  }
  if (Number.isNaN(ref.row)) return null;
  if (ref.zone === 'center' && Number.isNaN(ref.col)) return null;
  return ref;
}

function _clear_drop_indicators(root) {
  root.querySelectorAll('.dc-slot-drop-target').forEach(el => {
    el.classList.remove('dc-slot-drop-target');
  });
}

/**
 * Wire palette and slot drag-and-drop.
 * @param {HTMLElement} root
 * @param {Object} host — sheet instance with callbacks
 */
function wire_newspaper_drag_drop(root, host) {
  root.querySelectorAll('[data-palette-id]').forEach(chip => {
    chip.setAttribute('draggable', 'true');
    chip.addEventListener('dragstart', (ev) => {
      ev.dataTransfer.setData('text/plain', JSON.stringify({
        source: 'palette',
        palette_id: chip.dataset.paletteId,
      }));
      ev.dataTransfer.effectAllowed = 'copy';
      chip.classList.add('dc-palette-chip-dragging');
    });
    chip.addEventListener('dragend', () => {
      chip.classList.remove('dc-palette-chip-dragging');
      _clear_drop_indicators(root);
    });
  });

  root.querySelectorAll('[data-drag-handle]').forEach(handle => {
    handle.setAttribute('draggable', 'true');
    handle.addEventListener('dragstart', (ev) => {
      const slot_el = handle.closest('[data-slot-zone]');
      const ref = _slot_ref_from_el(slot_el);
      if (!ref) return;
      ev.dataTransfer.setData('text/plain', JSON.stringify({
        source: 'slot',
        slot_ref: ref,
        ref_key: slot_el.dataset.refKey,
      }));
      ev.dataTransfer.effectAllowed = 'move';
      slot_el.classList.add('dc-slot-dragging');
      ev.stopPropagation();
    });
    handle.addEventListener('dragend', () => {
      handle.closest('[data-slot-zone]')?.classList.remove('dc-slot-dragging');
      _clear_drop_indicators(root);
    });
  });

  root.querySelectorAll('[data-slot-zone]').forEach(slot_el => {
    slot_el.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      _clear_drop_indicators(root);
      slot_el.classList.add('dc-slot-drop-target');
    });
    slot_el.addEventListener('dragleave', () => {
      slot_el.classList.remove('dc-slot-drop-target');
    });
    slot_el.addEventListener('drop', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      _clear_drop_indicators(root);
      const payload = _parse_payload(ev);
      const ref = _slot_ref_from_el(slot_el);
      if (!payload || !ref) return;
      host.on_slot_drop(payload, ref);
    });

    slot_el.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-drag-handle]')) return;
      if (ev.target.closest('[data-action]')) return;
      const ref_key = slot_el.dataset.refKey;
      if (ref_key) host.on_slot_select(ref_key);
    });
  });

  root.querySelectorAll('[data-custom-fragment-id]').forEach(chip => {
    chip.addEventListener('dblclick', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const id = chip.dataset.customFragmentId;
      if (id) host.on_custom_fragment_edit?.(id);
    });
  });
}

export {
  wire_newspaper_drag_drop,
  parse_ref_key,
};
