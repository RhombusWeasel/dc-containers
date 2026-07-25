/**
 * Built-in and registered newspaper advertisement selection.
 */

import { BUILTIN_ADS } from './newspaper_ads_builtin.js';

function pick_weighted(rng, pool) {
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, c) => sum + (c.weight ?? 10), 0);
  let r = rng() * total;
  for (const c of pool) {
    r -= (c.weight ?? 10);
    if (r <= 0) return c;
  }
  return pool[pool.length - 1];
}

/**
 * Select an advertisement from registered content + built-in fallbacks.
 * @param {Function} rng
 * @param {Object} [filters]
 * @param {Array} [registered_ads]
 * @returns {Object|null}
 */
function select_advertisement(rng, filters, registered_ads = []) {
  let pool = [...registered_ads, ...BUILTIN_ADS];

  if (filters?.ids) {
    pool = pool.filter(a => filters.ids.includes(a.id));
  }
  if (filters?.sources) {
    pool = pool.filter(a => filters.sources.includes(a.source));
  }
  if (filters?.exclude_ids?.size > 0) {
    pool = pool.filter(a => !filters.exclude_ids.has(a.id));
  }

  const ad = pick_weighted(rng, pool);
  if (!ad) return null;

  const content = ad.render({ rng });
  return { id: ad.id, ...content };
}

export { BUILTIN_ADS, select_advertisement };
