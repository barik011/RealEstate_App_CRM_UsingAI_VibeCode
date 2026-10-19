import { isSupabase, requireSupabase, backendError } from './supabase/client';
import { authService } from './authService';
import { storage } from '../utils/storage';
import { validateContent } from './contentRules';
import { catalogService } from './catalog';
import { crmService } from './crmService';
export const contentService = {
  async load(kind) {
    if (authService.getSession()?.role !== 'ADMIN')
      throw new Error('Administrator access is required.');
    if (isSupabase) {
      const { data, error } = await requireSupabase().rpc('website_content', {
        collection: kind,
        action: 'read',
      });
      if (error) throw backendError(error);
      return data;
    }
    return storage.get(`content-editor-${kind}`, {
      data: await catalogService.getCollection(kind),
      version: 0,
    });
  },
  async save(kind, data, version, publish = false) {
    if (authService.getSession()?.role !== 'ADMIN')
      throw new Error('Administrator access is required.');
    validateContent(kind, data);
    let result;
    if (isSupabase) {
      const response = await requireSupabase().rpc('website_content', {
        collection: kind,
        action: publish ? 'publish' : 'draft',
        payload: data,
        expected_version: version,
      });
      if (response.error) throw backendError(response.error);
      result = response.data;
    } else {
      const current = await this.load(kind);
      if (current.version !== version)
        throw new Error('Content has changed. Reload before saving.');
      if (publish && ['categories', 'locations'].includes(kind)) {
        const { properties } = await crmService.getSnapshot();
        if (
          properties.some(
            (p) =>
              !data.some((v) => v.slug === p[kind === 'categories' ? 'category' : 'locationSlug']),
          )
        )
          throw new Error('A property still uses a removed item. Update the property first.');
      }
      result = { data, version: version + 1 };
      if (!storage.set(`content-editor-${kind}`, result))
        throw new Error('Browser storage is unavailable.');
      if (publish && !storage.set(`content-public-${kind}`, data))
        throw new Error('Browser storage is unavailable.');
    }
    if (publish) window.dispatchEvent(new Event('website-content-updated'));
    return result;
  },
};
