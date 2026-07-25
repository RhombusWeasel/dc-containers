/**
 * Slot-grid layout for procedural newspapers.
 */

/**
 * @param {number} side_count
 * @param {number} ad_count
 * @param {number} center_columns
 * @returns {number}
 */
function calculate_slots_per_column(side_count, ad_count, center_columns) {
  const main_fragment_count = Math.max(1, side_count + ad_count);
  const side_slots_needed = Math.ceil(side_count / 2) + Math.ceil(ad_count / 2);
  const center_slots_needed = Math.ceil(main_fragment_count / center_columns);
  return Math.max(side_slots_needed, center_slots_needed);
}

/**
 * @param {number} count
 * @returns {Array<null>}
 */
function empty_slots(count) {
  return Array.from({ length: count }, () => null);
}

/**
 * Pad or truncate a queue to exactly slots_per_column entries.
 * @param {Array} queue
 * @param {number} slots_per_column
 * @returns {Array}
 */
function fit_queue(queue, slots_per_column) {
  const result = queue.slice(0, slots_per_column);
  while (result.length < slots_per_column) result.push(null);
  return result;
}

/**
 * @param {Object} params
 * @returns {Object}
 */
function pack_column_slots({
  slots_per_column,
  side_articles,
  featured_ads,
  main_fragments,
  center_columns,
}) {
  const left_ads = featured_ads.filter(a => a.column === 'left');
  const right_ads = featured_ads.filter(a => a.column === 'right');
  const left_articles = side_articles.filter((_, i) => i % 2 === 0);
  const right_articles = side_articles.filter((_, i) => i % 2 === 1);

  const left_queue = [
    ...left_ads.map(a => ({ type: 'ad', id: a.id, title: a.title, lines: a.lines, note: a.note })),
    ...left_articles.map(a => ({
      type: 'side_article',
      headline: a.headline,
      paragraphs: a.paragraphs,
      editor: a.editor,
      continued: a.continued,
    })),
  ];

  const right_queue = [
    ...right_articles.map(a => ({
      type: 'side_article',
      headline: a.headline,
      paragraphs: a.paragraphs,
      editor: a.editor,
      continued: a.continued,
    })),
    ...right_ads.map(a => ({ type: 'ad', id: a.id, title: a.title, lines: a.lines, note: a.note })),
  ];

  const center = Array.from({ length: center_columns }, () => []);
  main_fragments.forEach((frag, i) => {
    center[i % center_columns].push({
      type: 'main_fragment',
      text: frag.text,
      drop_cap: !!frag.drop_cap,
    });
  });

  return {
    slots_per_column,
    center_columns,
    columns: {
      left: fit_queue(left_queue, slots_per_column),
      center: center.map(col => fit_queue(col, slots_per_column)),
      right: fit_queue(right_queue, slots_per_column),
    },
  };
}

/**
 * @param {Object} layout
 * @param {Function} select_ad_fn — (rng, filters) => ad|null
 * @param {Function} rng
 * @param {Set<string>} used_ad_ids
 * @returns {Object}
 */
function fill_empty_slots(layout, select_ad_fn, rng, used_ad_ids) {
  const column_arrays = [
    layout.columns.left,
    ...layout.columns.center,
    layout.columns.right,
  ];

  for (const col of column_arrays) {
    for (let i = 0; i < col.length; i++) {
      if (col[i] !== null) continue;
      const ad = select_ad_fn(rng, { exclude_ids: used_ad_ids });
      if (ad) {
        used_ad_ids.add(ad.id);
        col[i] = { type: 'filler_ad', id: ad.id, title: ad.title, lines: ad.lines, note: ad.note };
      } else {
        col[i] = { type: 'empty' };
      }
    }
  }

  return layout;
}

/**
 * Build an empty scaffold layout.
 * @param {number} slots_per_column
 * @param {number} center_columns
 * @returns {Object}
 */
function build_scaffold_layout(slots_per_column, center_columns) {
  const placeholder = { type: 'empty' };
  return {
    slots_per_column,
    center_columns,
    columns: {
      left: Array.from({ length: slots_per_column }, () => ({ ...placeholder })),
      center: Array.from({ length: center_columns }, () =>
        Array.from({ length: slots_per_column }, () => ({ ...placeholder })),
      ),
      right: Array.from({ length: slots_per_column }, () => ({ ...placeholder })),
    },
  };
}

/**
 * Split body text into fragment strings for hybrid mode.
 * @param {string} text
 * @param {number} count
 * @returns {Array<{text: string, drop_cap: boolean}>}
 */
function split_into_fragments(text, count) {
  if (count <= 0) return [];

  if (!text?.trim()) {
    return Array.from({ length: count }, (_, i) => ({ text: '', drop_cap: i === 0 }));
  }

  let parts = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);

  if (parts.length < count) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text.trim()];
    for (const sentence of sentences) {
      if (parts.length >= count) break;
      parts.push(sentence.trim());
    }
  }

  while (parts.length < count) parts.push('');
  parts = parts.slice(0, count);

  return parts.map((part, i) => ({ text: part, drop_cap: i === 0 }));
}

/**
 * Collect main fragment texts from a packed layout (reading order).
 * @param {Object} layout
 * @returns {string[]}
 */
function collect_main_paragraphs(layout) {
  const { center_columns, columns } = layout;
  const paragraphs = [];
  for (let row = 0; row < layout.slots_per_column; row++) {
    for (let col = 0; col < center_columns; col++) {
      const slot = columns.center[col]?.[row];
      if (slot?.type === 'main_fragment' && slot.text) {
        paragraphs.push(slot.text);
      }
    }
  }
  return paragraphs;
}

/**
 * Extract main fragment objects from a packed layout.
 * @param {Object} layout
 * @returns {Array<{text: string, drop_cap: boolean}>}
 */
function extract_main_fragments(layout) {
  if (!layout?.columns?.center) return [];
  const { center_columns, columns, slots_per_column } = layout;
  const fragments = [];
  for (let row = 0; row < slots_per_column; row++) {
    for (let col = 0; col < center_columns; col++) {
      const slot = columns.center[col]?.[row];
      if (slot?.type === 'main_fragment') {
        fragments.push({ text: slot.text || '', drop_cap: !!slot.drop_cap });
      }
    }
  }
  return fragments;
}

/**
 * Copy filler_ad and empty slots from old layout when grid dimensions match.
 * @param {Object} new_layout
 * @param {Object} old_layout
 * @returns {Object}
 */
function preserve_filler_slots(new_layout, old_layout) {
  if (!old_layout?.columns) return new_layout;

  const same_size = old_layout.slots_per_column === new_layout.slots_per_column
    && old_layout.center_columns === new_layout.center_columns;
  if (!same_size) {
    pad_null_slots(new_layout);
    return new_layout;
  }

  const column_sets = [
    [new_layout.columns.left, old_layout.columns.left],
    ...new_layout.columns.center.map((col, i) => [col, old_layout.columns.center[i]]),
    [new_layout.columns.right, old_layout.columns.right],
  ];

  for (const [new_col, old_col] of column_sets) {
    if (!new_col || !old_col) continue;
    for (let i = 0; i < new_col.length; i++) {
      if (new_col[i] !== null) continue;
      const old_slot = old_col[i];
      if (old_slot?.type === 'filler_ad' || old_slot?.type === 'empty') {
        new_col[i] = { ...old_slot };
      } else {
        new_col[i] = { type: 'empty' };
      }
    }
  }

  return new_layout;
}

/**
 * Replace remaining null slots with empty placeholders.
 * @param {Object} layout
 */
function pad_null_slots(layout) {
  const column_arrays = [
    layout.columns.left,
    ...layout.columns.center,
    layout.columns.right,
  ];
  for (const col of column_arrays) {
    for (let i = 0; i < col.length; i++) {
      if (col[i] === null) col[i] = { type: 'empty' };
    }
  }
}

/**
 * Resolve main fragments from overrides, layout, or paragraph text.
 * @param {Object} newspaper_data
 * @param {Object} options
 * @returns {Array<{text: string, drop_cap: boolean}>}
 */
function resolve_main_fragments(newspaper_data, options = {}) {
  if (options.main_fragments?.length) return options.main_fragments;

  const old_layout = newspaper_data.layout;
  const extracted = extract_main_fragments(old_layout);
  if (extracted.length > 0) return extracted;

  const side_count = (newspaper_data.side_articles || []).length;
  const ad_count = (newspaper_data.advertisements || []).length;
  const columns = newspaper_data.columns ?? 2;
  const fragment_count = Math.max(1, side_count + ad_count);
  const paragraphs = newspaper_data.main_article?.paragraphs || [];
  const body_text = paragraphs.join('\n\n');
  return split_into_fragments(body_text, fragment_count);
}

/**
 * Re-pack layout from newspaper_data, optionally overriding main fragments.
 * @param {Object} newspaper_data
 * @param {Object} [options]
 * @param {Array} [options.main_fragments]
 * @returns {Object} updated newspaper_data
 */
function rebuild_newspaper_layout(newspaper_data, options = {}) {
  const side_articles = newspaper_data.side_articles || [];
  const advertisements = newspaper_data.advertisements || [];
  const columns = newspaper_data.columns ?? 2;
  const old_layout = newspaper_data.layout;
  const main_fragments = resolve_main_fragments(newspaper_data, options);
  const ad_count = advertisements.length;
  const slots_per_column = calculate_slots_per_column(side_articles.length, ad_count, columns);

  let layout = pack_column_slots({
    slots_per_column,
    side_articles,
    featured_ads: advertisements,
    main_fragments,
    center_columns: columns,
  });

  layout = preserve_filler_slots(layout, old_layout);

  return {
    ...newspaper_data,
    layout,
    main_article: {
      ...newspaper_data.main_article,
      paragraphs: collect_main_paragraphs(layout),
    },
  };
}

/**
 * @returns {Object}
 */
function empty_slot() {
  return { type: 'empty' };
}

/**
 * Ensure layout grid dimensions and column arrays are consistent.
 * @param {Object} layout
 * @returns {Object}
 */
function normalize_layout_grid(layout) {
  if (!layout?.columns) return layout;

  const center_columns = layout.center_columns
    ?? layout.columns.center?.length
    ?? 2;

  const row_counts = [
    layout.columns.left?.length ?? 0,
    layout.columns.right?.length ?? 0,
    ...((layout.columns.center ?? []).map(col => col?.length ?? 0)),
  ];
  const slots_per_column = layout.slots_per_column ?? Math.max(...row_counts, 1);

  layout.center_columns = center_columns;
  layout.slots_per_column = slots_per_column;
  layout.columns.left = layout.columns.left ?? [];
  layout.columns.right = layout.columns.right ?? [];
  layout.columns.center = layout.columns.center ?? [];

  const make_empty = () => ({ type: 'empty' });

  while (layout.columns.left.length < slots_per_column) {
    layout.columns.left.push(make_empty());
  }
  while (layout.columns.right.length < slots_per_column) {
    layout.columns.right.push(make_empty());
  }
  while (layout.columns.center.length < center_columns) {
    layout.columns.center.push([]);
  }
  for (let col = 0; col < center_columns; col++) {
    layout.columns.center[col] = layout.columns.center[col] ?? [];
    while (layout.columns.center[col].length < slots_per_column) {
      layout.columns.center[col].push(make_empty());
    }
  }

  return layout;
}

/**
 * @param {Object} layout
 * @param {Object} ref — { zone: 'left'|'right'|'center', col?, row }
 * @returns {Object|null}
 */
function get_slot(layout, ref) {
  if (!layout?.columns || ref.row == null) return null;
  const { zone, col, row } = ref;
  if (zone === 'left') return layout.columns.left?.[row] ?? null;
  if (zone === 'right') return layout.columns.right?.[row] ?? null;
  if (zone === 'center') return layout.columns.center?.[col]?.[row] ?? null;
  return null;
}

/**
 * @param {Object} layout
 * @param {Object} ref
 * @param {Object} content
 * @returns {Object}
 */
function set_slot(layout, ref, content) {
  const next = normalize_layout_grid(foundry.utils.deepClone(layout));
  const { zone, col, row } = ref;
  if (!Number.isInteger(row) || row < 0 || row >= next.slots_per_column) return next;
  if (zone === 'left') next.columns.left[row] = content;
  else if (zone === 'right') next.columns.right[row] = content;
  else if (zone === 'center' && Number.isInteger(col) && col >= 0 && col < next.center_columns) {
    next.columns.center[col][row] = content;
  }
  return next;
}

/**
 * @param {Object} layout
 * @param {Object} ref_a
 * @param {Object} ref_b
 * @returns {Object}
 */
function swap_slots(layout, ref_a, ref_b) {
  const slot_a = get_slot(layout, ref_a);
  const slot_b = get_slot(layout, ref_b);
  let next = set_slot(layout, ref_a, slot_b ? sync_slot_zone_meta(slot_b, ref_a) : empty_slot());
  next = set_slot(next, ref_b, slot_a ? sync_slot_zone_meta(slot_a, ref_b) : empty_slot());
  return next;
}

/**
 * Move slot content from ref_from to ref_to; source becomes empty.
 * @param {Object} layout
 * @param {Object} ref_from
 * @param {Object} ref_to
 * @returns {Object}
 */
function move_slot(layout, ref_from, ref_to) {
  const content = get_slot(layout, ref_from);
  if (!content || content.type === 'empty') return layout;
  let next = set_slot(layout, ref_to, sync_slot_zone_meta(content, ref_to));
  next = set_slot(next, ref_from, empty_slot());
  return next;
}

/**
 * @param {Object} slot
 * @param {Object} ref
 * @returns {Object}
 */
function sync_slot_zone_meta(slot, ref) {
  if (!slot || slot.type === 'empty') return slot;
  const next = { ...slot };
  if (next.type === 'ad' || next.type === 'filler_ad') {
    next.column = ref.zone === 'center' ? 'center'
      : (ref.zone === 'right' ? 'right' : 'left');
  }
  return next;
}

/**
 * Extract side articles and ads from layout into legacy arrays.
 * Walks all grid zones so center-placed teasers and ads are included.
 * @param {Object} layout
 * @returns {{ side_articles: Array, advertisements: Array }}
 */
function extract_side_content(layout) {
  const side_articles = [];
  const advertisements = [];

  const process_slot = (slot, column) => {
    if (!slot || slot.type === 'empty') return;
    if (slot.type === 'side_article') {
      side_articles.push({
        headline: slot.headline || '',
        paragraphs: slot.paragraphs || [''],
        editor: slot.editor || '',
        continued: slot.continued || '',
        city: slot.city || '',
        state: slot.state || '',
        type: slot.type || 'crime',
      });
    } else if (slot.type === 'ad' || slot.type === 'filler_ad') {
      advertisements.push({
        id: slot.id || `ad-${advertisements.length}`,
        title: slot.title || '',
        lines: slot.lines || [],
        note: slot.note || '',
        column,
      });
    }
  };

  for (const slot of layout.columns?.left || []) {
    process_slot(slot, 'left');
  }
  for (let col = 0; col < (layout.center_columns || layout.columns?.center?.length || 0); col++) {
    for (const slot of layout.columns.center?.[col] || []) {
      process_slot(slot, 'center');
    }
  }
  for (const slot of layout.columns?.right || []) {
    process_slot(slot, 'right');
  }

  return { side_articles, advertisements };
}

/**
 * Sync layout grid back into newspaper_data arrays for viewer compatibility.
 * @param {Object} newspaper_data
 * @returns {Object}
 */
function layout_to_newspaper_data(newspaper_data) {
  const layout = newspaper_data.layout;
  if (!layout?.columns) return newspaper_data;

  const { side_articles, advertisements } = extract_side_content(layout);
  const paragraphs = collect_main_paragraphs(layout);

  let drop_cap_set = false;
  const center = layout.columns.center || [];
  for (let row = 0; row < layout.slots_per_column; row++) {
    for (let col = 0; col < layout.center_columns; col++) {
      const slot = center[col]?.[row];
      if (slot?.type === 'main_fragment') {
        slot.drop_cap = !drop_cap_set;
        if (!drop_cap_set) drop_cap_set = true;
      }
    }
  }

  return {
    ...newspaper_data,
    columns: layout.center_columns ?? newspaper_data.columns ?? 2,
    side_articles,
    advertisements,
    main_article: {
      ...newspaper_data.main_article,
      paragraphs,
    },
    layout,
  };
}

/**
 * Resize grid; preserve existing slot content where indices match.
 * @param {Object} layout
 * @param {number} center_columns
 * @param {number} slots_per_column
 * @returns {Object}
 */
function resize_layout_grid(layout, center_columns, slots_per_column) {
  const old = layout || build_scaffold_layout(1, center_columns);
  const next = build_scaffold_layout(slots_per_column, center_columns);

  const copy_zone = (zone, old_col, new_col, col_idx = 0) => {
    const old_arr = zone === 'center' ? old_col : old_col;
    const new_arr = zone === 'center' ? next.columns.center[col_idx] : new_col;
    if (!old_arr || !new_arr) return;
    const limit = Math.min(old_arr.length, new_arr.length);
    for (let row = 0; row < limit; row++) {
      const slot = zone === 'center' ? old_col[row] : old_arr[row];
      if (slot && slot.type !== 'empty') {
        new_arr[row] = { ...slot };
      }
    }
  };

  copy_zone('left', old.columns.left, next.columns.left);
  copy_zone('right', old.columns.right, next.columns.right);
  for (let c = 0; c < center_columns; c++) {
    copy_zone('center', old.columns.center?.[c], next.columns.center[c], c);
  }

  return next;
}

/**
 * @param {Object} layout
 * @param {Object} ref
 * @returns {boolean}
 */
function is_center_slot(ref) {
  return ref.zone === 'center';
}

/**
 * @param {Object} ref
 * @param {number} center_columns
 * @returns {boolean}
 */
function is_valid_slot_ref(ref, layout) {
  if (!layout || !Number.isInteger(ref?.row)) return false;
  const normalized = normalize_layout_grid(layout);
  const max_row = normalized.slots_per_column ?? 0;
  if (ref.row < 0 || ref.row >= max_row) return false;
  if (ref.zone === 'left' || ref.zone === 'right') return true;
  if (ref.zone === 'center') {
    if (!Number.isInteger(ref.col)) return false;
    const cols = normalized.center_columns ?? normalized.columns.center?.length ?? 2;
    return ref.col >= 0 && ref.col < cols;
  }
  return false;
}

/** @deprecated use rebuild_newspaper_layout */
function repack_newspaper_layout(newspaper_data) {
  return rebuild_newspaper_layout(newspaper_data);
}

export {
  calculate_slots_per_column,
  pack_column_slots,
  fill_empty_slots,
  build_scaffold_layout,
  split_into_fragments,
  collect_main_paragraphs,
  extract_main_fragments,
  resolve_main_fragments,
  rebuild_newspaper_layout,
  repack_newspaper_layout,
  empty_slots,
  empty_slot,
  normalize_layout_grid,
  get_slot,
  set_slot,
  swap_slots,
  move_slot,
  extract_side_content,
  layout_to_newspaper_data,
  resize_layout_grid,
  is_center_slot,
  is_valid_slot_ref,
};
