import React from 'react';
import DOMPurify from 'dompurify';

const ManifestMetadata = ({ manifestMetadata }) => {
  if (!manifestMetadata) {
    return <p className="text-gray-500 p-4">No metadata available.</p>;
  }

  const getValue = (data) => {
    if (!data) return 'Unknown';
    if (Array.isArray(data)) {
      return data
        .map((item) =>
          typeof item === 'object'
            ? item?.none || item?.en || JSON.stringify(item)
            : String(item),
        )
        .join(', ');
    }
    if (typeof data === 'object' && data !== null) {
      return data.none || data.en || JSON.stringify(data, null, 2);
    }
    return String(data);
  };

  const renderHTML = (value) => {
    const safeString =
      typeof value === 'string'
        ? value.replace(/\n/g, '<br />')
        : getValue(value);
    return { __html: DOMPurify.sanitize(safeString) };
  };

  // --- Reusable function for homepage/provider links ---
  const renderIIIFLinks = (items, sectionLabel) =>
    items &&
    items.length > 0 && (
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{sectionLabel}</h3>
        {items.flat().map((item, index) => {
          // Get label (supporting multilingual)
          let label = item.id;
          if (item.label) {
            if (typeof item.label === 'string') {
              label = item.label;
            } else if (item.label.en) {
              label = item.label.en[0];
            } else {
              const firstLang = Object.keys(item.label)[0];
              label = item.label[firstLang][0];
            }
          }
          return item.id ? (
            <div key={index} className="py-2 border-b border-gray-300">
              <a
                href={item.id}
                className="text-blue-600 underline text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            </div>
          ) : (
            <div
              key={index}
              className="py-2 border-b border-gray-300 text-gray-500 text-sm"
            >
              No link available.
            </div>
          );
        })}
      </div>
    );

  return (
    <div className="flex flex-col flex-grow h-full overflow-auto p-4 bg-white">
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
