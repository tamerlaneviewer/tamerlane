import React from 'react';
import { getValue, renderHTML, renderIIIFLinks } from '../utils/metadata.tsx';

const CollectionMetadata = ({ collectionMetadata }) => {
  const hasCollection =
    collectionMetadata &&
    typeof collectionMetadata.label === 'string' &&
    collectionMetadata.label.trim().length > 0;

  if (!hasCollection) {
    return (
      <p className="text-gray-500 text-center">Not part of a collection.</p>
    );
  }

  return (
    <div className="flex flex-col flex-grow h-full overflow-auto p-4 bg-white">
      {/* Collection Label */}
      {collectionMetadata.label && (
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Collection</h2>
          <p
            className="text-md text-blue-700 font-semibold"
            dangerouslySetInnerHTML={renderHTML(
              getValue(collectionMetadata.label),
            )}
          />
        </div>
      )}

      {/* Metadata Section */}
      {collectionMetadata.metadata &&
        collectionMetadata.metadata.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Metadata</h3>
            <div className="space-y-2">
              {collectionMetadata.metadata.map((entry, index) => (
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
      {renderIIIFLinks(collectionMetadata.provider, 'Provider')}

      {/* Homepage Information */}
      {renderIIIFLinks(collectionMetadata.homepage, 'Homepage')}

      {/* Required Statement */}
      {collectionMetadata.requiredStatement && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {getValue(collectionMetadata.requiredStatement.label)}
          </h3>
          <p
            className="text-sm text-gray-700"
            dangerouslySetInnerHTML={renderHTML(
              getValue(collectionMetadata.requiredStatement.value),
            )}
          />
        </div>
      )}
    </div>
  );
};

export default CollectionMetadata;
