import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [inputMethod, setInputMethod] = useState<'mouse' | 'keyboard'>(
    'keyboard',
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const terms = query.split(/\s+/);
      const lastTerm = terms[terms.length - 1];

      if (!autocompleteService || lastTerm.length < 3) {
        setSuggestions([]);
        setHighlightedIndex(-1);
        return;
      }

      try {
        const res = await fetch(
          `${autocompleteService}?q=${encodeURIComponent(lastTerm)}`,
        );
        const data = await res.json();

        const items = data.items
          .filter((item: any) => {
            if (!selectedLanguage) return true;
            return !item.language || item.language === selectedLanguage;
          })
          .map((item: any) => item.value);

        setSuggestions(items.slice(0, 5));
        setHighlightedIndex(-1);
      } catch (err) {
        console.error('Autocomplete failed', err);
        setSuggestions([]);
        setHighlightedIndex(-1);
      }
    };

    const delay = setTimeout(fetchSuggestions, 250);
    return () => clearTimeout(delay);
  }, [query, autocompleteService, selectedLanguage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  };

  const handleSelect = (term: string) => {
    const terms = query.split(/\s+/);
    terms[terms.length - 1] = term;
    const updatedQuery = terms.join(' ').trim();

    setQuery(updatedQuery);
    setSuggestions([]);
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
        />
        <button
          type="submit"
          className={`bg-blue-500 text-white p-0.5 rounded text-sm transition-opacity duration-200 ${
            searching ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={searching}
        >
          Search
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="absolute z-10 mt-1 w-full sm:w-60 bg-white border border-gray-300 rounded-lg shadow-lg text-sm text-gray-800 ring-1 ring-black/10"
          role="listbox"
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
    </div>
  );
};

export default SearchBar;
