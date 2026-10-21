import DubaiHighlights from '../components/sections/DubaiHighlights';
import { useLanguage } from '../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCatalog } from '../hooks/useCatalog';
import { siteConfig } from '../config/siteConfig';
import { Button, Photo, Reveal, SectionHeader, SEO } from '../components/ui';
import { PropertyGrid } from '../components/property/PropertyCard';
import PropertySearch from '../components/search/PropertySearch';
import {
  Categories,
  FinalCTA,
  InvestmentBenefits,
  StoryPoints,
} from '../components/sections/Sections';
function Hero() {
  const { t } = useLanguage();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (paused || reduce) return;
    const timer = setInterval(() => setSlide((s) => (s + 1) % siteConfig.heroImages.length), 6500);
    return () => clearInterval(timer);
  }, [paused, reduce]);
  return (
    <section className="hero">
      <div className="hero-background" aria-hidden="true">
        {siteConfig.heroImages.map((src, i) => (
          <Photo
            key={src}
            src={src}
            alt={t('')}
            eager={i === 0}
            className={`hero-slide ${slide % siteConfig.heroImages.length === i ? 'active' : ''} ${paused ? 'paused' : ''}`}
          />
        ))}
      </div>
      <div className="hero-shade" />
      <div className="hero-content">
        <motion.div
          initial={
            reduce
              ? false
              : {
                  opacity: 0,
                  y: 20,
                }
          }
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.9,
          }}
        >
          <p className="eyebrow">
            {t('LIVE ')}
            <span>·</span>
            {t(' INVEST ')}
            <span>·</span>
            {t(' BELONG')}
          </p>
          <h1>
            {siteConfig.heroTitle ? (
              t(siteConfig.heroTitle)
            ) : (
              <>
                {t('Discover a')}
                <br />
                {t('Brighter Tomorrow')}
                <br />
                {t('in Dubai')}
              </>
            )}
            <span className="gold-dot">.</span>
          </h1>
          <p className="hero-description">
            {siteConfig.heroDescription ? (
              t(siteConfig.heroDescription)
            ) : (
              <>
                {t('Premium properties. Global opportunities.')}
                <br />
                {t('A better way to live, invest, and grow.')}
              </>
            )}
          </p>
        </motion.div>
        <PropertySearch />
        <div className="hero-stats">
          {[
            ['2,500+', 'Properties'],
            ['98%', 'Client satisfaction'],
            ['15+', 'Years in Dubai'],
            ['Global', 'Investor network'],
          ].map(([value, label]) => (
            <div key={value}>
              <strong>{t(value)}</strong>
              <span>{t(label)}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="handwritten hero-handwritten">
        {t('A Global')}
        <br />
        {t('Address for')}
        <br />
        {t('New Beginnings')}
      </p>
      <div className="hero-bottom-right">
        <p>
          {t('DUBAI')}
          <br />
          {t('MORE THAN A CITY.')}
          <br />
          {t('A WAY OF LIFE.')}
        </p>
        <div className="slider-controls">
          {siteConfig.heroImages.map((_, i) => (
            <button
              key={i}
              className={slide % siteConfig.heroImages.length === i ? 'active' : ''}
              aria-label={t('Show hero slide {0}', {
                0: i + 1,
              })}
              aria-pressed={slide % siteConfig.heroImages.length === i}
              onClick={() => setSlide(i)}
            />
          ))}
          <button
            className="pause-control"
            aria-label={t(paused ? 'Play slideshow' : 'Pause slideshow')}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </button>
        </div>
      </div>
    </section>
  );
}
function StoryShowcase() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState(0);
  const slides = [
    {
      image: siteConfig.images.skyline,
      title: 'Trusted by',
      subtitle: 'global investors',
      alt: 'Dubai skyline',
    },
    {
      image: siteConfig.images.interior,
      title: 'End-to-end',
      subtitle: 'support',
      alt: 'A beautifully considered home',
    },
    {
      image: siteConfig.images.villa,
      title: 'Long-term',
      subtitle: 'perspective',
      alt: 'Modern villa framed by palms',
    },
  ];
  return (
    <section className="story-section story-showcase">
      <div>
        <h2>
          {t('More Than Properties.')}
          <br />
          {t('A Better Future.')}
        </h2>
        <p>
          {t(
            'At Dubai bayt, we connect global investors with exceptional real estate opportunities in one of the world’s most dynamic cities.',
          )}
        </p>
        <Button light to="/about">
          {t('Our story')}
        </Button>
        <StoryPoints selected={selected} onSelect={setSelected} />
      </div>
      <div className="story-image" id="story-image" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={selected}
            className="story-frame"
            initial={reduce ? false : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.45 }}
          >
            <Photo src={slides[selected].image} alt={t(slides[selected].alt)} />
            <div className="story-caption">
              <span>0{selected + 1} / 03</span>
              <h3>
                {t(slides[selected].title)} {t(slides[selected].subtitle)}
              </h3>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
function LocationsPanel() {
  const { t } = useLanguage();
  const { locations } = useCatalog();
  const [selected, setSelected] = useState(1);
  const location = locations[selected % locations.length];
  if (!location) return null;
  return (
    <section className="locations-panel">
      <Photo src={location.image} alt={t(location.name)} />
      <div className="location-shade" />
      <div className="location-copy">
        <p className="eyebrow">{t('Prime locations')}</p>
        <h2>
          {t('Iconic Places.')}
          <br />
          {t('Extraordinary Living.')}
        </h2>
        <p>{t(location.description)}</p>
        <Button light to={`/location/${location.slug}`}>
          {t('Discover ')}
          {t(location.name)}
        </Button>
        <Link className="all-locations" to="/locations">
          {t('Explore all locations ')}
          <ArrowRight size={13} />
        </Link>
      </div>
      <div className="location-selector" aria-label={t('Choose a location')}>
        {locations.slice(0, 5).map((l, i) => (
          <button
            key={l.slug}
            className={selected % locations.length === i ? 'active' : ''}
            aria-pressed={selected % locations.length === i}
            onClick={() => setSelected(i)}
          >
            <Photo src={l.image} alt={t('')} />
            <span>{t(l.name)}</span>
            <ArrowRight size={13} />
          </button>
        ))}
      </div>
    </section>
  );
}
function Testimonials() {
  const { t, isRTL } = useLanguage();
  const { testimonials } = useCatalog();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const move = (delta) => setIndex((i) => (i + delta + testimonials.length) % testimonials.length);
  const item = testimonials[index % testimonials.length];
  if (!item) return null;
  return (
    <section
      className="testimonials testimonials-showcase"
      aria-roledescription={t('carousel')}
      aria-label={t('Client testimonials')}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') move(isRTL ? -1 : 1);
        if (e.key === 'ArrowLeft') move(isRTL ? 1 : -1);
      }}
      onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart !== null && Math.abs(touchStart - e.changedTouches[0].clientX) > 40)
          move((touchStart > e.changedTouches[0].clientX ? 1 : -1) * (isRTL ? -1 : 1));
        setTouchStart(null);
      }}
    >
      <div className="section-heading">
        <h2>{t('What Our Clients Say')}</h2>
        <div className="testimonial-controls">
          <button
            className="icon-button"
            onClick={() => move(-1)}
            aria-label={t('Previous testimonial')}
          >
            <ArrowLeft size={19} />
          </button>
          <button
            className="icon-button"
            onClick={() => move(1)}
            aria-label={t('Next testimonial')}
          >
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
      <div className="testimonial-content">
        <div className="testimonial-card" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={item.id}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: reduce ? 0 : 0.35,
              }}
            >
              <blockquote>“{t(item.quote)}”</blockquote>
              <div className="client">
                <Photo src={item.avatar} alt={t(item.name)} />
                <div>
                  <strong>{t(item.name)}</strong>
                  <small>{t(item.role)}</small>
                </div>
                <span className="stars" aria-label={t('5 out of 5 stars')}>
                  ★★★★★
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="testimonial-art">
          <Photo src={siteConfig.images.interior} alt={t('A beautifully considered home')} />
          <p className="handwritten">
            {t('People.')}
            <br />
            {t('Places.')}
            <br />
            {t('Possibilities.')}
          </p>
        </div>
      </div>
    </section>
  );
}
export default function Home() {
  const { t } = useLanguage();
  const { properties } = useCatalog();
  return (
    <>
      <SEO title={t('Luxury Properties in Dubai')} />
      <Hero />
      <div className="home-layout">
        <Reveal className="featured-section">
          <SectionHeader
            title={t('Featured Properties')}
            subtitle={t('EXCLUSIVE HOMES, EXCEPTIONAL OPPORTUNITIES')}
            to="/properties"
          />
          <PropertyGrid properties={properties.filter((p) => p.featured)} />
        </Reveal>
        <Categories compact singleRow />
        <StoryShowcase />
        <InvestmentBenefits showcase />
        <LocationsPanel />
        <Testimonials />
        <DubaiHighlights />
      </div>
      <FinalCTA />
    </>
  );
}
