import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

const cleanAndSanitizeTerm = (value: string): string => {
  const stripped = value
    .replace(/<\/?[^>]+(>|$)/g, '') // remove HTML tags
    .replace(/&[^;\s]+;/g, '') // remove HTML entities
    .trim();
  return DOMPurify.sanitize(stripped);
};

const SearchBar = ({ onSearch }: { onSearch: (query: string) => void }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const res = await fetch(
          `http://localhost:3000/issue1041/autocomplete?q=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        const terms = data.items.map((item: any) => item.value);
        setSuggestions(terms.slice(0, 5));
      } catch (err) {
        console.error('Autocomplete failed', err);
        setSuggestions([]);
      }
    };

    const delay = setTimeout(fetchSuggestions, 250); // debounce
    return () => clearTimeout(delay);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query) onSearch(query);
    setShowSuggestions(false);
  };

  const handleSelect = (term: string) => {
    setQuery(term);
    setSuggestions([]);
    setShowSuggestions(false);
    onSearch(term);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="p-1 flex gap-1">
        <input
          ref={inputRef}
          type="text"
          className="border rounded p-0.5 w-32 text-sm text-black bg-white"
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
        <ul className="absolute z-10 mt-1 w-52 bg-white border border-gray-300 rounded-lg shadow-lg text-sm text-gray-800 ring-1 ring-black/10">
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
