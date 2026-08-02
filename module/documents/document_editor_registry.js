/**
 * Registry of category-specific document editors for dcEditorRender hook.
 */

import NewspaperEditorSheet from './newspaper_editor_sheet.js';
import { preview_for_category } from './document_data_utils.js';
import { wanted_poster_editor_config, open_wanted_poster_editor } from './wanted_poster_editor.js';
import { letter_editor_config, open_letter_editor } from './letter_editor.js';
import { journal_editor_config, open_journal_editor } from './journal_editor.js';
import { ledger_editor_config, open_ledger_editor } from './ledger_editor.js';
import { map_editor_config, open_map_editor } from './map_editor.js';
import { book_editor_config, open_book_editor } from './book_editor.js';
import { web_page_editor_config, open_web_page_editor } from './web_page_editor.js';
import { other_editor_config, open_other_editor } from './other_editor.js';

const NEWSPAPER_CONFIG = {
  category: 'newspaper',
  data_key: 'newspaper_data',
  anchor_field: 'text_content',
  icon: 'fa-newspaper',
  title_key: 'open_newspaper_editor',
  open: (editor, anchor) => NewspaperEditorSheet.open(editor, anchor),
  preview: (data) => {
    if (!data) return '';
    const text = `${data.paper_name || ''} — ${data.date || ''}`.trim();
    return text.length > 30 ? `${text.substring(0, 30)}...` : text;
  },
};

const GENERIC_CONFIGS = [
  wanted_poster_editor_config,
  letter_editor_config,
  journal_editor_config,
  ledger_editor_config,
  map_editor_config,
  book_editor_config,
  web_page_editor_config,
  other_editor_config,
];

const OPEN_BY_CATEGORY = {
  wanted_poster: open_wanted_poster_editor,
  letter: open_letter_editor,
  journal: open_journal_editor,
  ledger: open_ledger_editor,
  map: open_map_editor,
  book: open_book_editor,
  web_page: open_web_page_editor,
  other: open_other_editor,
};

function registry_entries() {
  const entries = [NEWSPAPER_CONFIG];
  for (const config of GENERIC_CONFIGS) {
    entries.push({
      category: config.category,
      data_key: config.data_key,
      anchor_field: config.anchor_field,
      icon: config.icon,
      title_key: config.title_key,
      open: OPEN_BY_CATEGORY[config.category],
      preview: (data) => preview_for_category(config.category, data),
    });
  }
  return entries;
}

function find_anchor_element(element, anchor_field) {
  const textarea_btn = element.querySelector(
    `a.editor-edit-textarea[data-key$="${anchor_field}"]`,
  );
  if (textarea_btn) return textarea_btn;

  const input = element.querySelector(
    `input[type="text"][class$="${anchor_field}"], input[type="text"][class*=".${anchor_field}"]`,
  );
  if (input) return input;

  return null;
}

function sync_document_editor_buttons(editor, element) {
  const select = element.querySelector('select.category');
  const category = select?.value ?? editor.data?.category;

  for (const entry of registry_entries()) {
    const anchor = find_anchor_element(element, entry.anchor_field);
    if (!anchor) continue;

    const parent = anchor.parentElement;
    const btn_class = `editor-open-document-${entry.category}`;
    const existing = parent?.querySelector(`.${btn_class}`);

    if (category !== entry.category) {
      existing?.remove();
      continue;
    }

    if (!existing) {
      const btn = document.createElement('a');
      btn.className = `fas ${entry.icon} ${btn_class} editor-open-document`;
      btn.dataset.category = entry.category;
      btn.title = game.i18n.localize(`dc.containers.doc.${entry.title_key}`);
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        entry.open(editor, anchor);
      });
      anchor.after(btn);
    }

    const data = editor.data?.[entry.data_key];
    const preview_text = entry.preview(data);
    if (preview_text) {
      let preview_el = parent.querySelector('.textarea-preview');
      if (!preview_el) {
        preview_el = parent.querySelector('.document-editor-preview');
        if (!preview_el) {
          preview_el = document.createElement('span');
          preview_el.className = 'document-editor-preview typed-small';
          parent.appendChild(preview_el);
        }
      }
      preview_el.textContent = preview_text;
    }
  }
}

export {
  registry_entries,
  sync_document_editor_buttons,
};
