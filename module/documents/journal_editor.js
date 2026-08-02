/**
 * Journal editor config.
 */

import { create_document_editor_class, DocumentEditorSheet } from './document_editor_base.js';
import {
  migrate_journal_data,
  create_journal_data,
  create_journal_entry,
} from './document_data_utils.js';
import { render_journal_html } from './journal_render.js';
import { build_quickfill_html, wire_quickfill } from './editor_quickfill.js';

// Quick-fill presets for the journal editor — each adds a new entry.
const QUICKFILL_PRESETS = [
  {
    id: 'trail',
    label: 'Trail Entry',
    icon: 'fa-route',
    apply: (d) => ({ ...d, entries: [...(d.entries || []), create_journal_entry({ date: '', title: 'On the Trail', body: 'Spotted dust on the horizon to the east — riders, though I could not make out their number. Made camp at a dry wash and kept a fire low. Something does not feel right about this country.' })] }),
  },
  {
    id: 'combat',
    label: 'Combat Report',
    icon: 'fa-bolt',
    apply: (d) => ({ ...d, entries: [...(d.entries || []), create_journal_entry({ date: '', title: 'Gunfight', body: 'Shots broke out at the saloon around sundown. Two men dead, one wounded. The shooter fled north on horseback. I gave chase but lost the trail at the river crossing.' })] }),
  },
  {
    id: 'discovery',
    label: 'Discovery',
    icon: 'fa-eye',
    apply: (d) => ({ ...d, entries: [...(d.entries || []), create_journal_entry({ date: '', title: 'A Finding', body: 'Found strange marks on the rocks above the old mine shaft — not animal tracks and not any writing I know. The air was cold there, though the sun was high. I did not stay long.' })] }),
  },
  {
    id: 'observation',
    label: 'Observation',
    icon: 'fa-binoculars',
    apply: (d) => ({ ...d, entries: [...(d.entries || []), create_journal_entry({ date: '', title: 'Observations', body: 'The town has been quiet today. A stranger arrived on the morning stage — tall man, dark coat, did not speak to anyone. He took a room at the hotel and has not come out since. Worth watching.' })] }),
  },
];

function read_journal_from_dom(root, data) {
  const get = (name) => root.querySelector(`[name="${name}"]`)?.value ?? '';
  const entries = [];
  root.querySelectorAll('[data-entry-index]').forEach(row => {
    const idx = row.dataset.entryIndex;
    entries.push(create_journal_entry({
      date: row.querySelector(`[name="entry_date_${idx}"]`)?.value ?? '',
      title: row.querySelector(`[name="entry_title_${idx}"]`)?.value ?? '',
      body: row.querySelector(`[name="entry_body_${idx}"]`)?.value ?? '',
    }));
  });
  return create_journal_data({
    ...data,
    title: get('title'),
    author: get('author'),
    entries,
  });
}

const journal_editor_config = {
  category: 'journal',
  data_key: 'journal_data',
  anchor_field: 'text_content',
  icon: 'fa-book-open',
  title_key: 'journal_editor_title',
  template: 'modules/dc-containers/templates/documents/journal_editor.hbs',
  position: { width: 760, height: 720 },
  hydrate: migrate_journal_data,
  read_from_dom: read_journal_from_dom,
  render_preview: render_journal_html,
  labels: {
    add_entry: 'journal_add_entry',
  },
  enrich_context(ctx) {
    ctx.quickfill_html = build_quickfill_html({
      label: game.i18n.localize('dc.containers.doc.quickfill_label'),
      buttons: QUICKFILL_PRESETS.map((p) => ({ id: p.id, label: p.label, icon: p.icon })),
    });
  },
  wire_events(root) {
    wire_quickfill(root, this, { buttons: QUICKFILL_PRESETS });

    root.querySelector('[data-action="addEntry"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      this._read_from_dom();
      this.doc_data.entries = [...(this.doc_data.entries || []), create_journal_entry()];
      this.render({ force: true });
    });

    root.querySelectorAll('[data-action="removeEntry"]').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const idx = parseInt(btn.dataset.index, 10);
        this._read_from_dom();
        this.doc_data.entries.splice(idx, 1);
        this.render({ force: true });
      });
    });

    root.querySelectorAll('[data-action="moveEntryUp"]').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const idx = parseInt(btn.dataset.index, 10);
        if (idx <= 0) return;
        this._read_from_dom();
        const entries = this.doc_data.entries;
        [entries[idx - 1], entries[idx]] = [entries[idx], entries[idx - 1]];
        this.render({ force: true });
      });
    });

    root.querySelectorAll('[data-action="moveEntryDown"]').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const idx = parseInt(btn.dataset.index, 10);
        this._read_from_dom();
        const entries = this.doc_data.entries;
        if (idx >= entries.length - 1) return;
        [entries[idx], entries[idx + 1]] = [entries[idx + 1], entries[idx]];
        this.render({ force: true });
      });
    });
  },
};

const JournalEditorSheet = create_document_editor_class(journal_editor_config);
journal_editor_config.SheetClass = JournalEditorSheet;

function open_journal_editor(editor, preview_target) {
  return DocumentEditorSheet.open(editor, preview_target, journal_editor_config);
}

export {
  journal_editor_config,
  JournalEditorSheet,
  open_journal_editor,
};
