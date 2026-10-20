# Property portal research and improvement plan

Research date: 19 October 2026. Target market: Dubai / UAE. This is a comparison of publicly observable features, not access to competitors' private admin systems.

## Which sites lead?

[Semrush's UAE real-estate category](https://www.semrush.com/trending-websites/ae/real-estate) lists dubizzle, Bayut and Property Finder first, second and third in its September 2026 traffic estimates. The table reports approximately 2.97 million, 2.37 million and 1.8 million visits respectively. These are third-party estimates, not audited customer counts or a quality ranking. Dubizzle also covers general classifieds, so its domain traffic is not directly comparable to a property-only site.

Bayut and Property Finder are the most relevant product references for this Dubai application. Zillow and Rightmove provide additional search and shortlisting ideas; this review does not claim they have the same UAE ranking.

## Findings and application decisions

| Reference | Observed feature | Decision for this application |
| --- | --- | --- |
| [Property Finder](https://www.propertyfinder.ae/en) | Purpose, beds/baths, price and amenities search; location discovery | Existing purpose/location/price filters retained; area and amenity filters added |
| [Property Finder listings](https://www.propertyfinder.ae/en/buy/properties-for-sale.html) | Floor plans, agent contact and listing status information | Improve listing media next; never display a verification claim without a documented verification process |
| [Bayut](https://www.bayut.com/) | Community guides, agent discovery, market research, map and commute search | Community and editorial content can now be managed in Admin; external map/commute and licensed market-data integrations are later work |
| [Zillow home search tools](https://www.zillow.com/learn/zillow-advanced-search/) | Saved searches and side-by-side home comparisons | Added a three-property comparison table and browser-local saved searches |
| [Rightmove search guidance](https://faq.rightmove.co.uk/support/solutions/articles/7000048777-how-to-start-your-search-on-rightmove) | Persistent filters, keyword refinement, price/newness sorting | Existing shareable URL filters retained; saved searches restore those criteria |
| [Rightmove account guidance](https://faq.rightmove.co.uk/support/solutions/articles/7000048780-what-can-i-do-with-a-myrightmove-account-) | Saved homes, searches and alerts | Existing favourites retained. Email alerts need a delivery provider, consent and a scheduled matching job; they are not represented as working |

The admin workflow is an original design for this app. Competitor branding, proprietary badges, listing content and images have not been copied.

## What has been implemented

- **Admin → Website content** (`/admin/website`): structured forms for brand/contact/social settings, homepage headline/introduction/hero images, page size and visitor-tool toggles.
- Communities, property categories, journal articles and testimonials: add, edit, remove and reorder entries. Articles include publication date, excerpt and paragraphs.
- **Save draft** keeps work private. **Publish website content** changes the selected public collection. Version checks reject stale saves. Linked communities/categories cannot be removed while a property references them. Server authorization restricts the editor to administrators and records draft/publish events.
- **Property comparison** (`/compare`): select up to three listings; compare current price, purpose, location, bedrooms, bathrooms, area and amenities. Unavailable listings are not displayed as active offers.
- **Saved searches**: visitors name and restore search criteria on the same browser/device. Maximum ten saved searches. No account synchronization or email delivery is implied.
- **Detailed search**: minimum/maximum area and amenities derived from current listing data. Admins already manage property amenities through the property editor.
- Public controls include Arabic interface translations. New editorial text is displayed as entered; a separate bilingual editorial authoring workflow remains a future enhancement.
- Agent credentials and individually granted permissions from the preceding task remain available under **Logins & access**. New agents default to own-profile access.

## How the administrator uses it

1. Sign in at `/admin/login` and open **Website content**.
2. Select a content collection. Make changes with the forms; use **Apply to draft** after editing an item.
3. Choose **Save draft** to keep work private or **Publish website content** to make the selected collection public.
4. Open **View website** to review the result. An already-open site refreshes content when focused and periodically; reloading also fetches the latest published content.
5. Manage listing facts, price, photos, amenities and availability under **Properties**. Manage staff credentials separately under **Logins & access**.

Drafts are not a full historical rollback system. Reload discards unsaved local edits and loads the most recently saved draft. Existing About/Investment/legal page prose and navigation structure still live in source code; the content editor does not claim to be a general page builder.

## Recommended next improvements, in order

1. **Real listing quality:** replace sample content with owned/licensed photos and accurate availability, agent contact and business information. Add floor plans, video tours, listing identifiers and a documented review workflow. Do not copy another portal's verification badge. Measure inquiry completion and stale listing rate.
2. **Bilingual content and SEO:** author English/Arabic versions of new articles and communities, add per-page metadata, canonical URLs, structured property data and a sitemap updated from published records. Measure indexed listing pages and qualified organic inquiries. Static marketing/legal pages should move into the CMS if frequent editing is needed.
3. **Customer accounts and alerts:** opt-in email alerts for new matching properties and price changes; verified customer accounts for cross-device favourites/searches. Requires an email provider, unsubscribe handling and background jobs. Measure return visits and alert-to-inquiry conversion.
4. **Lead operations:** duplicate inquiry review, assignment rules, response-time reporting and scheduled follow-up reminders. Integrate WhatsApp/email only with a configured provider, approved templates where applicable, delivery logs and user consent.
5. **Maps and neighbourhood data:** real map browsing, accurate coordinates, nearby amenities and commute estimates using licensed providers. Do not fabricate distance or commute times. Review provider cost before activating paid integrations.
6. **Market/finance research:** transaction comparisons and affordability tools backed by licensed current data and clearly stated assumptions. Do not invent valuation accuracy or guaranteed rental returns.
7. **Scale and operations:** server pagination, filtered exports, monitoring, backups/restore checks, accessible keyboard journeys and testing across Safari/Firefox as well as Chromium. Add audit-history UI and content revision rollback as editorial activity grows.

These are remaining recommendations, not claims that every large-portal capability has been implemented. Start with reliable inventory and inquiry conversion before paying for advanced data products.

## Deployment and validation

The website CMS migration is `202610190003_website_content.sql`. Apply it with `npm run supabase:migrate`; regenerate fresh-install SQL with `npm run supabase:bootstrap`. Frontend changes require the usual build/deployment; the local Vite app picks them up automatically. No email, paid subscription or external messaging provider is enabled by these changes.

Validation covers server-side content authorization, private drafts, version conflicts, unsafe URLs, referenced category protection, browser publishing, comparison, saved-search restoration and responsive layouts. Final results: 37 unit/database tests passed, production build and translation/CSS checks passed. All 17 selected public-site, CMS, search and layout browser scenarios passed across the main run and targeted reruns after fixes. The hosted CMS read/draft/publish transaction and property comparison passed; test content writes were rolled back and temporary users removed. Desktop/mobile screenshots were visually inspected. The final connected homepage was also checked for horizontal overflow.

## Homepage layout follow-up

Featured properties and categories now occupy separate full-width single rows, with horizontal scrolling on narrow screens. The story/community sections share one desktop row, and investment benefits/testimonials share another. An eight-card Dubai advantage section adds theme-matched icons, staggered entrance animation, hover movement and reduced-motion support. Administrators can change its title, introduction, icon choices, card text and visibility under Website content ? Homepage & website ? Dubai advantage section. Migration `202610190004_dubai_highlights.sql` validates the stored card structure. Sidebar and mobile drawer overflow now scrolls vertically on short screens.


### Homepage layout refinement ? 20 October 2026

Revisited [Property Finder](https://www.propertyfinder.ae/en): its community exploration and investor-guide entry points informed the clearer location selector and investment-guide link. The visual interpretation uses the existing navy and gold brand, four separate full-width sections, three selectable story images, prominent investment icon cards, and a dark testimonial carousel. Motion respects reduced-motion preferences; buttons support keyboard activation and expose their selected state. No investment returns or tax guarantees were added.
