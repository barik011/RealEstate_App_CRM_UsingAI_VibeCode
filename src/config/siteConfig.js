import site from '../data/site.json';
export const siteConfig = structuredClone(site);
export const updateSiteConfig = (data) => {
  for (const key of Object.keys(siteConfig)) delete siteConfig[key];
  Object.assign(siteConfig, structuredClone(site), data);
};
export const money = (value) => `AED ${new Intl.NumberFormat('en-AE').format(value)}`;
export const purposeLabel = (purpose) =>
  ({ buy: 'For sale', rent: 'For rent', 'off-plan': 'Off plan', commercial: 'Commercial' })[
    purpose
  ] || purpose;
