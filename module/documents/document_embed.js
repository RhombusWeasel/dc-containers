/**
 * Shared URL embed helper.
 */

function build_embed_url(url) {
  url = (url || '').trim();
  if (!url) return '';
  if (url.includes('archive.org/details/')) {
    return url.replace('archive.org/details/', 'archive.org/embed/');
  }
  if (url.includes('archive.org/embed/')) return url;
  return url;
}

export { build_embed_url };
