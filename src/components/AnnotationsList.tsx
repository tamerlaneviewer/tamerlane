import React from 'react';

const AnnotationsList = ({ annotations = [] }) => {
  if (!annotations.length) {
    return <p className="text-gray-500 text-center">No annotations found.</p>;
  }

  return (
    <div>
      {annotations.map((annotation, index) => (
        <div key={index} className="border p-2 mb-2 rounded shadow-sm">
          <p className="font-semibold">Annotation {index + 1}</p>
          <p className="text-sm text-gray-700">{annotation.text || "Sample annotation text"}</p>
        </div>
      ))}
    </div>
  );
};

export default AnnotationsList;
