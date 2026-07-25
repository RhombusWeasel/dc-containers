/**
 * World-scoped value lists for newspaper generation (cities, animals, etc.).
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

const SETTING_KEY = 'newspaper_value_lists';

const TERRITORIES = ['Northern', 'Southern', 'Disputed'];

const VALUE_LIST_CATEGORIES = [
  {
    id: 'location',
    label_key: 'editor_values_cat_location',
    lists: [
      { id: 'states', label_key: 'editor_values_states', nested: 'territory' },
      { id: 'cities', label_key: 'editor_values_cities', nested: 'state' },
    ],
  },
  {
    id: 'subjects',
    label_key: 'editor_values_cat_subjects',
    lists: [
      { id: 'animals', label_key: 'editor_values_animals' },
      { id: 'buildings', label_key: 'editor_values_buildings' },
      { id: 'contraband', label_key: 'editor_values_contraband' },
      { id: 'products', label_key: 'editor_values_products' },
      { id: 'fraud', label_key: 'editor_values_fraud' },
      { id: 'colours', label_key: 'editor_values_colours' },
    ],
  },
  {
    id: 'crime',
    label_key: 'editor_values_cat_crime',
    lists: [
      { id: 'crime_list', label_key: 'editor_values_crime_list', format: 'crime' },
      { id: 'sentences', label_key: 'editor_values_sentences' },
      { id: 'numbers', label_key: 'editor_values_numbers' },
    ],
  },
  {
    id: 'phrases',
    label_key: 'editor_values_cat_phrases',
    lists: [
      { id: 'captures', label_key: 'editor_values_captures' },
      { id: 'captured', label_key: 'editor_values_captured' },
      { id: 'cunning', label_key: 'editor_values_cunning' },
      { id: 'dastardly', label_key: 'editor_values_dastardly' },
      { id: 'spooky_possessions', label_key: 'editor_values_spooky' },
      { id: 'reporter_insults', label_key: 'editor_values_reporter_insults' },
      { id: 'pleas_for_order', label_key: 'editor_values_pleas' },
    ],
  },
  {
    id: 'people',
    label_key: 'editor_values_cat_people',
    lists: [
      { id: 'professions', label_key: 'editor_values_professions' },
      { id: 'officer_ranks', label_key: 'editor_values_officer_ranks' },
    ],
  },
  {
    id: 'weather',
    label_key: 'editor_values_cat_weather',
    lists: [
      { id: 'weather_conditions', label_key: 'editor_values_weather_conditions' },
      { id: 'weather_temperatures', label_key: 'editor_values_weather_temperatures' },
      { id: 'weather_forecasts', label_key: 'editor_values_weather_forecasts' },
      { id: 'weather_years', label_key: 'editor_values_weather_years' },
      { id: 'weather_damages', label_key: 'editor_values_weather_damages' },
      { id: 'weather_livestock', label_key: 'editor_values_weather_livestock' },
    ],
  },
  {
    id: 'market',
    label_key: 'editor_values_cat_market',
    lists: [
      { id: 'market_price_values', label_key: 'editor_values_market_prices' },
      { id: 'price_numbers', label_key: 'editor_values_price_numbers' },
      { id: 'paper_prices', label_key: 'editor_values_paper_prices' },
    ],
  },
  {
    id: 'social',
    label_key: 'editor_values_cat_social',
    lists: [
      { id: 'social_events', label_key: 'editor_values_social_events' },
    ],
  },
  {
    id: 'notice',
    label_key: 'editor_values_cat_notice',
    lists: [
      { id: 'notice_types', label_key: 'editor_values_notice_types' },
      { id: 'rewards', label_key: 'editor_values_rewards' },
      { id: 'notice_sign_offs', label_key: 'editor_values_notice_sign_offs' },
    ],
  },
  {
    id: 'paper',
    label_key: 'editor_values_cat_paper',
    lists: [
      { id: 'paper_name_adjectives', label_key: 'editor_values_paper_adjectives' },
      { id: 'paper_name_nouns', label_key: 'editor_values_paper_nouns' },
    ],
  },
];

let _get_default_data = () => ({});

function localize(key) {
  return game.i18n.localize(`dc.containers.doc.${key}`);
}

/**
 * @param {{ get_default_data: () => Object }} sources
 */
function register_value_list_sources(sources) {
  _get_default_data = sources.get_default_data;
}

function register_value_list_setting() {
  register_list_setting(SETTING_KEY, 'Newspaper Value Lists');
}

function _data() {
  return _get_default_data();
}

/**
 * @param {string} list_id
 * @param {string} [parent_id]
 * @returns {string}
 */
function compose_list_key(list_id, parent_id) {
  if (list_id === 'states' && parent_id) return `states:${parent_id}`;
  if (list_id === 'cities' && parent_id) return `cities:${parent_id}`;
  return list_id;
}

/**
 * @param {string} list_key
 * @returns {string[]}
 */
function get_default_value_list(list_key) {
  const data = _data();
  if (list_key.startsWith('states:')) {
    const territory = list_key.slice(7);
    return [...(data.states?.[territory] || [])];
  }
  if (list_key.startsWith('cities:')) {
    const state = list_key.slice(7);
    return [...(data.cities?.[state] || [])];
  }
  if (list_key === 'crime_list') {
    return (data.crime_list || []).map((entry) => `${entry.headline}|${entry.article}`);
  }
  const pool = data[list_key];
  return Array.isArray(pool) ? [...pool] : [];
}

/**
 * @param {string} list_key
 * @returns {string[]}
 */
function get_effective_value_list(list_key) {
  return get_effective_list(SETTING_KEY, list_key, get_default_value_list);
}

/**
 * @param {string} list_key
 * @returns {{ default_count: number, total: number, has_override: boolean }}
 */
function get_value_list_meta(list_key) {
  return get_list_meta(SETTING_KEY, list_key, get_default_value_list);
}

/**
 * @returns {boolean}
 */
function is_custom_value_entry(list_key, index) {
  return is_custom_list_entry(SETTING_KEY, list_key, index, get_default_value_list);
}

/**
 * @param {string} list_key
 * @param {number|null} index
 * @param {string} text
 */
async function save_value_list_entry(list_key, index, text) {
  return save_list_entry(SETTING_KEY, list_key, get_default_value_list, index, text);
}

/**
 * @param {string} list_key
 * @param {number} index
 */
async function delete_value_list_entry(list_key, index) {
  return delete_list_entry(SETTING_KEY, list_key, get_default_value_list, index);
}

/**
 * @param {string} list_key
 */
async function reset_value_list(list_key) {
  return reset_list(SETTING_KEY, list_key);
}

/**
 * @returns {Array<{ headline: string, article: string }>}
 */
function get_effective_crime_list() {
  return get_effective_value_list('crime_list').map((line) => {
    if (line && typeof line === 'object') return line;
    const pipe = String(line).indexOf('|');
    if (pipe < 0) return { headline: String(line).trim(), article: '' };
    return {
      headline: String(line).slice(0, pipe).trim(),
      article: String(line).slice(pipe + 1).trim(),
    };
  }).filter((entry) => entry.headline);
}

/**
 * @param {string} territory
 * @returns {string[]}
 */
function get_effective_states(territory) {
  return get_effective_value_list(`states:${territory}`);
}

/**
 * @param {string} state
 * @returns {string[]}
 */
function get_effective_cities(state) {
  const cities = get_effective_value_list(`cities:${state}`);
  return cities.length ? cities : ['Unknown'];
}

/**
 * @returns {string[]}
 */
function list_all_territories() {
  return [...TERRITORIES];
}

/**
 * @returns {string[]}
 */
function list_all_states() {
  const states = new Set();
  for (const territory of TERRITORIES) {
    for (const state of get_effective_states(territory)) {
      states.add(state);
    }
  }
  const data = _data();
  for (const state of Object.keys(data.cities || {})) {
    states.add(state);
  }
  return [...states].sort((a, b) => a.localeCompare(b));
}

/**
 * @returns {Array<{ id: string, label: string, lists: Array<Object> }>}
 */
function list_value_categories() {
  return VALUE_LIST_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: localize(cat.label_key),
    lists: cat.lists.map((list) => ({
      id: list.id,
      label: localize(list.label_key),
      nested: list.nested || null,
      format: list.format || 'plain',
    })),
  }));
}

/**
 * @param {string} category_id
 * @returns {Array<Object>}
 */
function list_defs_for_category(category_id) {
  const cat = VALUE_LIST_CATEGORIES.find((c) => c.id === category_id);
  if (!cat) return [];
  return cat.lists.map((list) => ({
    id: list.id,
    label: localize(list.label_key),
    nested: list.nested || null,
    format: list.format || 'plain',
  }));
}

/**
 * @param {string} nested — 'territory' | 'state'
 * @returns {Array<{ id: string, label: string }>}
 */
function list_nested_parents(nested) {
  if (nested === 'territory') {
    return TERRITORIES.map((id) => ({ id, label: id }));
  }
  if (nested === 'state') {
    return list_all_states().map((id) => ({ id, label: id }));
  }
  return [];
}

/**
 * @param {string} list_id
 * @returns {Object|null}
 */
function find_list_def(list_id) {
  for (const cat of VALUE_LIST_CATEGORIES) {
    const list = cat.lists.find((l) => l.id === list_id);
    if (list) return { ...list, format: list.format || 'plain' };
  }
  return null;
}

export {
  register_value_list_sources,
  register_value_list_setting,
  get_effective_value_list,
  get_effective_crime_list,
  get_effective_states,
  get_effective_cities,
  get_value_list_meta,
  is_custom_value_entry,
  save_value_list_entry,
  delete_value_list_entry,
  reset_value_list,
  list_value_categories,
  list_defs_for_category,
  list_nested_parents,
  list_all_territories,
  list_all_states,
  compose_list_key,
  find_list_def,
  truncate_preview,
  SETTING_KEY,
};
