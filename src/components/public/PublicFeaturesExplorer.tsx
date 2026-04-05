'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicFeatureDemo } from '@/components/public/PublicFeatureDemo';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PublicLandingHeroMedia } from '@/lib/public-landings';
import type { PublicLocale } from '@/lib/public-locale';
import { cn } from '@/lib/utils';

export interface PublicFeaturesExplorerItem {
  id: string;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  media: PublicLandingHeroMedia;
  badgeLabel?: string;
}

export interface PublicFeaturesExplorerSection {
  id: string;
  label?: string;
  tabLabel?: string;
  title: string;
  description: string;
  items: PublicFeaturesExplorerItem[];
}

interface PublicFeaturesExplorerProps {
  locale: PublicLocale;
  sections: PublicFeaturesExplorerSection[];
  tabsAlign?: 'left' | 'center';
  showSectionIntro?: boolean;
  showSectionTitle?: boolean;
  resetItemOnSectionChange?: boolean;
  layout?: 'balanced' | 'image-heavy';
  compactCards?: boolean;
  showItemBadges?: boolean;
  autoRotateItems?: boolean;
  autoRotateIntervalMs?: number;
}

export function PublicFeaturesExplorer({
  locale,
  sections,
  tabsAlign = 'left',
  showSectionIntro = true,
  showSectionTitle = true,
  resetItemOnSectionChange = false,
  layout = 'balanced',
  compactCards = false,
  showItemBadges = true,
  autoRotateItems = false,
  autoRotateIntervalMs = 3200,
}: PublicFeaturesExplorerProps) {
  const firstSectionId = sections[0]?.id ?? '';
  const [activeSectionId, setActiveSectionId] = useState(firstSectionId);
  const [activeItemBySection, setActiveItemBySection] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      sections.map((section) => [section.id, section.items[0]?.id ?? ''])
    )
  );

  useEffect(() => {
    if (!sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(firstSectionId);
    }

    setActiveItemBySection((current) => {
      const next = { ...current };

      for (const section of sections) {
        const sectionItemIds = section.items.map((item) => item.id);
        if (!sectionItemIds.includes(next[section.id])) {
          next[section.id] = section.items[0]?.id ?? '';
        }
      }

      return next;
    });
  }, [activeSectionId, firstSectionId, sections]);

  useEffect(() => {
    if (!autoRotateItems) {
      return;
    }

    const activeSection = sections.find((section) => section.id === activeSectionId);
    if (!activeSection || activeSection.items.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveItemBySection((current) => {
        const currentItemId = current[activeSection.id] ?? activeSection.items[0]?.id ?? '';
        const currentIndex = activeSection.items.findIndex((item) => item.id === currentItemId);
        const nextIndex = currentIndex >= 0
          ? (currentIndex + 1) % activeSection.items.length
          : 0;

        return {
          ...current,
          [activeSection.id]: activeSection.items[nextIndex]?.id ?? currentItemId,
        };
      });
    }, autoRotateIntervalMs);

    return () => window.clearInterval(timer);
  }, [activeSectionId, autoRotateIntervalMs, autoRotateItems, sections]);

  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) ?? sections[0],
    [activeSectionId, sections]
  );

  const activeItem = useMemo(() => {
    if (!activeSection) {
      return null;
    }

    const activeItemId = activeItemBySection[activeSection.id];
    return (
      activeSection.items.find((item) => item.id === activeItemId) ??
      activeSection.items[0] ??
      null
    );
  }, [activeItemBySection, activeSection]);

  if (!activeSection || !activeItem) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        .summa-antigravity-shell {
          overflow: visible;
        }

        .summa-antigravity-surface {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 28px;
          background: linear-gradient(180deg, #f6f8fc 0%, #f9fafd 58%, #ffffff 100%);
        }

        .summa-antigravity-inner-glow {
          position: absolute;
          inset: 6%;
          border-radius: 24px;
          background:
            radial-gradient(circle at 14% 18%, rgba(80, 146, 255, 0.62), rgba(80, 146, 255, 0) 34%),
            radial-gradient(circle at 82% 18%, rgba(163, 111, 255, 0.52), rgba(163, 111, 255, 0) 32%),
            radial-gradient(circle at 84% 80%, rgba(255, 126, 88, 0.4), rgba(255, 126, 88, 0) 30%),
            radial-gradient(circle at 34% 82%, rgba(255, 210, 112, 0.7), rgba(255, 210, 112, 0) 30%),
            radial-gradient(circle at 56% 44%, rgba(133, 224, 255, 0.3), rgba(133, 224, 255, 0) 34%);
          opacity: 0.96;
          filter: blur(37.5px);
          pointer-events: none;
        }

        .summa-antigravity-inner-wash {
          position: absolute;
          inset: 0;
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0));
          pointer-events: none;
        }
      `}</style>

      <Tabs
        value={activeSectionId}
        onValueChange={(value) => {
          setActiveSectionId(value);

          if (!resetItemOnSectionChange) {
            return;
          }

          const section = sections.find((entry) => entry.id === value);
          const firstItemId = section?.items[0]?.id;

          if (!firstItemId) {
            return;
          }

          setActiveItemBySection((current) => ({
            ...current,
            [value]: firstItemId,
          }));
        }}
        className="space-y-8 lg:space-y-14 xl:space-y-16"
      >
        <div>
          <TabsList
            className={cn(
              'flex h-auto w-full flex-wrap rounded-[1.8rem] bg-transparent p-0',
              tabsAlign === 'center' ? 'gap-2.5 sm:gap-3 lg:gap-3.5' : 'gap-4 lg:gap-5',
              tabsAlign === 'center' ? 'justify-center' : 'justify-start'
            )}
          >
            {sections.map((section) => (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className={cn(
                  'h-auto text-left font-medium leading-5 transition-all lg:text-sm',
                  tabsAlign === 'center'
                    ? 'rounded-full border border-slate-200/80 bg-white/88 px-4 py-2.5 text-[13px] text-slate-600 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.18)] backdrop-blur hover:border-sky-200/90 hover:bg-white hover:text-primary data-[state=active]:border-sky-200/90 data-[state=active]:bg-sky-50/95 data-[state=active]:text-primary data-[state=active]:shadow-[0_18px_50px_-34px_rgba(37,99,235,0.2)]'
                    : 'rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-1 py-3 text-[13px] text-slate-500 shadow-none hover:border-black/[0.08] hover:text-slate-900 data-[state=active]:border-black/[0.18] data-[state=active]:bg-transparent data-[state=active]:text-slate-950 data-[state=active]:shadow-none'
                )}
              >
                {section.tabLabel ?? section.label ?? section.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {sections.map((section) => {
          const selectedItemId =
            activeItemBySection[section.id] || section.items[0]?.id || '';
          const selectedItem =
            section.items.find((item) => item.id === selectedItemId) ??
            section.items[0];

          if (!selectedItem) {
            return null;
          }

          return (
            <TabsContent key={section.id} value={section.id} className="mt-0">
              <div
              className={cn(
                'grid gap-8',
                layout === 'image-heavy'
                  ? 'lg:grid-cols-[0.56fr_1.44fr] lg:items-start lg:gap-24 xl:grid-cols-[0.52fr_1.48fr] xl:gap-28'
                  : 'lg:grid-cols-[0.92fr_1.08fr]'
              )}
            >
                <div className={showSectionIntro ? 'space-y-7 lg:-mt-1 lg:space-y-8' : ''}>
                  {showSectionIntro ? (
                    <div className="space-y-4 lg:space-y-5">
                      {section.label ? (
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/85">
                          {section.label}
                        </p>
                      ) : null}
                      {showSectionTitle ? (
                        <h2
                          className={cn(
                            'max-w-md font-semibold tracking-[-0.045em] text-slate-950',
                            layout === 'image-heavy'
                              ? 'text-[2.95rem] leading-[0.92] sm:text-[3.35rem]'
                              : 'text-3xl tracking-tight sm:text-[2.4rem]'
                          )}
                        >
                          {section.title}
                        </h2>
                      ) : null}
                      {section.description ? (
                        <p
                          className={cn(
                            'max-w-md text-slate-600',
                            layout === 'image-heavy'
                              ? 'text-lg leading-8 sm:text-[1.36rem]'
                              : 'text-base leading-7 sm:text-lg'
                          )}
                        >
                          {section.description}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <Accordion
                    type="single"
                    value={selectedItemId}
                    onValueChange={(value) => {
                      if (!value) {
                        return;
                      }

                      setActiveItemBySection((current) => ({
                        ...current,
                        [section.id]: value,
                      }));
                    }}
                    className={compactCards ? 'space-y-2.5' : 'space-y-3'}
                  >
                    {section.items.map((item) => {
                      const isActive = item.id === selectedItemId;

                      return (
                        <AccordionItem
                          key={item.id}
                          value={item.id}
                          onMouseEnter={() => {
                            setActiveItemBySection((current) => ({
                              ...current,
                              [section.id]: item.id,
                            }));
                          }}
                          onFocusCapture={() => {
                            setActiveItemBySection((current) => ({
                              ...current,
                              [section.id]: item.id,
                            }));
                          }}
                          className={cn(
                            compactCards
                              ? 'overflow-hidden border-b border-black/[0.06] bg-transparent px-0 shadow-none transition-all last:border-b-0'
                              : 'overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white/92 px-5 shadow-[0_14px_36px_-34px_rgba(15,23,42,0.12)] transition-all',
                            isActive &&
                              (
                                compactCards
                                  ? 'border-black/[0.16] bg-transparent shadow-none'
                                  : 'border-sky-200/90 bg-[linear-gradient(180deg,rgba(241,248,255,0.9),rgba(255,255,255,0.98))] shadow-[0_20px_48px_-40px_rgba(37,99,235,0.14)]'
                              )
                          )}
                        >
                          <AccordionTrigger
                            className={cn(
                              'text-left hover:no-underline',
                              compactCards ? 'gap-5 py-3.5' : 'gap-6 py-5'
                            )}
                          >
                            <div className="space-y-2">
                              {showItemBadges && item.badgeLabel ? (
                                <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-slate-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  {item.badgeLabel}
                                </span>
                              ) : null}
                              <p
                                className={cn(
                                  'font-semibold tracking-tight text-slate-950',
                                  compactCards
                                    ? cn(
                                        'text-[1.06rem] leading-6 transition-colors',
                                        isActive ? 'text-slate-950' : 'text-slate-700'
                                      )
                                    : 'text-lg'
                                )}
                              >
                                {item.title}
                              </p>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className={compactCards ? 'pb-5 pt-0' : 'pb-5 pt-0'}>
                            <p
                              className={cn(
                                'max-w-xl text-sm text-slate-600',
                                compactCards ? 'line-clamp-3 leading-6 text-slate-600/88' : 'leading-6'
                              )}
                            >
                              {item.description}
                            </p>
                            {item.href && item.ctaLabel ? (
                              <Link
                                href={item.href}
                                className={cn(
                                  'inline-flex items-center text-sm font-semibold text-primary',
                                  compactCards ? 'mt-3' : 'mt-4'
                                )}
                              >
                                {item.ctaLabel}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            ) : null}
                            <div className="mt-4 lg:hidden">
                              <PublicFeatureDemo
                                key={`${item.id}-mobile`}
                                locale={locale}
                                media={item.media}
                                variant={layout === 'image-heavy' ? 'airy' : 'default'}
                                className={cn(
                                  layout === 'image-heavy'
                                    ? 'w-full bg-transparent p-0 shadow-none'
                                    : 'p-3 sm:p-4'
                                )}
                                mediaClassName={cn(
                                  layout === 'image-heavy'
                                    ? 'aspect-auto h-auto w-full rounded-xl object-contain object-center'
                                    : 'rounded-[1.25rem]'
                                )}
                                showDemoBadge={false}
                                showCaptionsBadge={false}
                                expandOnPlay={false}
                                dialogTitle={item.title}
                                dialogDescription={item.description}
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>

                <div className="hidden lg:sticky lg:top-24 lg:block">
                  <div
                    className={cn(
                      layout === 'image-heavy' &&
                        'summa-antigravity-shell relative ml-auto w-full max-w-[38rem] lg:ml-16'
                    )}
                  >
                    <div className="summa-antigravity-surface">
                      {layout === 'image-heavy' ? (
                        <>
                          <div className="summa-antigravity-inner-glow" aria-hidden="true" />
                          <div className="summa-antigravity-inner-wash" aria-hidden="true" />
                        </>
                      ) : null}
                      <div className="relative z-10 mx-auto w-full p-6">
                        <PublicFeatureDemo
                          key={selectedItem.id}
                          locale={locale}
                          media={selectedItem.media}
                          variant={layout === 'image-heavy' ? 'airy' : 'default'}
                          className={cn(
                            layout === 'image-heavy'
                              ? 'w-full animate-in fade-in bg-transparent p-0 duration-[800ms] ease-out shadow-none'
                              : 'p-3 sm:p-4'
                          )}
                          mediaClassName={cn(
                            layout === 'image-heavy'
                              ? 'aspect-auto h-auto w-full rounded-xl object-contain object-center'
                              : 'rounded-[1.25rem]'
                          )}
                          showDemoBadge={false}
                          showCaptionsBadge={false}
                          expandOnPlay={false}
                          dialogTitle={selectedItem.title}
                          dialogDescription={selectedItem.description}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </>
  );
}
