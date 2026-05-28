import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { ClipboardCopy, Share2 } from 'lucide-react';
import { IIIFAnnotation } from '../types';
import { logger } from '../utils/logger.ts';
import { encodeContentState } from '../utils/contentState.ts';

interface AnnotationsListProps {
  annotations: IIIFAnnotation[];
  onAnnotationSelect: (annotation: IIIFAnnotation) => void;
  selectedAnnotation?: IIIFAnnotation;
  selectedLanguage?: string;
  selectedMotivation?: string | null;
  pendingAnnotationId?: string | null;
  onPendingAnnotationProcessed?: () => void;
  viewerReady?: boolean;
  manifestUrl?: string;
  resourceUrl?: string;
}

const AnnotationsList: React.FC<AnnotationsListProps> = ({
  annotations = [],
  onAnnotationSelect,
  selectedAnnotation,
  selectedLanguage,
  selectedMotivation = null,
  pendingAnnotationId,
  onPendingAnnotationProcessed,
  viewerReady,
  manifestUrl,
  resourceUrl,
}) => {
  const itemRefs = useRef<{ [id:string]: HTMLDivElement | null }>({});
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  useEffect(() => {
    if (copiedLink) {
      const timeout = setTimeout(() => setCopiedLink(false), 1500);
      return () => clearTimeout(timeout);
    }
  }, [copiedLink]);

  const actionButtonClass =
    'mt-0.5 shrink-0 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-black focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded';

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

  const copyShareLink = (annotation: IIIFAnnotation) => {
    if (!manifestUrl || !annotation.target?.[0]) return;
    const encoded = encodeContentState(
      annotation.target[0],
      manifestUrl,
      annotation.id,
      resourceUrl,
    );
    const params = new URLSearchParams({ 'iiif-content': encoded });
    if (resourceUrl) {
      params.set('iiif-resource', resourceUrl);
    }
    params.set('iiif-manifest', manifestUrl);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard
      .writeText(url)
      .then(() => setCopiedLink(true))
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

  const filteredAnnotations = annotations.filter((annotation: IIIFAnnotation) => {
    if (!selectedLanguage) return true;

    if (Array.isArray(annotation.body)) {
      return annotation.body.some((item) => matchesLanguage(item));
    }

    return matchesLanguage(annotation.body);
  });

  const motivationFilteredAnnotations = selectedMotivation
    ? filteredAnnotations.filter((annotation: IIIFAnnotation) => {
        const m = annotation.motivation;
        if (Array.isArray(m)) return m.includes(selectedMotivation);
        return m === selectedMotivation;
      })
    : filteredAnnotations;

  // Show language filtering message if we have annotations but none match the language
  if (selectedLanguage && annotations.length > 0 && filteredAnnotations.length === 0) {
    return (
      <div className="relative">
        <p className="text-gray-500 text-center p-4">
          No annotations match the selected language.
        </p>
      </div>
    );
  }

  // Show motivation filtering message if we have language-filtered annotations but none match the motivation
  if (selectedMotivation && filteredAnnotations.length > 0 && motivationFilteredAnnotations.length === 0) {
    return (
      <div className="relative">
        <p className="text-gray-500 text-center p-4">
          No annotations match the selected motivation filter.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {motivationFilteredAnnotations.map((annotation: IIIFAnnotation, index: number) => {
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
              className={`relative mb-1 last:mb-0 p-1 cursor-pointer rounded transition-all scroll-mt-4 scroll-mb-4 ${selectionClass} group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`}
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
                          <button
                            type="button"
                            aria-label="Copy annotation URI to clipboard"
                            title="Copy annotation URI"
                            className={actionButtonClass}
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(annotation.id!);
                            }}
                          >
                            <ClipboardCopy size={14} />
                          </button>
                        )}
                        {manifestUrl && annotation.target?.[0] && (
                          <button
                            type="button"
                            aria-label="Copy deep link that opens this annotation in the viewer"
                            title="Copy deep link to this annotation"
                            className={actionButtonClass}
                            onClick={(e) => {
                              e.stopPropagation();
                              copyShareLink(annotation);
                            }}
                          >
                            <Share2 size={14} />
                          </button>
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
                        <button
                          type="button"
                          aria-label="Copy annotation URI to clipboard"
                          title="Copy annotation URI"
                          className={actionButtonClass}
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(annotation.id!);
                          }}
                        >
                          <ClipboardCopy size={14} />
                        </button>
                      )}
                      {manifestUrl && annotation.target?.[0] && (
                        <button
                          type="button"
                          aria-label="Copy deep link that opens this annotation in the viewer"
                          title="Copy deep link to this annotation"
                          className={actionButtonClass}
                          onClick={(e) => {
                            e.stopPropagation();
                            copyShareLink(annotation);
                          }}
                        >
                          <Share2 size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 leading-tight">No text available</p>
                  );
                })()
              )}
              {annotation.motivation && (() => {
                const isTranscribing = Array.isArray(annotation.motivation)
                  ? annotation.motivation.includes('transcribing')
                  : annotation.motivation === 'transcribing';
                const motivationText = Array.isArray(annotation.motivation)
                  ? annotation.motivation.join(', ')
                  : annotation.motivation;
                const generatorName =
                  isTranscribing &&
                  annotation.generator &&
                  typeof annotation.generator === 'object'
                    ? annotation.generator.name
                    : null;
                const toneClass = isTranscribing
                  ? 'text-red-700 ring-red-300'
                  : 'text-gray-600 ring-gray-200';
                return (
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0.5 right-1 z-20 text-[11px] italic bg-white rounded px-1.5 py-0.5 shadow ring-1 opacity-0 group-hover:animate-motivation-hint pointer-events-none whitespace-nowrap ${toneClass}`}
                  >
                    {generatorName ? `${motivationText}: ${generatorName}` : motivationText}
                  </span>
                );
              })()}
            </div>
          );
        })}

      {copied && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg text-sm">
          Copied to clipboard
        </div>
      )}
      {copiedLink && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg text-sm">
          Link copied!
        </div>
      )}
    </div>
  );
};

export default AnnotationsList;
