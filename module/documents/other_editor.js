/**
 * Other document editor config.
 */

import { create_document_editor_class, DocumentEditorSheet } from './document_editor_base.js';
import { migrate_other_data, create_other_data } from './document_data_utils.js';
import { render_other_html } from './other_render.js';
import { build_quickfill_html, wire_quickfill } from './editor_quickfill.js';

// Quick-fill presets for the other document editor.
const QUICKFILL_PRESETS = [
  {
    id: 'notice',
    label: 'Notice',
    icon: 'fa-bullhorn',
    apply: (d) => ({ ...d, title: 'NOTICE', style: 'notice', body: 'By order of the Territorial Governor, a reward of $500 is hereby offered for information leading to the capture of the individual or individuals responsible for the robbery of the Butterfield Stage on the 14th instant.\n\nAny person found harbouring or aiding said individuals shall be considered an accessory and prosecuted to the fullest extent of the law.\n\nInquiries to the Sheriff\u2019s Office.' }),
  },
  {
    id: 'proclamation',
    label: 'Proclamation',
    icon: 'fa-crown',
    apply: (d) => ({ ...d, title: 'PROCLAMATION', style: 'proclamation', body: 'Hear ye, hear ye! By the authority vested in this office, let it be known that the carrying of firearms within the town limits is hereby prohibited between the hours of sundown and sunrise.\n\nAny person found in violation of this ordinance shall be subject to a fine of $10 or no less than one night in the county jail.\n\nGiven under my hand this day, the Mayor.' }),
  },
  {
    id: 'obituary',
    label: 'Obituary',
    icon: 'fa-cross',
    apply: (d) => ({ ...d, title: 'In Memoriam', style: 'plain', body: 'It is with heavy heart that we record the passing of ____, a longtime resident of this town and a friend to all who knew him.\n\nBorn in the East, he came west seeking fortune and found instead a community that loved him. He was a man of quiet courage, quick to lend a hand and slow to speak ill of any soul.\n\nHe is survived by his wife and two children. Services will be held at the chapel on Sunday next. In lieu of flowers, the family requests donations to the school fund.\n\nRequiescat in pace.' }),
  },
  {
    id: 'reward',
    label: 'Reward',
    icon: 'fa-dollar-sign',
    apply: (d) => ({ ...d, title: 'REWARD', style: 'notice', body: '$200 REWARD\n\nFor the return of a bay gelding, white blaze, branded on the left hip with a diamond and the letters DX.\n\nLast seen tied outside the saloon on Friday last. The horse answers to the name "Judge."\n\nNo questions asked. Contact the livery stable.\n\n$200 REWARD' }),
  },
];

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
  enrich_context(ctx) {
    ctx.quickfill_html = build_quickfill_html({
      label: game.i18n.localize('dc.containers.doc.quickfill_label'),
      buttons: QUICKFILL_PRESETS.map((p) => ({ id: p.id, label: p.label, icon: p.icon })),
    });
  },
  wire_events(root) {
    wire_quickfill(root, this, { buttons: QUICKFILL_PRESETS });
  },
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