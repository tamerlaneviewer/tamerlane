import DOMPurify from 'dompurify';

export const getValue = (data) => {
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

export const renderHTML = (value) => {
  const safeString =
    typeof value === 'string'
      ? value.replace(/\n/g, '<br />')
      : getValue(value);
  return { __html: DOMPurify.sanitize(safeString) };
};

export const renderIIIFLinks = (items, sectionLabel) =>
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
