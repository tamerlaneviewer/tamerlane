import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { ClipboardCopy } from 'lucide-react';
import { IIIFAnnotation } from '../types';

interface AnnotationsListProps {
  annotations: IIIFAnnotation[];
  onAnnotationSelect: (annotation: IIIFAnnotation) => void;
  selectedAnnotation?: IIIFAnnotation;
  selectedLanguage?: string;
  pendingAnnotationId?: string | null;
  onPendingAnnotationProcessed?: () => void;
  viewerReady?: boolean;
}

const AnnotationsList: React.FC<AnnotationsListProps> = ({
  annotations = [],
  onAnnotationSelect,
  selectedAnnotation,
  selectedLanguage,
  pendingAnnotationId,
  onPendingAnnotationProcessed,
  viewerReady = true,
}) => {
  const itemRefs = useRef<{ [id:string]: HTMLDivElement | null }>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedAnnotation?.id) {
      const ref = itemRefs.current[selectedAnnotation.id];
      if (ref) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ref.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  // Move keyboard focus to the selected item without scrolling the viewport
  try { (ref as any).focus({ preventScroll: true }); } catch { ref.focus(); }
      }
    }
  }, [selectedAnnotation]);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const renderHTML = (text: string, fallback: string = 'No text available') => {
    const safeString = (text || '').replace(/\n/g, '<br />');
    const sanitized = DOMPurify.sanitize(safeString);
    // Strip tags like <br> to detect if there is any visible content
    const visible = sanitized
      .replace(/<br\s*\/?>(\s|&nbsp;|&#160;)*?/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .trim();
    if (!visible) {
      const fb = fallback.replace(/\n/g, '<br />');
      return { __html: DOMPurify.sanitize(fb) };
    }
    return { __html: sanitized };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => setCopied(true))
      .catch((err) => console.error('Clipboard write failed:', err));
  };

  // Normalize IIIF body value which may be a string or a language map
  const getText = (value: any, preferredLang?: string): string | null => {
    if (typeof value === 'string') {
      const v = value.trim();
      return v ? v : null;
    }
    if (value && typeof value === 'object') {
      // Language map like { en: ["text"], de: ["text"] }
      if (preferredLang && Array.isArray(value[preferredLang]) && value[preferredLang].length > 0) {
        const v = String(value[preferredLang][0]).trim();
        return v ? v : null;
      }
      const keys = Object.keys(value);
      for (const k of keys) {
        const arr = (value as any)[k];
        if (Array.isArray(arr) && arr.length > 0) {
          const v = String(arr[0]).trim();
          if (v) return v;
        }
      }
    }
    return null;
  };

  return (
    <div className="relative">
      {annotations
        .map((annotation: IIIFAnnotation, index: number) => {
          const isSelected = selectedAnnotation?.id === annotation.id;
          const isTagging =
            isSelected &&
            (annotation.motivation === 'tagging' ||
              (Array.isArray(annotation.motivation) &&
                annotation.motivation.includes('tagging')));

          const selectionClass = isSelected
            ? isTagging
              ? 'bg-red-200 border-l-4 border-red-500'
              : 'bg-blue-200 border-l-4 border-blue-500'
            : 'hover:bg-gray-100';

          // Pre-compute items to render when annotation.body is an array
          let itemsToRender: any[] | null = null;
          if (Array.isArray(annotation.body)) {
            const base = annotation.body.filter((item) => !!getText(item.value, selectedLanguage));
            if (isSelected) {
              itemsToRender = base; // Always show content for the selected annotation
            } else {
              itemsToRender = base;
            }
          }

          return (
            <div
              key={annotation.id || index}
              ref={(el) => {
                if (annotation.id && el) {
                  itemRefs.current[annotation.id] = el;
                }
              }}
              onClick={() => onAnnotationSelect(annotation)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onAnnotationSelect(annotation);
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
              className={`mb-1 last:mb-0 p-1 cursor-pointer rounded transition-all scroll-mt-4 scroll-mb-4 ${selectionClass} group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`}
            >
              {Array.isArray(annotation.body) ? (
                itemsToRender && itemsToRender.length > 0 ? (
                  itemsToRender.map((item, itemIndex) => {
                    const text = getText(item.value, selectedLanguage);
                    if (!text) return null;
                    return (
            <div key={itemIndex} className="flex items-start gap-2">
                        <p
                          className="text-sm text-gray-700 leading-tight flex-1"
              dangerouslySetInnerHTML={renderHTML(text)}
                        />
                        {annotation.id && (
                          <div
                            title="Copy ID"
                            className="mt-0.5 shrink-0 text-gray-400 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-black"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(annotation.id!);
                            }}
                          >
                            <ClipboardCopy size={14} />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-700 leading-tight">No text available</p>
                )
              ) : (
                <div className="flex items-start gap-2">
                  {(() => {
                    const text = getText((annotation.body as any).value, selectedLanguage) || '';
                    return (
                      <p
                        className="text-sm text-gray-700 leading-tight flex-1"
                        dangerouslySetInnerHTML={renderHTML(text, 'No text available')}
                      />
                    );
                  })()}
                  {annotation.id && (
                    <div
                      title="Copy ID"
                      className="mt-0.5 shrink-0 text-gray-400 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-black"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(annotation.id!);
                      }}
                    >
                      <ClipboardCopy size={14} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

      {copied && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg text-sm">
          Copied to clipboard
        </div>
      )}
    </div>
  );
};

export default AnnotationsList;
