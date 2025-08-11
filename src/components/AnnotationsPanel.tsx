import React, { useRef, useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import AnnotationsList from './AnnotationsList.tsx';
import SearchResults from './SearchResults.tsx';
import { IIIFAnnotation, IIIFSearchSnippet } from '../types/index.ts';
import { useIIIFStore } from '../store/iiifStore.ts';

interface AnnotationsPanelProps {
  annotations: IIIFAnnotation[];
  searchResults: IIIFSearchSnippet[];
  // Removed annotationsError and searchError props
  onAnnotationSelect: (annotation: IIIFAnnotation) => void;
  activeTab: 'annotations' | 'search';
  setActiveTab: (tab: 'annotations' | 'search') => void;
  selectedAnnotation?: IIIFAnnotation;
  selectedSearchResultId?: string;
  onResultClick: (result: IIIFSearchSnippet) => void;
  selectedLanguage?: string;
  pendingAnnotationId?: string | null;
  onPendingAnnotationProcessed?: () => void;
  viewerReady?: boolean;
  annotationsLoading?: boolean;
  searching?: boolean;
}

const AnnotationsPanel: React.FC<AnnotationsPanelProps> = ({
  annotations,
  searchResults,
  onAnnotationSelect,
  activeTab,
  setActiveTab,
  onResultClick,
  selectedAnnotation,
  selectedSearchResultId,
  selectedLanguage,
  pendingAnnotationId,
  onPendingAnnotationProcessed,
  viewerReady,
  annotationsLoading = false,
  searching = false,
  // Removed annotationsError and searchError from props
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollPositions = useRef<{ annotations: number; search: number }>({
    annotations: 0,
    search: 0,
  });
  const annotationsTabRef = useRef<HTMLButtonElement>(null);
  const searchTabRef = useRef<HTMLButtonElement>(null);
  const [focusedTab, setFocusedTab] = useState<'annotations' | 'search'>(
    activeTab,
  );
  // Track previous tab to correctly save its position when switching
  const prevTabRef = useRef<'annotations' | 'search'>(activeTab);
  const panelScrollTop = useIIIFStore((s) => s.panelScrollTop);
  const setPanelScrollTop = useIIIFStore((s) => s.setPanelScrollTop);
  const ensureVisible = useIIIFStore((s) => s.ensureVisible);

  // Center the target within the scroller. If always=true, force centering.
  // Uses robust geometry to compute offset relative to scroller, avoiding offsetParent quirks.
  const scrollTargetToCenter = (
    scroller: HTMLElement,
    target: HTMLElement,
    opts?: { always?: boolean; threshold?: number }
  ) => {
    const { always = false, threshold = 4 } = opts || {};
    const itemRect = target.getBoundingClientRect();
    const scrollRect = scroller.getBoundingClientRect();
    const fullyVisible = itemRect.top >= scrollRect.top && itemRect.bottom <= scrollRect.bottom;
    if (!always && fullyVisible) return; // don't move if already visible

    // Compute desired centered position using rects + current scrollTop
    const itemTopInScroller = itemRect.top - scrollRect.top + scroller.scrollTop;
    const desired = itemTopInScroller - (scroller.clientHeight - target.clientHeight) / 2;
    const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const clamped = Math.min(Math.max(0, desired), maxTop);
    if (!always && Math.abs(scroller.scrollTop - clamped) <= threshold) return; // ignore tiny deltas
    scroller.scrollTop = clamped;
  };

  // Save previous tab scroll position when switching tabs
  useEffect(() => {
    const scroller = scrollContainerRef.current;
    const prev = prevTabRef.current;
    if (scroller) {
      const top = scroller.scrollTop;
      if (prev === 'annotations') {
  savedScrollPositions.current.annotations = top;
  setPanelScrollTop('annotations', top);
      } else {
  savedScrollPositions.current.search = top;
  setPanelScrollTop('search', top);
      }
    }
    prevTabRef.current = activeTab;
  }, [activeTab, setPanelScrollTop]);

  // Restore scroll position after tab change (after content paints), clamped to range.
  // Skip restoring if there is a selected item or a pending ensureVisible intent for the active tab
  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;
    // If an item should be ensured visible, let that logic take over
    const hasItemTarget =
      (activeTab === 'annotations' && !!selectedAnnotation?.id) ||
      (activeTab === 'search' && !!selectedSearchResultId);
    const hasEnsureIntent = ensureVisible.tab === activeTab && !!ensureVisible.id;
    if (hasItemTarget || hasEnsureIntent) return;

    const savedPosition = activeTab === 'annotations' ? panelScrollTop.annotations : panelScrollTop.search;
    // Defer to next frame so content dimensions are accurate
    const raf = requestAnimationFrame(() => {
      const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      scroller.scrollTop = Math.min(savedPosition || 0, maxTop);
    });
    return () => cancelAnimationFrame(raf);
  }, [activeTab, panelScrollTop.annotations, panelScrollTop.search, selectedAnnotation?.id, selectedSearchResultId, ensureVisible]);

  // Observe content size changes and clamp scrollTop to prevent overscroll blank space
  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;
    const ro = new ResizeObserver(() => {
      const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      if (scroller.scrollTop > maxTop) {
        scroller.scrollTop = maxTop;
        setPanelScrollTop(activeTab, scroller.scrollTop);
      }
    });
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [activeTab, setPanelScrollTop]);

  useEffect(() => {
  setFocusedTab(activeTab);
  }, [activeTab]);

  // When switching to the Annotations tab, ensure the currently selected annotation is visible
  useEffect(() => {
    if (activeTab !== 'annotations' || !selectedAnnotation?.id) return;
    const scroller = scrollContainerRef.current;
    if (!scroller) return;
  // Use instant, center-if-needed scroll for stability
    let attempts = 0;
    let rafId: number | null = null;
    const tryFocus = () => {
      attempts += 1;
      let selected: HTMLElement | null = null;
      const nodes = scroller.querySelectorAll('[data-annotation-id]');
      for (const el of Array.from(nodes)) {
        const e = el as HTMLElement & { dataset?: { annotationId?: string } };
        if (e.dataset && e.dataset.annotationId === selectedAnnotation.id) {
          selected = e as HTMLElement;
          break;
        }
      }
      if (selected) {
        scrollTargetToCenter(scroller, selected, { always: true });
        try { (selected as any).focus({ preventScroll: true }); } catch { selected.focus(); }
        const clampId = requestAnimationFrame(() => {
          const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
          if (scroller.scrollTop > maxTop) scroller.scrollTop = maxTop;
        });
        rafId = clampId;
        return;
      }
      if (attempts < 8) {
        rafId = requestAnimationFrame(tryFocus);
      }
    };
    rafId = requestAnimationFrame(tryFocus);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [activeTab, selectedAnnotation?.id]);

  // When switching back to the Search tab, restore the selected result into view and focus it
  useEffect(() => {
    if (activeTab !== 'search') return;
    const scroller = scrollContainerRef.current;
    if (!scroller || !selectedSearchResultId) return;
  // Use instant, center-if-needed scroll for stability
    let attempts = 0;
    let rafId: number | null = null;
    const tryFocus = () => {
      attempts += 1;
      let selected: HTMLElement | null = null;
      const nodes = scroller.querySelectorAll('[data-result-id]');
      for (const el of Array.from(nodes)) {
        const e = el as HTMLElement & { dataset?: { resultId?: string } };
        if (e.dataset && e.dataset.resultId === selectedSearchResultId) {
          selected = e as HTMLElement;
          break;
        }
      }
      if (selected) {
        scrollTargetToCenter(scroller, selected, { always: true });
        try { (selected as any).focus({ preventScroll: true }); } catch { selected.focus(); }
        const clampId = requestAnimationFrame(() => {
          const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
          if (scroller.scrollTop > maxTop) scroller.scrollTop = maxTop;
        });
        rafId = clampId;
        return;
      }
      if (attempts < 8) {
        rafId = requestAnimationFrame(tryFocus);
      }
    };
    rafId = requestAnimationFrame(tryFocus);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [activeTab, selectedSearchResultId]);

  // Store-driven ensureVisible intent (annotations or search)
  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;
    const { tab, id } = ensureVisible;
    if (!id || tab !== activeTab) return;
    let attempts = 0;
    let rafId: number | null = null;
    const tryEnsure = () => {
      attempts += 1;
      const nodes = scroller.querySelectorAll(tab === 'annotations' ? '[data-annotation-id]' : '[data-result-id]');
      let target: HTMLElement | null = null;
      for (const el of Array.from(nodes)) {
        const e = el as HTMLElement & { dataset?: { annotationId?: string; resultId?: string } };
        const matchId = tab === 'annotations' ? e.dataset?.annotationId : e.dataset?.resultId;
        if (matchId === id) { target = e as HTMLElement; break; }
      }
      if (target) {
        scrollTargetToCenter(scroller, target, { always: true });
        try { (target as any).focus({ preventScroll: true }); } catch { target.focus(); }
        const clampId = requestAnimationFrame(() => {
          const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
          if (scroller.scrollTop > maxTop) scroller.scrollTop = maxTop;
          setPanelScrollTop(activeTab, scroller.scrollTop);
        });
        rafId = clampId;
        return;
      }
      if (attempts < 8) {
        rafId = requestAnimationFrame(tryEnsure);
      }
    };
    rafId = requestAnimationFrame(tryEnsure);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [ensureVisible, activeTab, setPanelScrollTop]);

  const handleTabsKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const order: Array<'annotations' | 'search'> = ['annotations', 'search'];
    const currentIndex = order.indexOf(focusedTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = order[(currentIndex + 1) % order.length];
      setFocusedTab(next);
      (next === 'annotations' ? annotationsTabRef : searchTabRef).current?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = order[(currentIndex - 1 + order.length) % order.length];
      setFocusedTab(prev);
      (prev === 'annotations' ? annotationsTabRef : searchTabRef).current?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedTab('annotations');
      annotationsTabRef.current?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusedTab('search');
      searchTabRef.current?.focus();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setActiveTab(focusedTab);
      // Always focus the scroller when activating a tab via keyboard
      setTimeout(() => {
        try {
          (scrollContainerRef.current as any)?.focus({ preventScroll: true });
        } catch {
          scrollContainerRef.current?.focus();
        }
      }, 0);
    }
  };

  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ignore if typing in an input/textarea/contenteditable inside the panel
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as HTMLElement).isContentEditable)
    ) {
      return;
    }
    const scroller = scrollContainerRef.current;
    if (!scroller) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      scroller.scrollBy({ top: 40, behavior: reduceMotion ? 'auto' : 'smooth' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      scroller.scrollBy({ top: -40, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full border shadow-md bg-white">
      {/* Tabs Section (Icons Only) */}
      <div
        className="flex border-b"
        role="tablist"
        aria-label="Annotations and search"
        onKeyDown={handleTabsKeyDown}
      >
        <button
          ref={annotationsTabRef}
          className={`flex-1 py-2 flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            activeTab === 'annotations'
              ? 'bg-gray-300 text-black'
              : 'bg-gray-200 text-gray-500'
          } hover:bg-gray-400`}
          onClick={() => {
            setActiveTab('annotations');
            // Always focus the scroller when clicking the tab
            setTimeout(() => {
              try {
                (scrollContainerRef.current as any)?.focus({ preventScroll: true });
              } catch {
                scrollContainerRef.current?.focus();
              }
            }, 0);
          }}
          title="Annotations"
          role="tab"
          id="tab-annotations"
          aria-selected={activeTab === 'annotations'}
          aria-controls="panel-tabs"
          tabIndex={activeTab === 'annotations' ? 0 : -1}
          onFocus={() => setFocusedTab('annotations')}
        >
          <BookOpen className="w-6 h-6 transition-colors" />
        </button>
        <button
          ref={searchTabRef}
          className={`flex-1 py-2 flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            activeTab === 'search'
              ? 'bg-gray-300 text-black'
              : 'bg-gray-200 text-gray-500'
          } hover:bg-gray-400`}
          onClick={() => {
            setActiveTab('search');
            // Always focus the scroller when clicking the tab
            setTimeout(() => {
              try {
                (scrollContainerRef.current as any)?.focus({ preventScroll: true });
              } catch {
                scrollContainerRef.current?.focus();
              }
            }, 0);
          }}
          title="Search Results"
          role="tab"
          id="tab-search"
          aria-selected={activeTab === 'search'}
          aria-controls="panel-tabs"
          tabIndex={activeTab === 'search' ? 0 : -1}
          onFocus={() => setFocusedTab('search')}
        >
          <Search className="w-6 h-6 transition-colors" />
        </button>
      </div>

      {/* Scrollable Content Section */}
      <div 
        ref={scrollContainerRef}
  className="flex-grow min-h-0 overflow-y-scroll p-3 overscroll-contain gutter-stable touch-pan-y"
        role="tabpanel"
        id="panel-tabs"
        aria-labelledby={activeTab === 'annotations' ? 'tab-annotations' : 'tab-search'}
        tabIndex={0}
        aria-busy={activeTab === 'annotations' ? annotationsLoading : searching}
        onKeyDown={handlePanelKeyDown}
        onScroll={(e) => {
          const el = e.currentTarget as HTMLElement;
          setPanelScrollTop(activeTab, el.scrollTop);
        }}
      >
  {/* Removed error banners for annotations and search */}
  {activeTab === 'annotations' ? (
          annotations.length === 0 ? (
            <p className="text-gray-500 text-center">
              No annotations available.
            </p>
          ) : (
            <AnnotationsList
              annotations={annotations}
              onAnnotationSelect={onAnnotationSelect}
              selectedAnnotation={selectedAnnotation}
              selectedLanguage={selectedLanguage || undefined}
              pendingAnnotationId={pendingAnnotationId}
              onPendingAnnotationProcessed={onPendingAnnotationProcessed}
              viewerReady={viewerReady}
            />
          )
        ) : (
          <div className="flex flex-col gap-2">
            {searching && (
              <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">Searching…</div>
            )}
            {searchResults.length === 0 ? (
              <p className="text-gray-500 text-center">No search results found.</p>
            ) : (
              <SearchResults
                searchResults={searchResults}
                onResultClick={onResultClick}
                selectedSearchResultId={selectedSearchResultId}
                selectedLanguage={selectedLanguage}
              />
            )}
          </div>
        )}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {activeTab === 'annotations'
            ? annotationsLoading
              ? 'Loading annotations…'
              : ''
            : searching
              ? 'Searching…'
              : searchResults.length > 0
                ? `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}.`
                : 'No results.'}
        </div>
      </div>
    </div>
  );
};

export default AnnotationsPanel;
