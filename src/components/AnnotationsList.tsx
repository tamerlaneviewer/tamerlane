import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { ClipboardCopy } from 'lucide-react';
import { IIIFAnnotation } from '../types';
import { logger } from '../utils/logger.ts';

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
  viewerReady,
}) => {
  const itemRefs = useRef<{ [id:string]: HTMLDivElement | null }>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedAnnotation?.id) {
      const ref = itemRefs.current[selectedAnnotation.id];
    if (ref) {
  // Just focus the item - centering is handled by store ensureVisible
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
      .catch((err) => logger.error('Clipboard write failed:', err));
  };

  // Simple helper to get text from IIIF annotation body
  const getTextValue = (item: any): string | null => {
    if (!item.value) return null;
    
    // T1: Simple string
    if (typeof item.value === 'string') {
      return item.value.trim() || null;
    }
    
    // T2: Array of strings
    if (Array.isArray(item.value)) {
      return item.value[0]?.trim() || null;
    }
    
    return null;
  };

  // Check if an item matches the selected language
  const matchesLanguage = (item: any): boolean => {
    if (!selectedLanguage) return true;
    
    // Handle language as string or array
    if (item.language) {
      // T1: language is a string
      if (typeof item.language === 'string') {
        return item.language === selectedLanguage;
      }
      // T2: language is an array of strings
      if (Array.isArray(item.language)) {
        return item.language.includes(selectedLanguage);
      }
    }
    
    // No language specified - show for any language
    return true;
  };

  return (
    <div className="relative">
      {annotations
        .filter((annotation: IIIFAnnotation) => {
          if (!selectedLanguage) return true;

          if (Array.isArray(annotation.body)) {
            return annotation.body.some((item) => matchesLanguage(item));
          }

          return matchesLanguage(annotation.body);
        })
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

          return (
            <div
              key={annotation.id || index}
              data-annotation-id={annotation.id || undefined}
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
              onFocus={() => {
                // No custom centering needed here
              }}
              className={`mb-1 last:mb-0 p-1 cursor-pointer rounded transition-all scroll-mt-4 scroll-mb-4 ${selectionClass} group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`}
            >
              {Array.isArray(annotation.body) ? (
                annotation.body
                  .filter((item) => {
                    const text = getTextValue(item);
                    if (!text) return false;
                    
                    // Always filter by language, even for selected annotations
                    return matchesLanguage(item);
                  })
                  .map((item, itemIndex) => {
                    const text = getTextValue(item);
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
                (() => {
                  const text = getTextValue(annotation.body);
                  return text ? (
                    <div className="flex items-start gap-2">
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
                  ) : (
                    <p className="text-sm text-gray-700 leading-tight">No text available</p>
                  );
                })()
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
