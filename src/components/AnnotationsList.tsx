import React from 'react';
import DOMPurify from 'dompurify';
import { AnnotationText } from '../types/index'; // Ensure correct type import

// Define the expected prop types explicitly
interface AnnotationsListProps {
  annotations: AnnotationText[];
}

const AnnotationsList: React.FC<AnnotationsListProps> = ({ annotations = [] }) => {
  if (!annotations.length) {
    return <p className="text-gray-500 text-center">No annotations found.</p>;
  }

  // Function to extract and sanitize annotation text
  const renderHTML = (annotation: AnnotationText) => {
    const annotationText = Array.isArray(annotation.body)
      ? annotation.body.find((item) => typeof item.value === "string")?.value || "No text available"
      : "No text available";

    // Ensure text is formatted properly (replace newlines with <br />)
    const safeString = typeof annotationText === "string"
      ? annotationText.replace(/\n/g, "<br />")
      : annotationText;

    return { __html: DOMPurify.sanitize(safeString) };
  };

  return (
    <div>
      {annotations.map((annotation, index) => (
        <div key={index} className="mb-2">
          {/* Use dangerouslySetInnerHTML for sanitized and formatted text */}
          <p className="text-sm text-gray-700"
             dangerouslySetInnerHTML={renderHTML(annotation)}
          />
        </div>
      ))}
    </div>
  );
};

export default AnnotationsList;
