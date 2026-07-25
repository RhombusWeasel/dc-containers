/**
 * Letter editor config and procedural generation.
 */

import { create_document_editor_class, DocumentEditorSheet } from './document_editor_base.js';
import {
  migrate_letter_data,
  create_letter_data,
  body_to_paragraphs,
  paragraphs_to_body,
} from './document_data_utils.js';
import { render_letter_html } from './letter_render.js';

const SALUTATIONS = ['Dear Sir,', 'Dear Madam,', 'To Whom It May Concern,', 'My Dearest,'];

function read_letter_from_dom(root, data) {
  const get = (name) => root.querySelector(`[name="${name}"]`)?.value ?? '';
  const body_text = root.querySelector('[name="body"]')?.value ?? '';
  return create_letter_data({
    ...data,
    date: get('date'),
    sender: get('sender'),
    recipient: get('recipient'),
    salutation: get('salutation'),
    body: body_to_paragraphs(body_text),
    closing: get('closing'),
    signature: get('signature'),
    stationery: get('stationery') || 'formal',
  });
}

function prepare_letter_save(data) {
  return create_letter_data(data);
}

async function generate_letter_data(existing = {}) {
  const data = create_letter_data(existing);
  const gen_name = game.dc?.generate_random_name;
  if (gen_name) {
    try {
      data.sender = await gen_name('american', 'male');
      data.recipient = await gen_name('american', 'female');
    } catch (_err) {
      data.sender = data.sender || 'A Concerned Citizen';
    }
  }
  data.salutation = SALUTATIONS[Math.floor(Math.random() * SALUTATIONS.length)];
  data.closing = 'Yours faithfully,';
  data.signature = data.sender;
  data.body = ['I write to inform you of recent events that may concern your interests.'];
  return data;
}

const letter_editor_config = {
  category: 'letter',
  data_key: 'letter_data',
  anchor_field: 'text_content',
  icon: 'fa-envelope',
  title_key: 'letter_editor_title',
  template: 'modules/dc-containers/templates/documents/letter_editor.hbs',
  position: { width: 720, height: 680 },
  hydrate: migrate_letter_data,
  read_from_dom: read_letter_from_dom,
  prepare_save: prepare_letter_save,
  render_preview: render_letter_html,
  labels: {
    generate: 'letter_generate',
  },
  enrich_context(ctx) {
    ctx.body_text = paragraphs_to_body(ctx.doc_data.body);
  },
  wire_events(root) {
    root.querySelector('[data-action="generate"]')?.addEventListener('click', async (event) => {
      event.preventDefault();
      this._read_from_dom();
      this.doc_data = await generate_letter_data(this.doc_data);
      this.render({ force: true });
    });
  },
};

const LetterEditorSheet = create_document_editor_class(letter_editor_config);
letter_editor_config.SheetClass = LetterEditorSheet;

function open_letter_editor(editor, preview_target) {
  return DocumentEditorSheet.open(editor, preview_target, letter_editor_config);
}

export {
  letter_editor_config,
  LetterEditorSheet,
  open_letter_editor,
  generate_letter_data,
  paragraphs_to_body,
};
