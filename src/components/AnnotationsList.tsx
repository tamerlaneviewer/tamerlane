import React from 'react';
import DOMPurify from 'dompurify';
import { IIIFAnnotation } from '../types/index';

// Updated prop types
interface AnnotationsListProps {
  annotations: IIIFAnnotation[];
  onAnnotationSelect: (annotation: IIIFAnnotation) => void;
  selectedAnnotation: IIIFAnnotation | null;
}

const AnnotationsList: React.FC<AnnotationsListProps> = ({
  annotations = [],
  onAnnotationSelect,
  selectedAnnotation,
}) => {
  if (!annotations.length) {
    return <p className="text-gray-500 text-center">No annotations found.</p>;
  }

  // Function to sanitize annotation text
  const renderHTML = (text: string) => {
    const safeString = text.replace(/\n/g, '<br />');
    return { __html: DOMPurify.sanitize(safeString) };
  };

  return (
    <div className="flex flex-col flex-grow h-full overflow-auto p-2">
      {annotations.map((annotation: IIIFAnnotation, index) => {
        const isSelected = selectedAnnotation?.id === annotation.id;

        return (
          <div
            key={index}
            className={`mb-1 p-1 cursor-pointer rounded transition-all ${
              isSelected
                ? 'bg-blue-200 border-l-4 border-blue-500'
                : 'hover:bg-gray-100'
            }`}
            onClick={() => onAnnotationSelect(annotation)}
          >
            {Array.isArray(annotation.body) && annotation.body.length > 0 ? (
              annotation.body
                .filter(
                  (item: { value?: string }) =>
                    typeof item.value === 'string' && item.value.trim() !== '',
                )
                .map((item: { value?: string }, itemIndex: number) => (
                  <p
                    key={itemIndex}
                    className="text-sm text-gray-700 leading-tight"
                    dangerouslySetInnerHTML={renderHTML(item.value as string)}
                  />
                ))
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
