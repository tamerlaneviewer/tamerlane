import React from 'react';
import { getValue, renderHTML, renderIIIFLinks } from '../utils/metadata.tsx';

const ManifestMetadata = ({ manifestMetadata }) => {
  if (!manifestMetadata) {
    return <p className="text-gray-500 p-4">No metadata available.</p>;
  }

  return (
    <div className="flex flex-col flex-grow h-full bg-white">
      {/* Manifest Label */}
      {manifestMetadata.label && (
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Manifest</h2>
          <p
            className="text-md text-blue-700 font-semibold"
            dangerouslySetInnerHTML={renderHTML(
              getValue(manifestMetadata.label),
            )}
          />
        </div>
      )}

      {/* Metadata Section */}
      {manifestMetadata.metadata && manifestMetadata.metadata.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Metadata</h3>
          <div className="space-y-2">
            {manifestMetadata.metadata.map((entry, index) => (
              <div key={index} className="py-2 border-b border-gray-300">
                <strong className="text-sm text-gray-800">
                  {getValue(entry.label)}:
                </strong>
                <p
                  className="text-sm text-gray-700 break-words whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={renderHTML(getValue(entry.value))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider Information */}
      {renderIIIFLinks(manifestMetadata.provider, 'Provider')}

      {/* Homepage Information */}
      {renderIIIFLinks(manifestMetadata.homepage, 'Homepage')}

      {/* Required Statement */}
      {manifestMetadata.requiredStatement && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {getValue(manifestMetadata.requiredStatement.label)}
          </h3>
          <p
            className="text-sm text-gray-700"
            dangerouslySetInnerHTML={renderHTML(
              getValue(manifestMetadata.requiredStatement.value),
            )}
          />
        </div>
      )}
    </div>
  );
};

export default ManifestMetadata;
