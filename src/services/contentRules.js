export const CONTENT_FIELDS = {
  categories: [
    ['slug', 'URL slug'],
    ['name', 'Name'],
    ['description', 'Description', 'textarea'],
    ['image', 'Image URL', 'url'],
  ],
  locations: [
    ['slug', 'URL slug'],
    ['name', 'Name'],
    ['tagline', 'Tagline'],
    ['description', 'Description', 'textarea'],
    ['image', 'Image URL', 'url'],
  ],
  articles: [
    ['slug', 'URL slug'],
    ['title', 'Title'],
    ['category', 'Category'],
    ['date', 'Publication date', 'date'],
    ['image', 'Image URL', 'url'],
    ['excerpt', 'Excerpt', 'textarea'],
    ['paragraphs', 'Article paragraphs (one per line)', 'lines'],
  ],
  testimonials: [
    ['name', 'Client name'],
    ['role', 'Client description'],
    ['quote', 'Quote', 'textarea'],
    ['avatar', 'Avatar URL', 'url'],
  ],
};
export const CONTENT_LABELS = {
  site: 'Homepage & website',
  locations: 'Communities',
  categories: 'Property categories',
  articles: 'Journal articles',
  testimonials: 'Testimonials',
};
export function validateContent(kind, data) {
  if (!Object.hasOwn(CONTENT_LABELS, kind)) throw new Error('Unknown content collection.');
  if (JSON.stringify(data).length > 500000) throw new Error('Content is too large.');
  const url = (value) => {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  };
  if (kind === 'site') {
    if (
      data?.dubaiHighlights !== undefined &&
      (!Array.isArray(data.dubaiHighlights) ||
        data.dubaiHighlights.length > 12 ||
        data.dubaiHighlights.some(
          (item) =>
            !item ||
            typeof item.title !== 'string' ||
            !item.title.trim() ||
            item.title.length > 120 ||
            typeof item.description !== 'string' ||
            !item.description.trim() ||
            item.description.length > 500 ||
            ![
              'globe',
              'business',
              'building',
              'waterfront',
              'key',
              'home',
              'community',
              'growth',
            ].includes(item.icon),
        ))
    )
      throw new Error(
        'Each highlight needs an icon, title (up to 120 characters) and description (up to 500 characters).',
      );
    if (
      !data ||
      Array.isArray(data) ||
      !data.brand?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
      !data.phone?.trim()
    )
      throw new Error('Enter a brand, email and phone.');
    if (
      !Array.isArray(data.heroImages) ||
      !data.heroImages.length ||
      data.heroImages.length > 10 ||
      data.heroImages.some((v) => !url(v))
    )
      throw new Error('Provide 1–10 HTTPS hero image URLs.');
    if (
      !Number.isInteger(data.paginationSize) ||
      data.paginationSize < 3 ||
      data.paginationSize > 30
    )
      throw new Error('Properties per page must be 3–30.');
    if (Object.values(data.socials || {}).some((v) => !url(v)))
      throw new Error('Social links must use HTTPS.');
    return data;
  }
  if (!Array.isArray(data) || data.length > 100)
    throw new Error('Use at most 100 items per collection.');
  const keys = new Set();
  for (const item of data) {
    for (const [key, label, type] of CONTENT_FIELDS[kind]) {
      if (type === 'lines') {
        if (
          !Array.isArray(item[key]) ||
          !item[key].length ||
          item[key].some((v) => typeof v !== 'string' || !v.trim())
        )
          throw new Error(`${label} is required.`);
      } else if (typeof item[key] !== 'string' || !item[key].trim() || item[key].length > 20000)
        throw new Error(`${label} is required (maximum 20,000 characters).`);
      if (type === 'url' && !url(item[key])) throw new Error(`${label} must use HTTPS.`);
    }
    const key = kind === 'testimonials' ? String(item.id) : item.slug;
    if (!key || keys.has(key)) throw new Error('Each item needs a unique identifier.');
    if (kind !== 'testimonials' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key))
      throw new Error('Use lowercase letters, numbers and hyphens in URL slugs.');
    keys.add(key);
  }
  return data;
}
