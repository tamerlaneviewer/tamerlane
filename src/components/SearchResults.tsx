import React, { useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { IIIFSearchSnippet } from '../types/index.ts';

interface SearchResultsProps {
  searchResults: IIIFSearchSnippet[];
  onResultClick: (result: IIIFSearchSnippet) => void;
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
  const selectedResultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedResultRef.current) {
      selectedResultRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedSearchResultId]);

  // Pre-calculate first occurrence of each annotationId for performance
  const firstOccurrenceMap = React.useMemo(() => {
    const map = new Map<string, number>();
    searchResults.forEach((result, index) => {
      if (!map.has(result.annotationId)) {
        map.set(result.annotationId, index);
      }
    });
    return map;
  }, [searchResults]);

  return (
    <div>
      {searchResults.length === 0 ? (
        <p className="text-gray-500 text-center">No search results found.</p>
      ) : (
        searchResults
          .filter((result) => {
            if (!selectedLanguage) return true; // No filter if no selected language
            if (!result.language) return true; // No language on the result? Show it
            return result.language === selectedLanguage; // Only match if explicitly matches
          })
          .map((result: IIIFSearchSnippet, index: number) => {
            const combinedHTML = `${result.prefix ?? ''}<span class="text-blue-600 font-semibold">${result.exact}</span>${result.suffix ?? ''}`;

            const isSelected = selectedSearchResultId === result.annotationId;
            const isFirstOfGroup = isSelected && firstOccurrenceMap.get(result.annotationId) === searchResults.indexOf(result);

            return (
              <div
                key={result.id}
                ref={isFirstOfGroup ? selectedResultRef : null}
                onClick={() => onResultClick(result)}
                className={`mb-1 p-1 cursor-pointer rounded transition-all text-sm text-gray-700 leading-tight ${
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
