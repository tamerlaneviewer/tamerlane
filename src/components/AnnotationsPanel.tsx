import React, { useRef, useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import AnnotationsList from './AnnotationsList.tsx';
import SearchResults from './SearchResults.tsx';
import { IIIFAnnotation, IIIFSearchSnippet } from '../types/index.ts';

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

  // Save previous tab scroll position when switching tabs
  useEffect(() => {
    const scroller = scrollContainerRef.current;
    const prev = prevTabRef.current;
    if (scroller) {
      const top = scroller.scrollTop;
      if (prev === 'annotations') {
        savedScrollPositions.current.annotations = top;
      } else {
        savedScrollPositions.current.search = top;
      }
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  // Restore scroll position after tab change (after content paints), clamped to range
  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;
    const savedPosition =
      activeTab === 'annotations'
        ? savedScrollPositions.current.annotations
        : savedScrollPositions.current.search;
    // Defer to next frame so content dimensions are accurate
    const raf = requestAnimationFrame(() => {
      const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      scroller.scrollTop = Math.min(savedPosition || 0, maxTop);
    });
    return () => cancelAnimationFrame(raf);
  }, [activeTab]);

  useEffect(() => {
    setFocusedTab(activeTab);
  }, [activeTab]);

  // When switching back to the Search tab, restore the selected result into view and focus it
  useEffect(() => {
    if (activeTab !== 'search') return;
    const scroller = scrollContainerRef.current;
    if (!scroller || !selectedSearchResultId) return;
    const all = scroller.querySelectorAll('[data-result-id]');
    let selected: HTMLElement | null = null;
    for (const el of Array.from(all)) {
      const e = el as HTMLElement & { dataset?: { resultId?: string } };
      // dataset keys convert data-result-id to resultId
      if (e.dataset && e.dataset.resultId === selectedSearchResultId) {
        selected = e as HTMLElement;
        break;
      }
    }
    if (!selected) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  selected.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    try { (selected as any).focus({ preventScroll: true }); } catch { selected.focus(); }
    // Clamp after any scroll to avoid blank viewport if content is shorter
    const raf = requestAnimationFrame(() => {
      const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      if (scroller.scrollTop > maxTop) scroller.scrollTop = maxTop;
    });
    return () => cancelAnimationFrame(raf);
  }, [activeTab, selectedSearchResultId]);

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
  // When activated via keyboard, move focus into the tabpanel without scrolling the viewport
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
            // Keep viewport stable when moving focus into panel programmatically
            try {
              (scrollContainerRef.current as any)?.focus({ preventScroll: true });
            } catch {
              scrollContainerRef.current?.focus();
            }
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
            try {
              (scrollContainerRef.current as any)?.focus({ preventScroll: true });
            } catch {
              scrollContainerRef.current?.focus();
            }
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
        ) : searchResults.length === 0 ? (
          <p className="text-gray-500 text-center">No search results found.</p>
        ) : (
          <SearchResults
            searchResults={searchResults}
            onResultClick={onResultClick}
            selectedSearchResultId={selectedSearchResultId}
            selectedLanguage={selectedLanguage}
          />
        )}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {activeTab === 'annotations'
            ? annotationsLoading
              ? 'Loading annotations…'
              : ''
            : searching
              ? 'Searching…'
              : ''}
        </div>
      </div>
    </div>
  );
};

export default AnnotationsPanel;
