import React, { useState, useRef, useEffect } from 'react';
import { MOTIVATIONS } from '../config/appConfig.ts';

interface FilterPanelProps {
  availableLanguages: Array<{ code: string; name: string }>;
  selectedLanguage: string | null;
  onLanguageChange: (lang: string) => void;
  selectedMotivation: string | null;
  onMotivationSelect: (motivation: string | null) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  availableLanguages,
  selectedLanguage,
  onLanguageChange,
  selectedMotivation,
  onMotivationSelect,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="h-9 bg-slate-600 text-white px-3 text-sm rounded hover:bg-slate-500 cursor-pointer flex items-center gap-1.5"
        aria-expanded={open}
        aria-haspopup="true"
        title="Show annotation filters"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z"
            clipRule="evenodd"
          />
        </svg>
        Filters
      </button>

      {open && (
        <div
          role="group"
          aria-label="Annotation filters"
          className="absolute right-0 top-full mt-1 bg-slate-700 rounded shadow-xl p-3 flex flex-col gap-3 z-50 min-w-[180px]"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-300 uppercase tracking-wide font-medium">
              Language
            </label>
            <select
              value={selectedLanguage || ''}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="h-8 bg-slate-600 text-white px-2 text-sm rounded border-0 hover:bg-slate-500 cursor-pointer"
              aria-label="Select annotation language"
              title="Filters annotations and search results by language"
            >
              {availableLanguages.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-700 text-white">
                  {lang.code.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-300 uppercase tracking-wide font-medium">
              Motivation
            </label>
            <select
              value={selectedMotivation || ''}
              onChange={(e) => onMotivationSelect(e.target.value || null)}
              className="h-8 bg-slate-600 text-white px-2 text-sm rounded border-0 hover:bg-slate-500 cursor-pointer"
              aria-label="Filter by motivation"
              title="Filter annotations and search results by motivation"
            >
              <option value="" className="bg-slate-700 text-white">Any motivation</option>
              {MOTIVATIONS.map((motivation) => (
                <option key={motivation} value={motivation} className="bg-slate-700 text-white">
                  {motivation}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
