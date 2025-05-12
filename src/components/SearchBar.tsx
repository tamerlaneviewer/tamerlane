import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

interface SearchBarProps {
  onSearch: (query: string) => void;
  autocompleteService: string;
  selectedLanguage?: string;
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
}: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const terms = query.split(/\s+/);
      const lastTerm = terms[terms.length - 1];

      if (!autocompleteService || lastTerm.length < 3) {
        setSuggestions([]);
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
      } catch (err) {
        console.error('Autocomplete failed', err);
        setSuggestions([]);
      }
    };

    const delay = setTimeout(fetchSuggestions, 250);
    return () => clearTimeout(delay);
  }, [query, autocompleteService]);

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
    setShowSuggestions(false);

    // Do NOT search immediately; wait for user to press Search
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="p-1 flex gap-1">
        <input
          ref={inputRef}
          type="text"
          className="border rounded p-0.5 w-40 text-sm text-black bg-white"
          placeholder="Keywords..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-0.5 rounded text-sm"
        >
          Search
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-60 bg-white border border-gray-300 rounded-lg shadow-lg text-sm text-gray-800 ring-1 ring-black/10">
          {suggestions.map((term, idx) => (
            <li
              key={idx}
              className="px-3 py-2 hover:bg-blue-500 hover:text-white cursor-pointer transition-colors duration-100"
              onMouseDown={() => handleSelect(term)}
            >
              {cleanAndSanitizeTerm(term)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
