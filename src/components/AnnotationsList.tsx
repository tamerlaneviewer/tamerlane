import React from 'react';
import { AnnotationText } from '../types/index'; // Ensure correct type import

// Define the expected prop types explicitly
interface AnnotationsListProps {
  annotations: AnnotationText[];
}

const AnnotationsList: React.FC<AnnotationsListProps> = ({ annotations = [] }) => {
  if (!annotations.length) {
    return <p className="text-gray-500 text-center">No annotations found.</p>;
  }

  return (
    <div>
      {annotations.map((annotation: AnnotationText, index) => {
        // Ensure TypeScript recognizes `body` exists and has valid text
        const annotationText = Array.isArray(annotation.body)
          ? annotation.body.find((item) => typeof item.value === "string")?.value || "No text available"
          : "No text available";

        return (
          <div key={index} className="mb-2">
            {/* Display the annotation text directly */}
            <p className="text-sm text-gray-700">{annotationText}</p>
          </div>
        );
      })}
    </div>
  );
};

export default AnnotationsList;
