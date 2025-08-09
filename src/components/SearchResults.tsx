import React, { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { IIIFSearchSnippet } from '../types/index.ts';

interface SearchResultsProps {
  searchResults: IIIFSearchSnippet[];
  onResultClick: (result: IIIFSearchSnippet) => void;
  // This ID should now be the unique ID of the search result snippet itself.
  selectedSearchResultId?: string | null;
  selectedLanguage?: string | null;
}

// Function to sanitize annotation text
const renderHTML = (text: string) => {
  const safeString = text.replace(/\n/g, '<br />');
  return { __html: DOMPurify.sanitize(safeString) };
};

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  onResultClick,
  selectedSearchResultId,
  selectedLanguage,
}) => {
  const itemRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (selectedSearchResultId) {
      const ref = itemRefs.current[selectedSearchResultId];
      if (ref) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ref.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  try { (ref as any).focus({ preventScroll: true }); } catch { ref.focus(); }
      }
    }
  }, [selectedSearchResultId]);

  return (
    <div className="relative">
      {searchResults.length === 0 ? (
        <p className="text-gray-500 text-center">No search results found.</p>
      ) : (
        searchResults
          .filter((result) => {
            if (!selectedLanguage) return true; // No filter if no selected language
            if (!result.language) return true; // No language on the result? Show it
            return result.language === selectedLanguage; // Only match if explicitly matches
          })
          .map((result: IIIFSearchSnippet) => {
            const combinedHTML = `${result.prefix ?? ''}<span class="text-blue-600 font-semibold">${result.exact}</span>${result.suffix ?? ''}`;

            // We now check against the result's own unique ID.
            const isSelected = selectedSearchResultId === result.id;

            return (
              <div
                key={result.id}
                data-result-id={result.id}
                ref={(el) => {
                  if (el) itemRefs.current[result.id] = el;
                }}
                onClick={() => onResultClick(result)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onResultClick(result);
                  }
                }}
                onFocus={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  const scroller = el.closest('[role="tabpanel"]') as HTMLElement | null;
                  if (!scroller) return;
                  const itemRect = el.getBoundingClientRect();
                  const scrollRect = scroller.getBoundingClientRect();
                  const above = itemRect.top < scrollRect.top;
                  const below = itemRect.bottom > scrollRect.bottom;
                  if (above || below) {
                    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
                  }
                }}
                className={`mb-1 last:mb-0 p-1 cursor-pointer rounded transition-all scroll-mt-4 scroll-mb-4 text-sm text-gray-700 leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isSelected
                    ? 'bg-blue-200 border-l-4 border-blue-500'
                    : 'hover:bg-gray-100'
                }`}
                dangerouslySetInnerHTML={renderHTML(combinedHTML)}
              />
            );
          })
      )}
    </div>
  );
};

export default SearchResults;
