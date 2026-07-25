/**
 * Central document HTML renderer — dispatches by category.
 */

import { render_newspaper_html } from './newspaper_render.js';
import { render_wanted_poster_html } from './wanted_poster_render.js';
import { render_letter_html } from './letter_render.js';
import { render_journal_html } from './journal_render.js';
import { render_ledger_html } from './ledger_render.js';
import { render_map_html } from './map_render.js';
import { render_other_html } from './other_render.js';
import { build_embed_url } from './document_embed.js';
import { DOCUMENT_DATA_KEYS } from './document_data_utils.js';

async function render_document_html(item) {
  if (!item) return { html: '', embed_url: '' };

  const category = item.category;
  const data_key = DOCUMENT_DATA_KEYS[category];
  const structured = data_key ? item[data_key] : null;

  switch (category) {
    case 'newspaper':
      if (item.newspaper_data) return { html: await render_newspaper_html(item.newspaper_data), embed_url: '' };
      break;
    case 'wanted_poster':
      if (structured) return { html: await render_wanted_poster_html(structured), embed_url: '' };
      break;
    case 'letter':
      if (structured) return { html: await render_letter_html(structured), embed_url: '' };
      break;
    case 'journal':
      if (structured) return { html: await render_journal_html(structured), embed_url: '' };
      break;
    case 'ledger':
      if (structured) return { html: await render_ledger_html(structured), embed_url: '' };
      break;
    case 'map':
      if (structured) return { html: await render_map_html(structured), embed_url: '' };
      break;
    case 'other':
      if (structured) return { html: await render_other_html(structured), embed_url: '' };
      break;
    case 'sourcebook': {
      const url = structured?.url || item.url || '';
      return { html: '', embed_url: build_embed_url(url) };
    }
    case 'web_page': {
      const url = structured?.url || item.url || '';
      return { html: '', embed_url: build_embed_url(url) };
    }
    default:
      break;
  }

  return { html: '', embed_url: build_embed_url(item.url) };
}

export { render_document_html };
