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
import { build_quickfill_html, wire_quickfill } from './editor_quickfill.js';

const SALUTATIONS = ['Dear Sir,', 'Dear Madam,', 'To Whom It May Concern,', 'My Dearest,'];

// Quick-fill presets for the letter editor.
const QUICKFILL_PRESETS = [
  {
    id: 'business',
    label: 'Business',
    icon: 'fa-briefcase',
    apply: (d) => ({ ...d, stationery: 'formal', salutation: 'Dear Sir,', body: ['I write to you on behalf of my employer regarding the matter we discussed in our previous correspondence.', 'The terms proposed are acceptable in principle, though we would request a small adjustment to the schedule of payments.', 'We await your response at your earliest convenience.'], closing: 'Yours faithfully,' }),
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: 'fa-paper-plane',
    apply: (d) => ({ ...d, stationery: 'telegram', sender: 'WESTERN UNION', salutation: '', body: ['STOP', 'URGENT MESSAGE STOP', 'ARRIVING ON TOMORROWS NOON STAGE STOP', 'HAVE THE MONEY READY STOP', 'TELL NO ONE STOP'], closing: 'END' }),
  },
  {
    id: 'personal',
    label: 'Personal',
    icon: 'fa-heart',
    apply: (d) => ({ ...d, stationery: 'handwritten', salutation: 'My dearest,', body: ['I hope this letter finds you well. The town is quiet tonight, and I find myself thinking of home more than usual.', 'The work here is harder than I expected, but I am saving what I can and hope to return by the spring.', 'Give my regards to the family. I think of you all every day.'], closing: 'With all my love,' }),
  },
  {
    id: 'threat',
    label: 'Threat',
    icon: 'fa-skull',
    apply: (d) => ({ ...d, stationery: 'handwritten', sender: 'A Friend', salutation: '', body: ['You have something that does not belong to you.', 'We know where you sleep. We know where your children play.', 'Leave town by sundown Friday or we will come for what is ours — and everything else besides.'], closing: 'You have been warned.' }),
  },
  {
    id: 'love',
    label: 'Love Letter',
    icon: 'fa-envelope-open-text',
    apply: (d) => ({ ...d, stationery: 'handwritten', salutation: 'My darling,', body: ['I cannot bear another day without writing to you. The miles between us feel like years.', 'I dream of the morning I will see your face again. Until that day, I carry your smile with me like a coin I will not spend.', 'Wait for me. I am coming home.'], closing: 'Forever yours,' }),
  },
];

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
    ctx.quickfill_html = build_quickfill_html({
      label: game.i18n.localize('dc.containers.doc.quickfill_label'),
      buttons: QUICKFILL_PRESETS.map((p) => ({ id: p.id, label: p.label, icon: p.icon })),
    });
  },
  wire_events(root) {
    wire_quickfill(root, this, { buttons: QUICKFILL_PRESETS });

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
