/**
 * Wanted poster data, editor config, and procedural generation.
 */

import { create_document_editor_class, DocumentEditorSheet, browse_image } from './document_editor_base.js';
import { migrate_wanted_poster_data, create_wanted_poster_data } from './document_data_utils.js';
import { render_wanted_poster_html } from './wanted_poster_render.js';

const CRIMES = [
  'Horse Theft', 'Bank Robbery', 'Cattle Rustling', 'Train Robbery',
  'Murder', 'Claim Jumping', 'Counterfeiting', 'Stagecoach Hold-Up',
];

const REWARDS = ['$50', '$100', '$250', '$500', '$1000', '$2500'];

function read_wanted_poster_from_dom(root, data) {
  const get = (name) => root.querySelector(`[name="${name}"]`)?.value ?? '';
  return create_wanted_poster_data({
    ...data,
    name: get('name'),
    alias: get('alias'),
    crime: get('crime'),
    details: get('details'),
    description: get('description'),
    reward: get('reward'),
    contact: get('contact'),
    portrait: get('portrait'),
  });
}

async function generate_wanted_poster_data(existing = {}) {
  const data = create_wanted_poster_data(existing);
  const gen_name = game.dc?.generate_random_name;
  if (gen_name) {
    try {
      data.name = await gen_name('american', Math.random() > 0.5 ? 'male' : 'female');
    } catch (_err) {
      data.name = data.name || 'Unknown Outlaw';
    }
  }
  data.crime = CRIMES[Math.floor(Math.random() * CRIMES.length)];
  data.reward = REWARDS[Math.floor(Math.random() * REWARDS.length)];
  data.details = data.details || 'Last seen heading west toward the territory line.';
  data.contact = data.contact || 'Local Sheriff\'s Office';
  return data;
}

const wanted_poster_editor_config = {
  category: 'wanted_poster',
  data_key: 'wanted_poster_data',
  anchor_field: 'image',
  icon: 'fa-scroll',
  title_key: 'wanted_poster_editor_title',
  template: 'modules/dc-containers/templates/documents/wanted_poster_editor.hbs',
  position: { width: 800, height: 720 },
  hydrate: migrate_wanted_poster_data,
  read_from_dom: read_wanted_poster_from_dom,
  render_preview: render_wanted_poster_html,
  sync_legacy_fields(data, doc_data) {
    data.image = doc_data.portrait || data.image;
  },
  labels: {
    saved_hint: 'editor_saved_hint',
    generate: 'wanted_poster_generate',
    pick_image: 'wanted_poster_pick_image',
  },
  wire_events(root) {
    root.querySelector('[data-action="generate"]')?.addEventListener('click', async (event) => {
      event.preventDefault();
      this._read_from_dom();
      this.doc_data = await generate_wanted_poster_data(this.doc_data);
      this.render({ force: true });
    });

    root.querySelector('[data-action="pickPortrait"]')?.addEventListener('click', async (event) => {
      event.preventDefault();
      const input = root.querySelector('[name="portrait"]');
      await browse_image.call(this, input?.value || '', (path) => {
        if (input) input.value = path;
        const img = root.querySelector('.wanted-poster-portrait-preview');
        if (img) img.src = path;
      });
    });
  },
};

const WantedPosterEditorSheet = create_document_editor_class(wanted_poster_editor_config);
wanted_poster_editor_config.SheetClass = WantedPosterEditorSheet;

function open_wanted_poster_editor(editor, preview_target) {
  return DocumentEditorSheet.open(editor, preview_target, wanted_poster_editor_config);
}

export {
  wanted_poster_editor_config,
  WantedPosterEditorSheet,
  open_wanted_poster_editor,
  generate_wanted_poster_data,
};
