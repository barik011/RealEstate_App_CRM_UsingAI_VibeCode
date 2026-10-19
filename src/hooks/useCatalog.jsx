import { createContext, useContext, useEffect, useState } from 'react';
import { catalogService } from '../services/catalog';
import { crmService } from '../services/crmService';
import { updateSiteConfig } from '../config/siteConfig';
const CatalogContext = createContext(null);
export function CatalogProvider({ children }) {
  const [state, setState] = useState({ loading: true, error: null });
  useEffect(() => {
    let active = true;
    let revision = 0;
    const unsubscribe = crmService.subscribe((data) => {
      if (active)
        setState((previous) => ({
          ...previous,
          properties: data.properties.filter((p) => p.status === 'ACTIVE'),
        }));
    });
    const names = ['properties', 'locations', 'categories', 'articles', 'testimonials', 'site'];
    const refreshContent = () => {
      const ticket = ++revision;
      return Promise.all(names.map((name) => catalogService.getCollection(name)))
        .then((values) => {
          if (!active || ticket !== revision) return;
          updateSiteConfig(values[names.indexOf('site')]);
          if (active)
            setState({
              ...Object.fromEntries(names.map((name, i) => [name, values[i]])),
              loading: false,
              error: null,
            });
        })
        .catch((error) => {
          if (active && ticket === revision) setState({ loading: false, error: error.message });
        });
    };
    refreshContent();
    const onFocus = () => refreshContent();
    window.addEventListener('website-content-updated', onFocus);
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onFocus);
    const poll = setInterval(onFocus, 60000);
    return () => {
      clearInterval(poll);
      window.removeEventListener('website-content-updated', onFocus);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onFocus);
      active = false;
      unsubscribe();
    };
  }, []);
  return <CatalogContext.Provider value={state}>{children}</CatalogContext.Provider>;
}
export const useCatalog = () => useContext(CatalogContext);
