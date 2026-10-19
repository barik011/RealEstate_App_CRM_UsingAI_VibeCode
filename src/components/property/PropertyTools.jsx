import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePropertyTools } from '../../hooks/usePropertyTools';
import { useLanguage } from '../../i18n/LanguageProvider';
import { siteConfig } from '../../config/siteConfig';
import { useToast } from '../ui';
export function CompareButton({ property }) {
  const [ids, save] = usePropertyTools('compare-properties');
  const { t } = useLanguage();
  const toast = useToast();
  if (siteConfig.compareEnabled === false) return null;
  const selected = ids.includes(property.id);
  return (
    <button
      className="compare-toggle"
      aria-pressed={selected}
      onClick={() => {
        try {
          if (!selected && ids.length >= 3) {
            toast(t('Compare up to three properties. Remove one to add another.'));
            return;
          }
          save(selected ? ids.filter((id) => id !== property.id) : [...ids, property.id]);
        } catch (e) {
          toast(t(e.message));
        }
      }}
    >
      {t(selected ? 'Added to comparison' : 'Compare property')}
    </button>
  );
}
export function SearchTools({ filters, onRestore }) {
  const [ids] = usePropertyTools('compare-properties');
  const [searches, save] = usePropertyTools('saved-searches');
  const [name, setName] = useState('');
  const { t } = useLanguage();
  const toast = useToast();
  return (
    <section className="search-tools" aria-label={t('Property search tools')}>
      {siteConfig.compareEnabled !== false && (
        <Link className="button button-outline" to="/compare">
          {t('Compare properties')} ({ids.length})
        </Link>
      )}
      {siteConfig.savedSearchesEnabled !== false && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const next = {
                  id: crypto.randomUUID(),
                  name: name.trim(),
                  filters: {
                    ...filters,
                    ...Object.fromEntries(new URLSearchParams(window.location.search)),
                    page: undefined,
                  },
                };
                if (!next.name) return;
                save([next, ...searches].slice(0, 10));
                setName('');
                toast(t('Search saved on this device.'));
              } catch (e) {
                toast(t(e.message));
              }
            }}
          >
            <label>
              {t('Search name')}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={60}
              />
            </label>
            <button className="button" type="submit">
              {t('Save this search')}
            </button>
          </form>
          <small>{t('Saved on this device. Email alerts are not enabled.')}</small>
          {searches.length > 0 && (
            <ul className="saved-search-list">
              {searches.map((s) => (
                <li key={s.id}>
                  <button onClick={() => onRestore(s.filters)}>{s.name}</button>
                  <button
                    aria-label={t('Remove saved search')}
                    onClick={() => {
                      try {
                        save(searches.filter((v) => v.id !== s.id));
                      } catch (e) {
                        toast(t(e.message));
                      }
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
