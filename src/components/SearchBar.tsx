import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { logger } from '../utils/logger.ts';

interface SearchBarProps {
  onSearch: (query: string) => void;
  autocompleteService: string;
  selectedLanguage?: string;
  searching?: boolean;
}

const cleanAndSanitizeTerm = (value: string): string => {
  const stripped = value
    .replace(/<\/?[^>]+(>|$)/g, '') // remove HTML tags
    .replace(/&[^;\s]+;/g, '') // remove HTML entities
    .trim();
  return DOMPurify.sanitize(stripped);
};

const SearchBar = ({
  onSearch,
  autocompleteService,
  selectedLanguage,
  searching = false,
}: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [rawSuggestions, setRawSuggestions] = useState<Array<{value: string, language?: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  
  // Filter suggestions based on selected language
  const suggestions = rawSuggestions
    .filter((item) => {
      if (!selectedLanguage) return true;
      return !item.language || item.language === selectedLanguage;
    })
    .map((item) => item.value)
    .slice(0, 5);

  const [inputMethod, setInputMethod] = useState<'mouse' | 'keyboard'>(
    'keyboard',
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = 'search-suggestions';
  const inputId = 'search-input';
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const terms = query.split(/\s+/);
    const lastTerm = terms[terms.length - 1];

    // Clear suggestions immediately if query is too short
    if (!autocompleteService || lastTerm.length < 3) {
      setRawSuggestions([]);
      setHighlightedIndex(-1);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(
          `${autocompleteService}?q=${encodeURIComponent(lastTerm)}`,
        );
        const data = await res.json();

        const items = data.items.map((item: any) => ({
          value: item.value,
          language: item.language
        }));

        setRawSuggestions(items);
        setHighlightedIndex(-1);
        // Note: Status message will be updated by useEffect below
      } catch (err) {
        logger.error('Autocomplete failed', err);
        setRawSuggestions([]);
        setHighlightedIndex(-1);
        setStatusMsg('Autocomplete failed.');
      }
    };

    const delay = setTimeout(fetchSuggestions, 250);
    return () => clearTimeout(delay);
  }, [query, autocompleteService]);

  // Update status message when filtered suggestions change
  useEffect(() => {
    if (suggestions.length > 0) {
      setStatusMsg(
        `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'} available.`
      );
    } else if (rawSuggestions.length > 0) {
      // Have raw suggestions but none match language filter
      setStatusMsg('No suggestions for selected language.');
    } else {
      setStatusMsg('No suggestions.');
    }
  }, [suggestions.length, rawSuggestions.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
      setStatusMsg('Searching…');
    }
  };

  const handleSelect = (term: string) => {
    const terms = query.split(/\s+/);
    terms[terms.length - 1] = term;
    const updatedQuery = terms.join(' ').trim();

    setQuery(updatedQuery);
    setRawSuggestions([]);
    setHighlightedIndex(-1);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    setInputMethod('keyboard');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? suggestions.length - 1 : prev - 1,
      );
  } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  // ...existing code...
  return (
    <div className="relative w-full sm:w-auto">
      <form onSubmit={handleSubmit} className="p-1 flex gap-1">
        <label htmlFor={inputId} className="sr-only">Search keywords</label>
        <input
          ref={inputRef}
          type="text"
          className="border rounded p-0.5 w-full sm:w-40 text-sm text-black bg-white"
          placeholder="Keywords..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => setShowSuggestions(false)}
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-autocomplete="list"
          aria-activedescendant={
            highlightedIndex >= 0 ? `autocomplete-option-${highlightedIndex}` : undefined
          }
          id={inputId}
        />
        <button
          type="submit"
          className={`bg-blue-500 text-white p-0.5 rounded text-sm transition-opacity duration-200 min-w-[60px] relative ${
            searching ? 'opacity-75 cursor-not-allowed' : ''
          }`}
          disabled={searching}
        >
          {searching && (
            <svg className="animate-spin h-4 w-4 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          <span className={searching ? 'opacity-0' : 'opacity-100'}>
            Search
          </span>
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="absolute z-10 mt-1 w-full sm:w-60 bg-white border border-gray-300 rounded-lg shadow-lg text-sm text-gray-800 ring-1 ring-black/10"
          role="listbox"
          id={listboxId}
          onMouseLeave={() => {
            if (inputMethod === 'mouse') {
              setHighlightedIndex(-1);
            }
          }}
        >
          {suggestions.map((term, idx) => {
            const isHighlighted = highlightedIndex === idx;

            return (
              <li
                key={idx}
                id={`autocomplete-option-${idx}`}
                role="option"
                aria-selected={isHighlighted}
                className={`px-3 py-2 cursor-pointer transition-colors duration-100 ${
                  isHighlighted
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-800'
                }`}
                onMouseMove={() => {
                  if (highlightedIndex !== idx) {
                    setInputMethod('mouse');
                    setHighlightedIndex(idx);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input from losing focus
                  handleSelect(term);
                }}
              >
                {cleanAndSanitizeTerm(term)}
              </li>
            );
          })}
        </ul>
      )}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMsg}
      </div>
    </div>
  );
};

export default SearchBar;
