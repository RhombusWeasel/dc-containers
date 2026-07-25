/**
 * Container catalog — gear catalog entries plus documents for container loot.
 */

const CATEGORIES = {
  ammo: "dc.gear.ammo",
  armour: "dc.gear.armour",
  melee: "dc.gear.melee",
  ranged: "dc.gear.ranged",
  thrown: "dc.gear.thrown",
  explosives: "dc.gear.explosives",
  misc: "dc.gear.misc",
  goods: "dc.gear.goods",
  services: "dc.gear.services",
  documents: "dc.containers.doc.header",
};

function is_gear_item(value) {
  return value && typeof value === "object" && "label" in value;
}

function* iterate_container_catalog(gear = game.dc.system?.gear) {
  if (!gear) {
    return;
  }

  for (const entry of game.dc.gear_catalog.iterate_catalog(gear)) {
    yield entry;
  }

  const documents = gear.documents;
  if (!documents || typeof documents !== "object") {
    return;
  }

  for (const [key, item] of Object.entries(documents)) {
    if (is_gear_item(item)) {
      yield { path: `documents.${key}`, key, category: "documents", item };
    }
  }
}

function get_container_item(path) {
  return game.dc.gear_catalog.get_catalog_item(path)
    ?? game.dc.utils.data_from_path(game.dc.system.gear, path);
}

function get_qty(contents, path) {
  const entry = game.dc.utils.data_from_path(contents, path);
  if (!entry) return 0;
  return entry.qty ?? 0;
}

function count_selected_items(contents) {
  let count = 0;
  walk_contents(contents, (_path, entry) => {
    if ((entry.qty ?? 0) > 0) count++;
  });
  return count;
}

function walk_contents(contents, fn, prefix = "") {
  if (!contents || typeof contents !== "object") return;
  for (const [key, value] of Object.entries(contents)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && "qty" in value) {
      fn(path, value);
    } else if (value && typeof value === "object") {
      walk_contents(value, fn, path);
    }
  }
}

function build_catalog_sections(contents = {}) {
  const sections = [];

  for (const [cat_key, cat_label] of Object.entries(CATEGORIES)) {
    const items = [];
    for (const entry of iterate_container_catalog()) {
      if (entry.category !== cat_key) continue;
      const label = entry.item?.label || entry.key;
      items.push({
        path: entry.path,
        label,
        cost: entry.item?.cost ?? 0,
        qty: get_qty(contents, entry.path),
        search: String(label).toLowerCase(),
      });
    }
    if (items.length === 0) continue;
    sections.push({
      key: cat_key,
      label: game.i18n.localize(cat_label),
      items,
    });
  }

  return sections;
}

const container_catalog = {
  CATEGORIES,
  iterate_container_catalog,
  get_container_item,
  get_qty,
  count_selected_items,
  walk_contents,
  build_catalog_sections,
};

export { container_catalog };
