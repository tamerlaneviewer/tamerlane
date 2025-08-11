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

  const langMatches = (sel?: string | null, res?: string | null) => {
    if (!sel) return true; // no user language filter
    if (!res) return true; // result has no language -> include
    const s = sel.toLowerCase();
    const r = res.toLowerCase();
    if (s === r) return true;
    const sb = s.split('-')[0];
    const rb = r.split('-')[0];
    return sb === rb; // base-language match (e.g., en vs en-GB)
  };

  // Filter by language, but never hide the currently selected result.
  // If filtering would produce an empty list, fall back to showing all results.
  let visibleResults = searchResults.filter((result) => {
    return result.id === selectedSearchResultId || langMatches(selectedLanguage, result.language ?? null);
  });
  if (searchResults.length > 0 && visibleResults.length === 0) {
    visibleResults = searchResults;
  };

  useEffect(() => {
    if (selectedSearchResultId) {
    const ref = itemRefs.current[selectedSearchResultId];
    if (ref) {
  // Just focus the item - centering is handled by store ensureVisible
  try { (ref as any).focus({ preventScroll: true }); } catch { ref.focus(); }
    }
    }
  }, [selectedSearchResultId]);

  return (
    <div className="relative">
      {searchResults.length === 0 ? (
        <p className="text-gray-500 text-center">No search results found.</p>
      ) : (
        visibleResults
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
                  // onFocus centering is handled by the item's natural scroll behavior
                  // No custom centering needed here
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
