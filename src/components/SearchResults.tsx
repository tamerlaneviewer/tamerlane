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

  // Simple language matching function that matches the AnnotationsList approach
  const matchesLanguage = (resultLanguage?: string | null): boolean => {
    if (!selectedLanguage) return true;
    if (!resultLanguage) return true; // No language specified - show for any language
    
    // Exact match
    return resultLanguage === selectedLanguage;
  };

  // Filter by language consistently
  const visibleResults = searchResults.filter((result) => {
    return matchesLanguage(result.language ?? null);
  });

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
            // Ensure proper spacing between prefix/exact/suffix
            let prefix = result.prefix ?? '';
            let suffix = result.suffix ?? '';
            
            // Add trailing space to prefix if missing and prefix is not empty
            if (prefix && !prefix.endsWith(' ')) {
              prefix += ' ';
            }
            
            // Add leading space to suffix if missing and suffix is not empty
            if (suffix && !suffix.startsWith(' ')) {
              suffix = ' ' + suffix;
            }
            
            const combinedHTML = `${prefix}<span class="text-blue-600 font-semibold">${result.exact}</span>${suffix}`;

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
