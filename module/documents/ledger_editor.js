/**
 * Ledger editor config.
 */

import { create_document_editor_class, DocumentEditorSheet } from './document_editor_base.js';
import {
  migrate_ledger_data,
  create_ledger_data,
  create_ledger_row,
} from './document_data_utils.js';
import { render_ledger_html, compute_ledger_balances } from './ledger_render.js';

function read_ledger_from_dom(root, data) {
  const get = (name) => root.querySelector(`[name="${name}"]`)?.value ?? '';
  const rows = [];
  root.querySelectorAll('[data-row-index]').forEach(row_el => {
    const idx = row_el.dataset.rowIndex;
    rows.push({
      date: row_el.querySelector(`[name="row_date_${idx}"]`)?.value ?? '',
      description: row_el.querySelector(`[name="row_desc_${idx}"]`)?.value ?? '',
      debit: row_el.querySelector(`[name="row_debit_${idx}"]`)?.value ?? '',
      credit: row_el.querySelector(`[name="row_credit_${idx}"]`)?.value ?? '',
      balance: '',
    });
  });
  return create_ledger_data({
    ...data,
    account_name: get('account_name'),
    period: get('period'),
    currency_label: get('currency_label') || '$',
    rows,
  });
}

function prepare_ledger_save(data) {
  return compute_ledger_balances(data);
}

const ledger_editor_config = {
  category: 'ledger',
  data_key: 'ledger_data',
  anchor_field: 'text_content',
  icon: 'fa-table',
  title_key: 'ledger_editor_title',
  template: 'modules/dc-containers/templates/documents/ledger_editor.hbs',
  position: { width: 860, height: 720 },
  hydrate: migrate_ledger_data,
  read_from_dom: read_ledger_from_dom,
  prepare_save: prepare_ledger_save,
  render_preview: render_ledger_html,
  labels: {
    add_row: 'ledger_add_row',
  },
  wire_events(root) {
    root.querySelector('[data-action="addRow"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      this._read_from_dom();
      this.doc_data.rows = [...(this.doc_data.rows || []), create_ledger_row()];
      this.render({ force: true });
    });

    root.querySelectorAll('[data-action="removeRow"]').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const idx = parseInt(btn.dataset.index, 10);
        this._read_from_dom();
        this.doc_data.rows.splice(idx, 1);
        this.render({ force: true });
      });
    });
  },
};

const LedgerEditorSheet = create_document_editor_class(ledger_editor_config);
ledger_editor_config.SheetClass = LedgerEditorSheet;

function open_ledger_editor(editor, preview_target) {
  return DocumentEditorSheet.open(editor, preview_target, ledger_editor_config);
}

export {
  ledger_editor_config,
  LedgerEditorSheet,
  open_ledger_editor,
};
