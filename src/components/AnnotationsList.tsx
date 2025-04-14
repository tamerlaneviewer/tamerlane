import React, { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { IIIFAnnotation } from '../types';

interface AnnotationsListProps {
  annotations: IIIFAnnotation[];
  onAnnotationSelect: (annotation: IIIFAnnotation) => void;
  selectedAnnotation?: IIIFAnnotation;
  selectedLanguage?: string;
}

const AnnotationsList: React.FC<AnnotationsListProps> = ({
  annotations = [],
  onAnnotationSelect,
  selectedAnnotation,
  selectedLanguage,
}) => {
  // Create a stable ref map only once per render cycle
  const itemRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  // Scroll to selected annotation
  useEffect(() => {
    if (selectedAnnotation?.id) {
      const ref = itemRefs.current[selectedAnnotation.id];
      if (ref) {
        ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedAnnotation]);

  const renderHTML = (text: string) => {
    const safeString = text.replace(/\n/g, '<br />');
    return { __html: DOMPurify.sanitize(safeString) };
  };

  return (
    <div className="flex flex-col flex-grow h-full overflow-auto p-2">
      {annotations
        .filter((annotation: IIIFAnnotation) => {
          // If no language is selected, show all annotations
          if (!selectedLanguage) {
            return true;
          }

          // If body is an array, check if any of the items match the selected language
          if (Array.isArray(annotation.body)) {
            return annotation.body.some(
              (item) => item.language === selectedLanguage || !item.language,
            );
          } else {
            // If body is a single object, check its language
            return (
              annotation.body.language === selectedLanguage ||
              !annotation.body.language
            );
          }
        })
        .map((annotation: IIIFAnnotation, index) => {
          const isSelected = selectedAnnotation?.id === annotation.id;

          return (
            <div
              key={annotation.id || index}
              ref={(el) => {
                if (annotation.id && el) {
                  itemRefs.current[annotation.id] = el;
                }
              }}
              className={`mb-1 p-1 cursor-pointer rounded transition-all ${
                isSelected
                  ? 'bg-blue-200 border-l-4 border-blue-500'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => onAnnotationSelect(annotation)}
            >
              {Array.isArray(annotation.body) ? (
                annotation.body
                  .filter((item) => {
                    return (
                      typeof item.value === 'string' &&
                      item.value.trim() !== '' &&
                      (item.language === selectedLanguage || !item.language)
                    );
                  })
                  .map((item, itemIndex) => (
                    <p
                      key={itemIndex}
                      className="text-sm text-gray-700 leading-tight"
                      dangerouslySetInnerHTML={renderHTML(item.value)}
                    />
                  ))
              ) : annotation.body.language === selectedLanguage ||
                !annotation.body.language ? (
                <p
                  className="text-sm text-gray-700 leading-tight"
                  dangerouslySetInnerHTML={renderHTML(annotation.body.value)}
                />
              ) : (
                <p className="text-sm text-gray-700 leading-tight">
                  No text available
                </p>
              )}
            </div>
          );
        })}
    </div>
  );
};

export default AnnotationsList;
