import React from "react";

const ManifestMetadata = ({ manifestMetadata }) => {
  if (!manifestMetadata) {
    return <p className="text-gray-500 p-4">No metadata available.</p>;
  }

  const getValue = (data) => {
    if (!data) return "Unknown";
    if (Array.isArray(data)) {
      return data.map((item) => (typeof item === "object" ? item?.none || item?.en || JSON.stringify(item) : item)).join(", ");
    }
    if (typeof data === "object" && data !== null) {
      return data.none || data.en || JSON.stringify(data, null, 2);
    }
    return String(data);
  };

  return (
    <div className="max-h-[400px] overflow-auto p-4 bg-white rounded-md shadow-md border border-gray-200">
      {/* Manifest Label */}
      {manifestMetadata.label && (
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Manifest</h2>
          <p className="text-md text-gray-700 font-semibold">{getValue(manifestMetadata.label)}</p>
        </div>
      )}

      {/* Metadata Section */}
      {manifestMetadata.metadata && manifestMetadata.metadata.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Metadata</h3>
          <div className="space-y-2">
            {manifestMetadata.metadata.map((entry, index) => (
              <div key={index} className="border-b border-gray-300 py-2">
                <strong className="text-sm text-gray-800">{getValue(entry.label)}:</strong>
                <p className="text-sm text-gray-700 break-words whitespace-pre-wrap leading-relaxed">
                  {getValue(entry.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider Information */}
      {manifestMetadata.provider && manifestMetadata.provider.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Provider</h3>
          {manifestMetadata.provider.map((provider, index) => (
            <div key={index} className="border-b border-gray-300 py-2">
              <p className="text-sm text-gray-700">{getValue(provider.label)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManifestMetadata;
