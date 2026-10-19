import { Link } from 'react-router-dom';
import { useCatalog } from '../hooks/useCatalog';
import { usePropertyTools } from '../hooks/usePropertyTools';
import { useLanguage } from '../i18n/LanguageProvider';
import { siteConfig, money, purposeLabel } from '../config/siteConfig';
import { Breadcrumb, SEO, Photo, Button, useToast } from '../components/ui';
export default function Compare() {
  const { properties } = useCatalog();
  const [ids, save] = usePropertyTools('compare-properties');
  const { t } = useLanguage();
  const toast = useToast();
  const selected = ids.map((id) => properties.find((p) => p.id === id)).filter(Boolean);
  const rows = [
    ['Purpose', (p) => purposeLabel(p.purpose)],
    ['Price', (p) => money(p.price) + (p.purpose === 'rent' ? ' / year' : '')],
    ['Location', (p) => p.location],
    ['Bedrooms', (p) => p.bedrooms],
    ['Bathrooms', (p) => p.bathrooms],
    ['Area (sq ft)', (p) => p.area],
    ['Amenities', (p) => p.amenities.join(', ')],
  ];
  return (
    <div className="page-shell">
      <SEO title={t('Compare properties')} />
      <Breadcrumb items={[{ label: 'Compare properties' }]} />
      <h1>{t('Compare properties')}</h1>
      <p>
        {t(
          'Compare up to three homes side by side. Prices and availability reflect the current catalog.',
        )}
      </p>
      {siteConfig.compareEnabled === false ? (
        <p>{t('Property comparison is currently unavailable.')}</p>
      ) : (
        <>
          <div className="search-tools">
            <Button to="/properties">{t('Explore properties')}</Button>
            {ids.length > 0 && (
              <Button
                onClick={() => {
                  try {
                    save([]);
                  } catch (e) {
                    toast(t(e.message));
                  }
                }}
              >
                {t('Clear comparison')}
              </Button>
            )}
          </div>
          {selected.length ? (
            <div className="comparison-scroll">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>{t('Property')}</th>
                    {selected.map((p) => (
                      <th key={p.id}>
                        <Photo src={p.images[0]} alt={t(p.title)} />
                        <Link to={`/property/${p.slug}`}>{t(p.title)}</Link>
                        <button
                          onClick={() => {
                            try {
                              save(ids.filter((id) => id !== p.id));
                            } catch (e) {
                              toast(t(e.message));
                            }
                          }}
                        >
                          {t('Remove')}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, fn]) => (
                    <tr key={label}>
                      <th scope="row">{t(label)}</th>
                      {selected.map((p) => (
                        <td key={p.id}>{t(fn(p))}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>{t('Choose properties using the Compare property button on each listing.')}</p>
          )}
          {selected.length < ids.length && (
            <p>
              {t(
                'Some selected properties are no longer available. Clear the comparison to start again.',
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
