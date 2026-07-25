/**
 * Newspaper editor logic — layout-first data sync and palette placement.
 */

import {
  rebuild_newspaper_layout,
  split_into_fragments,
  calculate_slots_per_column,
  build_scaffold_layout,
  get_slot,
  set_slot,
  swap_slots,
  move_slot,
  empty_slot,
  layout_to_newspaper_data,
  resize_layout_grid,
  normalize_layout_grid,
  is_center_slot,
  is_valid_slot_ref,
  collect_main_paragraphs,
} from './newspaper_layout.js';
import {
  generate_article,
  ensure_story_context,
  generate_main_headline,
  generate_fragment_from_palette,
  get_palette_item,
} from './newspaper_generator.js';

const DEFAULT_COLUMNS = 2;
const DEFAULT_ROWS = 3;

/**
 * @param {number} [columns]
 * @param {number} [rows]
 * @returns {Object}
 */
function create_scaffold_newspaper_data(columns = DEFAULT_COLUMNS, rows = DEFAULT_ROWS) {
  return {
    paper_name: 'The Tombstone Epitaph',
    date: '',
    price: '5¢',
    volume: 'I',
    issue: 1,
    columns,
    story_type: 'crime',
    story_context: null,
    custom_fragments: [],
    layout: build_scaffold_layout(rows, columns),
    main_article: { headline: '', paragraphs: [], editor: '' },
    side_articles: [],
    advertisements: [],
    colophon: '',
  };
}

/** @deprecated use create_scaffold_newspaper_data */
function create_empty_newspaper_data() {
  return create_scaffold_newspaper_data();
}

/**
 * Hydrate layout from legacy array-based data when opening old newspapers.
 * @param {Object} newspaper_data
 * @returns {Object}
 */
function hydrate_newspaper_for_editor(newspaper_data) {
  if (!newspaper_data) return create_scaffold_newspaper_data();

  const data = foundry.utils.deepClone(newspaper_data);
  data.custom_fragments = data.custom_fragments || [];
  data.story_type = data.story_type || 'crime';

  const has_layout_content = _layout_has_content(data.layout);
  const has_arrays = (data.side_articles?.length || 0) > 0
    || (data.advertisements?.length || 0) > 0
    || (data.main_article?.paragraphs?.length || 0) > 0;

  if (!has_layout_content && has_arrays) {
    return rebuild_newspaper_layout(data);
  }

  if (!data.layout?.columns) {
    data.layout = build_scaffold_layout(DEFAULT_ROWS, data.columns ?? DEFAULT_COLUMNS);
  } else {
    data.layout = normalize_layout_grid(data.layout);
  }

  return data;
}

/**
 * @param {Object} layout
 * @returns {boolean}
 */
function _layout_has_content(layout) {
  if (!layout?.columns) return false;
  const check = (slot) => slot && slot.type && slot.type !== 'empty';
  if (layout.columns.left?.some(check)) return true;
  if (layout.columns.right?.some(check)) return true;
  for (const col of layout.columns.center || []) {
    if (col?.some(check)) return true;
  }
  return false;
}

/**
 * @param {Object} [article]
 * @returns {Object}
 */
function normalize_side_article(article = {}) {
  const paragraphs = Array.isArray(article.paragraphs)
    ? article.paragraphs.filter(p => p != null).map(String)
    : [];
  if (paragraphs.length === 0) paragraphs.push('');

  return {
    headline: article.headline ?? '',
    paragraphs,
    editor: article.editor ?? '',
    continued: article.continued ?? '',
    city: article.city ?? '',
    state: article.state ?? '',
    type: article.type ?? 'crime',
  };
}

/**
 * @param {Object} [ad]
 * @returns {Object}
 */
function normalize_ad(ad = {}) {
  return {
    id: ad.id ?? `ad-${foundry.utils.randomID()}`,
    title: ad.title ?? '',
    lines: Array.isArray(ad.lines) ? ad.lines.map(String) : [],
    note: ad.note ?? '',
    column: ad.column ?? 'left',
  };
}

/**
 * @param {Object} layout
 * @param {string|null} selected_ref_key
 * @returns {Object}
 */
function enrich_layout_for_editor(layout, selected_ref_key = null) {
  if (!layout?.columns) return layout;
  const enriched = normalize_layout_grid(foundry.utils.deepClone(layout));

  for (let row = 0; row < enriched.slots_per_column; row++) {
    const left = enriched.columns.left[row];
    if (left) {
      left.slot_ref = { zone: 'left', row };
      left.ref_key = `left:${row}`;
      left.selected = left.ref_key === selected_ref_key;
    }

    const right = enriched.columns.right[row];
    if (right) {
      right.slot_ref = { zone: 'right', row };
      right.ref_key = `right:${row}`;
      right.selected = right.ref_key === selected_ref_key;
    }

    for (let col = 0; col < enriched.center_columns; col++) {
      const slot = enriched.columns.center[col][row];
      if (slot) {
        slot.slot_ref = { zone: 'center', col, row };
        slot.ref_key = `center:${col}:${row}`;
        slot.selected = slot.ref_key === selected_ref_key;
      }
    }
  }

  return enriched;
}

/**
 * @param {string} ref_key
 * @returns {Object|null}
 */
function parse_ref_key(ref_key) {
  if (!ref_key) return null;
  const parts = ref_key.split(':');
  if (parts[0] === 'center' && parts.length === 3) {
    return { zone: 'center', col: parseInt(parts[1], 10), row: parseInt(parts[2], 10) };
  }
  if ((parts[0] === 'left' || parts[0] === 'right') && parts.length === 2) {
    return { zone: parts[0], row: parseInt(parts[1], 10) };
  }
  return null;
}

/**
 * @param {Object} ref
 * @returns {string}
 */
function ref_to_key(ref) {
  if (!ref) return '';
  if (ref.zone === 'center') return `center:${ref.col}:${ref.row}`;
  return `${ref.zone}:${ref.row}`;
}

/**
 * @param {Object} newspaper_data
 * @returns {string}
 */
function main_body_text(newspaper_data) {
  return (newspaper_data.main_article?.paragraphs || []).join('\n\n');
}

/**
 * @param {Object} newspaper_data
 * @param {Object} slot_ref
 * @param {string} palette_id
 * @returns {Promise<Object>}
 */
async function place_palette_item(newspaper_data, slot_ref, palette_id) {
  let data = foundry.utils.deepClone(newspaper_data);
  if (!is_valid_slot_ref(slot_ref, data.layout)) return data;

  const palette_item = get_palette_item(palette_id);
  if (palette_item?.slot_type === 'main_fragment' && !is_center_slot(slot_ref)) return data;
  if (palette_id.startsWith('custom:') && !is_center_slot(slot_ref)) return data;

  const story_type = palette_item?.story_type || data.story_type || 'crime';

  if (palette_id.startsWith('main:') || palette_id.startsWith('side:') || palette_id.startsWith('custom:')) {
    data.story_type = story_type;
    data.story_context = await ensure_story_context(
      () => Math.random(),
      story_type,
      data.story_context,
      { paper_name: data.paper_name, editor_name: data.main_article?.editor },
    );
  }

  const center_slots = _count_center_main_fragments(data.layout);
  const is_first_main = palette_item?.slot_type === 'main_fragment' && center_slots === 0;
  const target_slot = get_slot(data.layout, slot_ref);
  const replacing_empty = !target_slot || target_slot.type === 'empty';

  const content = await generate_fragment_from_palette(
    palette_id,
    data.story_context || {},
    {
      seed: `palette-${Date.now()}`,
      paper_name: data.paper_name,
      custom_fragments: data.custom_fragments,
      drop_cap: is_first_main && replacing_empty,
    },
  );

  if (content.type === 'ad' || content.type === 'filler_ad') {
    content.column = slot_ref.zone === 'center' ? 'center'
      : (slot_ref.zone === 'right' ? 'right' : 'left');
  }

  data.layout = set_slot(data.layout, slot_ref, content);

  if (is_first_main && !data.main_article?.headline?.trim()) {
    data.main_article = {
      ...data.main_article,
      headline: generate_main_headline(() => Math.random(), data.story_context, story_type),
    };
  }

  return layout_to_newspaper_data(data);
}

/**
 * @param {Object} layout
 * @returns {number}
 */
function _count_center_main_fragments(layout) {
  let count = 0;
  for (let row = 0; row < (layout.slots_per_column || 0); row++) {
    for (let col = 0; col < (layout.center_columns || 0); col++) {
      const slot = layout.columns.center?.[col]?.[row];
      if (slot?.type === 'main_fragment') count++;
    }
  }
  return count;
}

/**
 * Regenerate content for an occupied slot using its palette_id or type defaults.
 * @param {Object} newspaper_data
 * @param {Object} slot_ref
 * @returns {Promise<Object>}
 */
async function regenerate_slot(newspaper_data, slot_ref) {
  const slot = get_slot(newspaper_data.layout, slot_ref);
  if (!slot || slot.type === 'empty') return newspaper_data;

  const palette_id = slot.palette_id
    || (slot.type === 'side_article' ? 'side:brief' : null)
    || (slot.type === 'ad' && slot.id ? `ad:${slot.id}` : null);

  if (!palette_id) return newspaper_data;

  return place_palette_item(
    { ...newspaper_data, layout: set_slot(newspaper_data.layout, slot_ref, empty_slot()) },
    slot_ref,
    palette_id,
  );
}

/**
 * @param {Object} newspaper_data
 * @param {Object} ref_from
 * @param {Object} ref_to
 * @returns {Object}
 */
function transfer_slot(newspaper_data, ref_from, ref_to) {
  let data = foundry.utils.deepClone(newspaper_data);
  data.layout = normalize_layout_grid(data.layout);
  if (!is_valid_slot_ref(ref_from, data.layout) || !is_valid_slot_ref(ref_to, data.layout)) {
    return newspaper_data;
  }
  const from_slot = get_slot(data.layout, ref_from);
  const to_slot = get_slot(data.layout, ref_to);
  if (!from_slot || from_slot.type === 'empty') return data;

  if (!to_slot || to_slot.type === 'empty') {
    data.layout = move_slot(data.layout, ref_from, ref_to);
  } else {
    data.layout = swap_slots(data.layout, ref_from, ref_to);
  }

  return layout_to_newspaper_data(data);
}

/**
 * Clear a slot.
 * @param {Object} newspaper_data
 * @param {Object} slot_ref
 * @returns {Object}
 */
function clear_slot(newspaper_data, slot_ref) {
  let data = foundry.utils.deepClone(newspaper_data);
  data.layout = set_slot(data.layout, slot_ref, empty_slot());
  return layout_to_newspaper_data(data);
}

/**
 * Apply detail panel fields to selected slot.
 * @param {Object} newspaper_data
 * @param {Object} slot_ref
 * @param {Object} fields
 * @returns {Object}
 */
function apply_detail_to_slot(newspaper_data, slot_ref, fields) {
  let data = foundry.utils.deepClone(newspaper_data);
  const slot = get_slot(data.layout, slot_ref);
  if (!slot || slot.type === 'empty') return data;

  let updated = { ...slot };

  if (slot.type === 'main_fragment') {
    updated.text = fields.text ?? slot.text;
  } else if (slot.type === 'side_article') {
    updated.headline = fields.headline ?? slot.headline;
    updated.paragraphs = [fields.body ?? slot.paragraphs?.[0] ?? ''];
    updated.continued = fields.continued ?? slot.continued;
  } else if (slot.type === 'ad' || slot.type === 'filler_ad') {
    updated.title = fields.ad_title ?? slot.title;
    updated.lines = (fields.ad_lines ?? slot.lines?.join('\n') ?? '').split('\n').filter(Boolean);
    updated.note = fields.ad_note ?? slot.note;
  }

  data.layout = set_slot(data.layout, slot_ref, updated);
  return layout_to_newspaper_data(data);
}

/**
 * Build detail panel context for a slot.
 * @param {Object} slot
 * @returns {Object}
 */
function slot_detail_context(slot) {
  if (!slot || slot.type === 'empty') {
    return { slot_type: 'empty', empty: true };
  }

  if (slot.type === 'main_fragment') {
    return { slot_type: 'main_fragment', text: slot.text || '' };
  }
  if (slot.type === 'side_article') {
    return {
      slot_type: 'side_article',
      headline: slot.headline || '',
      body: slot.paragraphs?.[0] || '',
      continued: slot.continued || '',
    };
  }
  if (slot.type === 'ad' || slot.type === 'filler_ad') {
    return {
      slot_type: 'ad',
      ad_title: slot.title || '',
      ad_lines: (slot.lines || []).join('\n'),
      ad_note: slot.note || '',
    };
  }

  return { slot_type: slot.type, empty: true };
}

/**
 * @param {Object} newspaper_data
 * @param {string} label
 * @param {string} text
 * @returns {Object}
 */
function add_custom_fragment(newspaper_data, label, text) {
  const data = foundry.utils.deepClone(newspaper_data);
  data.custom_fragments = data.custom_fragments || [];
  const id = foundry.utils.randomID();
  data.custom_fragments.push({ id, label: label || 'Custom', text: text || '' });
  return data;
}

/**
 * @param {Object} newspaper_data
 * @returns {Object}
 */
function reset_story_context(newspaper_data) {
  const data = foundry.utils.deepClone(newspaper_data);
  data.story_context = null;
  return data;
}

/**
 * @param {Object} newspaper_data
 * @param {number} columns
 * @param {number} rows
 * @returns {Object}
 */
function resize_editor_grid(newspaper_data, columns, rows) {
  const data = foundry.utils.deepClone(newspaper_data);
  data.columns = columns;
  data.layout = resize_layout_grid(data.layout, columns, rows);
  return layout_to_newspaper_data(data);
}

/**
 * @param {Object} newspaper_data
 * @param {Array} articles
 * @returns {Object}
 */
function apply_side_articles(newspaper_data, articles) {
  return rebuild_newspaper_layout({
    ...newspaper_data,
    side_articles: articles.map(normalize_side_article),
  });
}

/**
 * @param {Object} newspaper_data
 * @param {string} body_text
 * @returns {Object}
 */
function sync_main_body_to_layout(newspaper_data, body_text) {
  const side_count = (newspaper_data.side_articles || []).length;
  const ad_count = (newspaper_data.advertisements || []).length;
  const fragment_count = Math.max(1, side_count + ad_count);
  const main_fragments = split_into_fragments(body_text, fragment_count);
  return rebuild_newspaper_layout(newspaper_data, { main_fragments });
}

/**
 * @param {Object} newspaper_data
 * @returns {Object}
 */
function add_side_article(newspaper_data) {
  const articles = [...(newspaper_data.side_articles || []), normalize_side_article()];
  return apply_side_articles(newspaper_data, articles);
}

/**
 * @param {Object} newspaper_data
 * @param {number} index
 * @returns {Object}
 */
function remove_side_article(newspaper_data, index) {
  const articles = [...(newspaper_data.side_articles || [])];
  articles.splice(index, 1);
  return apply_side_articles(newspaper_data, articles);
}

/**
 * @param {Object} newspaper_data
 * @param {number} index
 * @param {number} direction — -1 or 1
 * @returns {Object}
 */
function move_side_article(newspaper_data, index, direction) {
  const articles = [...(newspaper_data.side_articles || [])];
  const target = index + direction;
  if (target < 0 || target >= articles.length) return newspaper_data;
  [articles[index], articles[target]] = [articles[target], articles[index]];
  return apply_side_articles(newspaper_data, articles);
}

/**
 * @param {Object} newspaper_data
 * @param {number} index
 * @returns {Promise<Object>}
 */
async function randomize_side_article(newspaper_data, index) {
  const articles = [...(newspaper_data.side_articles || [])];
  const stub = await generate_article({
    seed: `side-edit-${Date.now()}-${index}`,
    blueprint_scope: 'brief',
    extra_ctx: { paper_name: newspaper_data.paper_name },
  });
  articles[index] = normalize_side_article(stub);
  return apply_side_articles(newspaper_data, articles);
}

/**
 * @param {Object} newspaper_data
 * @returns {Promise<Object>}
 */
async function randomize_all_side_articles(newspaper_data) {
  const articles = [...(newspaper_data.side_articles || [])];
  for (let i = 0; i < articles.length; i++) {
    const stub = await generate_article({
      seed: `side-all-${Date.now()}-${i}`,
      blueprint_scope: 'brief',
      extra_ctx: { paper_name: newspaper_data.paper_name },
    });
    articles[i] = normalize_side_article(stub);
  }
  return apply_side_articles(newspaper_data, articles);
}

/**
 * @param {Object} newspaper_data
 * @param {HTMLElement} root
 * @param {string|null} [selected_ref_key]
 * @param {Object|null} [detail_fields]
 * @returns {Object}
 */
function read_newspaper_from_dom(newspaper_data, root, selected_ref_key = null, detail_fields = null) {
  let data = foundry.utils.deepClone(newspaper_data);

  data.paper_name = root.querySelector('[name="paper_name"]')?.value ?? data.paper_name;
  data.date = root.querySelector('[name="date"]')?.value ?? data.date;
  data.price = root.querySelector('[name="price"]')?.value ?? data.price;
  data.columns = parseInt(root.querySelector('[name="columns"]')?.value || String(data.columns ?? 2), 10);

  data.main_article = {
    ...data.main_article,
    headline: root.querySelector('[name="main_headline"]')?.value ?? '',
  };

  const detail = root.querySelector('.newspaper-detail-panel');
  const ref_key = selected_ref_key || detail?.dataset?.selectedRef || '';
  const ref = parse_ref_key(ref_key);
  if (ref && (detail || detail_fields)) {
    data = apply_detail_to_slot(data, ref, {
      text: detail_fields?.text ?? detail?.querySelector('[name="detail_text"]')?.value,
      headline: detail_fields?.headline ?? detail?.querySelector('[name="detail_headline"]')?.value,
      body: detail_fields?.body ?? detail?.querySelector('[name="detail_body"]')?.value,
      continued: detail_fields?.continued ?? detail?.querySelector('[name="detail_continued"]')?.value,
      ad_title: detail_fields?.ad_title ?? detail?.querySelector('[name="detail_ad_title"]')?.value,
      ad_lines: detail_fields?.ad_lines ?? detail?.querySelector('[name="detail_ad_lines"]')?.value,
      ad_note: detail_fields?.ad_note ?? detail?.querySelector('[name="detail_ad_note"]')?.value,
    });
  }

  return layout_to_newspaper_data(data);
}

export {
  create_scaffold_newspaper_data,
  create_empty_newspaper_data,
  hydrate_newspaper_for_editor,
  normalize_side_article,
  normalize_ad,
  enrich_layout_for_editor,
  parse_ref_key,
  ref_to_key,
  main_body_text,
  place_palette_item,
  regenerate_slot,
  transfer_slot,
  clear_slot,
  apply_detail_to_slot,
  slot_detail_context,
  add_custom_fragment,
  reset_story_context,
  resize_editor_grid,
  apply_side_articles,
  sync_main_body_to_layout,
  add_side_article,
  remove_side_article,
  move_side_article,
  randomize_side_article,
  randomize_all_side_articles,
  read_newspaper_from_dom,
  layout_to_newspaper_data,
  rebuild_newspaper_layout,
  is_center_slot,
};
