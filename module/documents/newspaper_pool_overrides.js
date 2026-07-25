/**
 * World-scoped fragment pool overrides for campaign newspaper localization.
 */

import {
  get_effective_list,
  get_list_meta,
  is_custom_list_entry,
  save_list_entry,
  delete_list_entry,
  reset_list,
  register_list_setting,
  truncate_preview,
} from './newspaper_list_store.js';

const SETTING_KEY = 'newspaper_fragment_pools';

const SIDE_POOL_DEFS = [
  { key: 'flavour_headlines', label_key: 'editor_pool_side_headline' },
  { key: 'flavour_starts', label_key: 'editor_pool_side_body' },
  { key: 'continued_phrases', label_key: 'editor_pool_side_continued' },
];

const MAIN_MIDDLE_LABELS = {
  main_fragments_witness: 'editor_pool_role_witness',
  main_fragments_officer: 'editor_pool_role_officer',
};

let _get_default_pool = () => [];
let _fragment_structure = null;

function localize(key) {
  return game.i18n.localize(`dc.containers.doc.${key}`);
}

/**
 * @param {{ get_default_pool: (key: string) => string[], fragment_structure: Object }} sources
 */
function register_pool_sources(sources) {
  _get_default_pool = sources.get_default_pool;
  _fragment_structure = sources.fragment_structure;
}

function register_fragment_pool_setting() {
  register_list_setting(SETTING_KEY, 'Newspaper Fragment Pools');
}

function _default_for_key(pool_key) {
  return () => _get_default_pool(pool_key) || [];
}

/**
 * @param {string} pool_key
 * @returns {string[]}
 */
function get_effective_pool(pool_key) {
  return get_effective_list(SETTING_KEY, pool_key, (key) => _get_default_pool(key) || []);
}

/**
 * @param {string} pool_key
 * @returns {{ default_count: number, total: number, has_override: boolean }}
 */
function get_pool_meta(pool_key) {
  return get_list_meta(SETTING_KEY, pool_key, (key) => _get_default_pool(key) || []);
}

/**
 * @returns {boolean}
 */
function is_custom_entry(pool_key, index) {
  return is_custom_list_entry(SETTING_KEY, pool_key, index, (key) => _get_default_pool(key) || []);
}

/**
 * @param {string} pool_key
 * @param {number|null} index — null to append
 * @param {string} text
 */
async function save_pool_entry(pool_key, index, text) {
  return save_list_entry(SETTING_KEY, pool_key, (key) => _get_default_pool(key) || [], index, text);
}

/**
 * @param {string} pool_key
 * @param {number} index
 */
async function delete_pool_entry(pool_key, index) {
  return delete_list_entry(SETTING_KEY, pool_key, (key) => _get_default_pool(key) || [], index);
}

/**
 * @param {string} pool_key
 */
async function reset_pool(pool_key) {
  return reset_list(SETTING_KEY, pool_key);
}

/**
 * @returns {Array<{ id: string, label: string }>}
 */
function list_fragment_types() {
  return [
    { id: 'main', label: localize('editor_pool_type_main') },
    { id: 'side', label: localize('editor_pool_type_side') },
  ];
}

/**
 * @returns {Array<{ id: string, label: string }>}
 */
function list_genres() {
  if (!_fragment_structure) return [];
  return Object.keys(_fragment_structure).map((id) => ({
    id,
    label: localize(`editor_pool_genre_${id}`) || id.charAt(0).toUpperCase() + id.slice(1),
  }));
}

/**
 * @param {string} fragment_type — 'main' | 'side'
 * @param {string} [genre]
 * @returns {Array<{ key: string, label: string }>}
 */
function list_pools_for_selection(fragment_type, genre) {
  if (fragment_type === 'side') {
    return SIDE_POOL_DEFS.map((def) => ({
      key: def.key,
      label: localize(def.label_key),
    }));
  }

  const structure = _fragment_structure?.[genre];
  if (!structure) return [];

  const pools = [];
  pools.push({
    key: structure.start,
    label: localize('editor_pool_role_start'),
  });
  for (const pool_key of structure.middle || []) {
    const label_key = MAIN_MIDDLE_LABELS[pool_key];
    const suffix = pool_key.replace(/^main_fragments_/, '').replace(`${genre}_`, '').replace(/_/g, ' ');
    pools.push({
      key: pool_key,
      label: label_key ? localize(label_key) : suffix,
    });
  }
  pools.push({
    key: structure.end,
    label: localize('editor_pool_role_end'),
  });
  return pools;
}

export {
  register_pool_sources,
  register_fragment_pool_setting,
  get_effective_pool,
  get_pool_meta,
  is_custom_entry,
  save_pool_entry,
  delete_pool_entry,
  reset_pool,
  list_fragment_types,
  list_genres,
  list_pools_for_selection,
  truncate_preview,
  SETTING_KEY,
};
