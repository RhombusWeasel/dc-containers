/**
 * Shared document data field definitions, defaults, and legacy migration.
 */

const DOCUMENT_DATA_KEYS = {
  newspaper: 'newspaper_data',
  wanted_poster: 'wanted_poster_data',
  letter: 'letter_data',
  journal: 'journal_data',
  ledger: 'ledger_data',
  map: 'map_data',
  book: 'book_data',
  web_page: 'web_page_data',
  other: 'other_data',
};

function document_data_defaults() {
  return {
    newspaper_data: null,
    wanted_poster_data: null,
    letter_data: null,
    journal_data: null,
    ledger_data: null,
    map_data: null,
    book_data: null,
    web_page_data: null,
    other_data: null,
  };
}

function truncate_preview(text, max = 30) {
  const str = (text ?? '').toString().trim();
  if (!str) return '';
  if (str.length <= max) return str;
  return `${str.substring(0, max)}...`;
}

function create_wanted_poster_data(overrides = {}) {
  return {
    name: '',
    alias: '',
    crime: '',
    details: '',
    description: '',
    reward: '',
    contact: '',
    portrait: '',
    ...overrides,
  };
}

function create_letter_data(overrides = {}) {
  return {
    date: '',
    sender: '',
    recipient: '',
    salutation: '',
    body: [],
    closing: '',
    signature: '',
    stationery: 'formal',
    ...overrides,
  };
}

function create_journal_data(overrides = {}) {
  return {
    title: '',
    author: '',
    entries: [],
    ...overrides,
  };
}

function create_journal_entry(overrides = {}) {
  return { date: '', title: '', body: '', ...overrides };
}

function create_ledger_data(overrides = {}) {
  return {
    account_name: '',
    period: '',
    currency_label: '$',
    rows: [],
    ...overrides,
  };
}

function create_ledger_row(overrides = {}) {
  return { date: '', description: '', debit: '', credit: '', balance: '', ...overrides };
}

function create_map_data(overrides = {}) {
  return {
    image: '',
    title: '',
    scale_label: '',
    markers: [],
    ...overrides,
  };
}

function create_map_marker(overrides = {}) {
  return { x_pct: 50, y_pct: 50, label: '', icon: 'fa-location-dot', ...overrides };
}

function create_book_data(overrides = {}) {
  return {
    url: '',
    title: '',
    author: '',
    default_page: '',
    notes: '',
    ...overrides,
  };
}

function create_web_page_data(overrides = {}) {
  return {
    url: '',
    title: '',
    notes: '',
    ...overrides,
  };
}

function create_other_data(overrides = {}) {
  return {
    title: '',
    body: '',
    style: 'plain',
    ...overrides,
  };
}

function body_to_paragraphs(text) {
  if (!text) return [];
  if (Array.isArray(text)) return text.filter(Boolean);
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
}

function paragraphs_to_body(paragraphs) {
  return (paragraphs || []).join('\n\n');
}

function migrate_wanted_poster_data(item) {
  if (item.wanted_poster_data) return foundry.utils.deepClone(item.wanted_poster_data);
  return create_wanted_poster_data({
    name: item.label || '',
    description: item.text_content || '',
    portrait: item.image || '',
  });
}

function migrate_letter_data(item) {
  if (item.letter_data) return foundry.utils.deepClone(item.letter_data);
  return create_letter_data({
    body: body_to_paragraphs(item.text_content),
    signature: item.label || '',
  });
}

function migrate_journal_data(item) {
  if (item.journal_data) return foundry.utils.deepClone(item.journal_data);
  const entries = item.text_content
    ? [create_journal_entry({ title: item.label || '', body: item.text_content })]
    : [];
  return create_journal_data({ title: item.label || '', entries });
}

function migrate_ledger_data(item) {
  if (item.ledger_data) return foundry.utils.deepClone(item.ledger_data);
  return create_ledger_data({ account_name: item.label || '' });
}

function migrate_map_data(item) {
  if (item.map_data) return foundry.utils.deepClone(item.map_data);
  return create_map_data({
    image: item.image || '',
    title: item.label || '',
  });
}

function migrate_book_data(item) {
  if (item.book_data) return foundry.utils.deepClone(item.book_data);
  // Migrate legacy sourcebook_data if present
  if (item.sourcebook_data) return foundry.utils.deepClone(item.sourcebook_data);
  return create_book_data({
    url: item.url || '',
    title: item.label || '',
  });
}

function migrate_web_page_data(item) {
  if (item.web_page_data) return foundry.utils.deepClone(item.web_page_data);
  return create_web_page_data({
    url: item.url || '',
    title: item.label || '',
  });
}

function migrate_other_data(item) {
  if (item.other_data) return foundry.utils.deepClone(item.other_data);
  return create_other_data({
    title: item.label || '',
    body: item.text_content || '',
  });
}

const MIGRATE_BY_CATEGORY = {
  wanted_poster: migrate_wanted_poster_data,
  letter: migrate_letter_data,
  journal: migrate_journal_data,
  ledger: migrate_ledger_data,
  map: migrate_map_data,
  book: migrate_book_data,
  web_page: migrate_web_page_data,
  other: migrate_other_data,
};

function migrate_category_data(category, item) {
  const migrate = MIGRATE_BY_CATEGORY[category];
  return migrate ? migrate(item) : null;
}

function preview_for_category(category, data) {
  if (!data) return '';
  switch (category) {
    case 'wanted_poster':
      return truncate_preview(data.name || data.crime);
    case 'letter':
      return truncate_preview(data.recipient || data.sender);
    case 'journal':
      return truncate_preview(data.title || data.entries?.[0]?.title);
    case 'ledger':
      return truncate_preview(data.account_name);
    case 'map':
      return truncate_preview(data.title);
    case 'book':
      return truncate_preview(data.title || data.url);
    case 'web_page':
      return truncate_preview(data.title || data.url);
    case 'other':
      return truncate_preview(data.title);
    default:
      return '';
  }
}

export {
  DOCUMENT_DATA_KEYS,
  document_data_defaults,
  truncate_preview,
  create_wanted_poster_data,
  create_letter_data,
  create_journal_data,
  create_journal_entry,
  create_ledger_data,
  create_ledger_row,
  create_map_data,
  create_map_marker,
  create_book_data,
  create_web_page_data,
  create_other_data,
  body_to_paragraphs,
  paragraphs_to_body,
  migrate_wanted_poster_data,
  migrate_letter_data,
  migrate_journal_data,
  migrate_ledger_data,
  migrate_map_data,
  migrate_book_data,
  migrate_web_page_data,
  migrate_other_data,
  migrate_category_data,
  preview_for_category,
};
