import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { AnnotationText } from '../types/index';

// Define the expected prop types explicitly
interface AnnotationsListProps {
  annotations: AnnotationText[];
  onAnnotationSelect: (annotation: AnnotationText) => void;
}

const AnnotationsList: React.FC<AnnotationsListProps> = ({
  annotations = [],
  onAnnotationSelect,
}) => {
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<AnnotationText | null>(null);

  if (!annotations.length) {
    return <p className="text-gray-500 text-center">No annotations found.</p>;
  }

  // Function to extract and sanitize annotation text
  const renderHTML = (annotation: AnnotationText) => {
    const annotationText = Array.isArray(annotation.body)
      ? annotation.body.find((item) => typeof item.value === 'string')?.value ||
        'No text available'
      : 'No text available';

    // Ensure text is formatted properly (replace newlines with <br />)
    const safeString =
      typeof annotationText === 'string'
        ? annotationText.replace(/\n/g, '<br />')
        : annotationText;

    return { __html: DOMPurify.sanitize(safeString) };
  };

  return (
    <div className="flex flex-col flex-grow h-full overflow-auto p-2">
      {annotations.map((annotation, index) => {
        const isSelected = selectedAnnotation === annotation;

        return (
          <div
            key={index}
            className={`mb-1 p-1 cursor-pointer rounded transition-all ${
              isSelected
                ? 'bg-blue-200 border-l-4 border-blue-500'
                : 'hover:bg-gray-100'
            }`}
            onClick={() => {
              setSelectedAnnotation(annotation);
              onAnnotationSelect(annotation);
            }}
          >
            {/* Use dangerouslySetInnerHTML for sanitized and formatted text */}
            <p
              className="text-sm text-gray-700 leading-tight"
              dangerouslySetInnerHTML={renderHTML(annotation)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default AnnotationsList;
