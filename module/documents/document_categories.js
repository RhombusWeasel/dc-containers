/**
 * Document category definitions and category → content_type mapping.
 */

const CATEGORY_CONTENT_TYPE = {
  sourcebook: 'ia_book',
  journal: 'text',
  ledger: 'text',
  letter: 'text',
  wanted_poster: 'image',
  map: 'image',
  newspaper: 'newspaper',
  web_page: 'url',
  other: 'text',
};

const DOCUMENT_CATEGORY_KEYS = Object.keys(CATEGORY_CONTENT_TYPE);

function document_category_options() {
  return Object.fromEntries(DOCUMENT_CATEGORY_KEYS.map((key) => [key, {}]));
}

function content_type_for_category(category) {
  return CATEGORY_CONTENT_TYPE[category] ?? 'text';
}

function normalize_document_data(data) {
  if (!data) return data;
  data.content_type = content_type_for_category(data.category);
  return data;
}

export {
  document_category_options,
  content_type_for_category,
  normalize_document_data,
};
