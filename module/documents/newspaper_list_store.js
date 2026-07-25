/**
 * Shared world-scoped string-list override storage (fragments + value lists).
 */

const MODULE_ID = 'dc-containers';

function _read_setting(setting_key) {
  return foundry.utils.deepClone(game.settings.get(MODULE_ID, setting_key) || {});
}

async function _write_setting(setting_key, overrides) {
  await game.settings.set(MODULE_ID, setting_key, overrides);
}

/**
 * @param {string} setting_key
 * @param {string} list_key
 * @param {() => string[]} get_default
 * @returns {string[]}
 */
function get_effective_list(setting_key, list_key, get_default) {
  const base = get_default(list_key);
  const overrides = game.settings.get(MODULE_ID, setting_key) || {};
  const entry = overrides[list_key];
  if (!entry) return [...base];
  if (Array.isArray(entry.replaced)) return [...entry.replaced];
  const added = Array.isArray(entry.added) ? entry.added : [];
  return [...base, ...added];
}

/**
 * @param {string} setting_key
 * @param {string} list_key
 * @param {() => string[]} get_default
 */
function get_list_meta(setting_key, list_key, get_default) {
  const default_count = (get_default(list_key) || []).length;
  const total = get_effective_list(setting_key, list_key, get_default).length;
  const overrides = game.settings.get(MODULE_ID, setting_key) || {};
  return {
    default_count,
    total,
    has_override: !!overrides[list_key],
  };
}

/**
 * @returns {boolean}
 */
function is_custom_list_entry(setting_key, list_key, index, get_default) {
  const meta = get_list_meta(setting_key, list_key, get_default);
  return index >= meta.default_count;
}

function _materialize_list(setting_key, overrides, list_key, get_default) {
  const current = get_effective_list(setting_key, list_key, get_default);
  overrides[list_key] = { replaced: [...current] };
  return current;
}

/**
 * @param {string} setting_key
 * @param {string} list_key
 * @param {() => string[]} get_default
 * @param {number|null} index
 * @param {string} text
 */
async function save_list_entry(setting_key, list_key, get_default, index, text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return false;

  const overrides = _read_setting(setting_key);
  const entry = overrides[list_key];

  if (index == null || index < 0) {
    if (!entry) {
      overrides[list_key] = { added: [trimmed] };
    } else if (Array.isArray(entry.replaced)) {
      entry.replaced.push(trimmed);
    } else {
      entry.added = [...(entry.added || []), trimmed];
    }
    await _write_setting(setting_key, overrides);
    return true;
  }

  const current = _materialize_list(setting_key, overrides, list_key, get_default);
  if (index >= current.length) {
    current.push(trimmed);
  } else {
    current[index] = trimmed;
  }
  overrides[list_key] = { replaced: current };
  await _write_setting(setting_key, overrides);
  return true;
}

/**
 * @param {string} setting_key
 * @param {string} list_key
 * @param {() => string[]} get_default
 * @param {number} index
 */
async function delete_list_entry(setting_key, list_key, get_default, index) {
  const overrides = _read_setting(setting_key);
  const current = _materialize_list(setting_key, overrides, list_key, get_default);
  if (index < 0 || index >= current.length) return false;
  current.splice(index, 1);
  if (current.length === 0) {
    delete overrides[list_key];
  } else {
    overrides[list_key] = { replaced: current };
  }
  await _write_setting(setting_key, overrides);
  return true;
}

/**
 * @param {string} setting_key
 * @param {string} list_key
 */
async function reset_list(setting_key, list_key) {
  const overrides = _read_setting(setting_key);
  delete overrides[list_key];
  await _write_setting(setting_key, overrides);
}

function register_list_setting(setting_key, name) {
  game.settings.register(MODULE_ID, setting_key, {
    name,
    scope: 'world',
    config: false,
    type: Object,
    default: {},
  });
}

function truncate_preview(text, max_len = 72) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max_len) return flat;
  return `${flat.slice(0, max_len - 1)}…`;
}

export {
  get_effective_list,
  get_list_meta,
  is_custom_list_entry,
  save_list_entry,
  delete_list_entry,
  reset_list,
  register_list_setting,
  truncate_preview,
};
