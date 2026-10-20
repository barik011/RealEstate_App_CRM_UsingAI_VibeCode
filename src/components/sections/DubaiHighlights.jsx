import { motion, useReducedMotion } from 'motion/react';
import {
  Globe2,
  BriefcaseBusiness,
  Building2,
  Waves,
  KeyRound,
  House,
  Users,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';
import { useCatalog } from '../../hooks/useCatalog';
import { defaultHighlights } from '../../config/dubaiHighlights';
import { Button } from '../ui';
const icons = {
  globe: Globe2,
  business: BriefcaseBusiness,
  building: Building2,
  waterfront: Waves,
  key: KeyRound,
  home: House,
  community: Users,
  growth: TrendingUp,
};
export default function DubaiHighlights() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const { site = {} } = useCatalog();
  const items = Array.isArray(site.dubaiHighlights) ? site.dubaiHighlights : defaultHighlights;
  if (site.highlightsEnabled === false || !items.length) return null;
  return (
    <section className="dubai-highlights" aria-labelledby="dubai-highlights-title">
      <div className="highlights-intro">
        <div>
          <p className="eyebrow">{t('THE DUBAI ADVANTAGE')}</p>
          <h2 id="dubai-highlights-title">
            {t(site.highlightsTitle || 'A city of possibilities.')}
          </h2>
          <p>
            {t(
              site.highlightsIntro ||
                'More ways to live. More reasons to belong. Explore what makes Dubai a place to build your next chapter.',
            )}
          </p>
        </div>
        <Button to="/invest">
          {t('Discover Dubai')}
          <ArrowUpRight size={18} />
        </Button>
      </div>
      <div className="highlights-grid">
        {items.map((item, index) => {
          const Icon = icons[item.icon] || Building2;
          return (
            <motion.article
              key={index}
              className="highlight-card"
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: reduce ? 0 : (index % 4) * 0.07 }}
              whileHover={reduce ? undefined : { y: -5 }}
            >
              <span className="highlight-number" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="highlight-icon">
                <Icon size={30} strokeWidth={1.4} />
              </span>
              <h3>{t(item.title)}</h3>
              <p>{t(item.description)}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
