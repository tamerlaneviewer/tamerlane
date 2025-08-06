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

  // Handle pending annotation selection from search results
  useEffect(() => {
    if (!pendingAnnotationId || annotations.length === 0 || !viewerReady)
      return;

    const match = annotations.find((anno) => anno.id === pendingAnnotationId);
    if (match) {
      onAnnotationSelect(match);
      if (onPendingAnnotationProcessed) {
        onPendingAnnotationProcessed();
      }
    } else {
      console.warn('Could not find annotation for ID:', pendingAnnotationId);
    }
  }, [
    annotations,
    pendingAnnotationId,
    viewerReady,
    onAnnotationSelect,
    onPendingAnnotationProcessed,
  ]);

  useEffect(() => {
    if (selectedAnnotation?.id) {
      const ref = itemRefs.current[selectedAnnotation.id];
      if (ref) {
        ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedAnnotation]);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const renderHTML = (text: string) => {
    const safeString = text.replace(/\n/g, '<br />');
    return { __html: DOMPurify.sanitize(safeString) };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => setCopied(true))
      .catch((err) => console.error('Clipboard write failed:', err));
  };

  return (
    <div className="relative flex flex-col flex-grow h-full overflow-auto p-2">
      {annotations
        .filter((annotation: IIIFAnnotation) => {
          if (!selectedLanguage) return true;

          if (Array.isArray(annotation.body)) {
            return annotation.body.some(
              (item) => item.language === selectedLanguage || !item.language,
            );
          }

          return (
            annotation.body.language === selectedLanguage ||
            !annotation.body.language
          );
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
              ref={(el) => {
                if (annotation.id && el) {
                  itemRefs.current[annotation.id] = el;
                }
              }}
              onClick={() => onAnnotationSelect(annotation)}
              className={`mb-1 p-1 cursor-pointer rounded transition-all ${selectionClass} group`}
            >
              {Array.isArray(annotation.body) ? (
                annotation.body
                  .filter(
                    (item) =>
                      typeof item.value === 'string' &&
                      item.value.trim() !== '' &&
                      (item.language === selectedLanguage || !item.language),
                  )
                  .map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start gap-2">
                      <p
                        className="text-sm text-gray-700 leading-tight flex-1"
                        dangerouslySetInnerHTML={renderHTML(item.value)}
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
                  ))
              ) : annotation.body.language === selectedLanguage ||
                !annotation.body.language ? (
                <div className="flex items-start gap-2">
                  <p
                    className="text-sm text-gray-700 leading-tight flex-1"
                    dangerouslySetInnerHTML={renderHTML(annotation.body.value)}
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
                <p className="text-sm text-gray-700 leading-tight">
                  No text available
                </p>
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
