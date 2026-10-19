import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateContent } from '../src/services/contentRules.js';
test('website content validation rejects duplicate slugs and unsafe public links', () => {
  const item = {
    slug: 'community',
    name: 'Community',
    description: 'Description',
    image: 'https://example.com/image.jpg',
  };
  assert.equal(validateContent('categories', [item]).length, 1);
  assert.throws(() => validateContent('categories', [item, item]), /unique/);
  assert.throws(
    () => validateContent('categories', [{ ...item, image: 'javascript:alert(1)' }]),
    /HTTPS/,
  );
  const site = JSON.parse(readFileSync('src/data/site.json', 'utf8'));
  assert.equal(validateContent('site', site).brand, site.brand);
  assert.throws(
    () => validateContent('site', { ...site, paginationSize: 0 }),
    /Properties per page/,
  );
  assert.throws(
    () => validateContent('site', { ...site, socials: { instagram: 'javascript:alert(1)' } }),
    /HTTPS/,
  );
});
