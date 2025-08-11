import React, { useEffect, useRef } from 'react';

interface UrlDialogProps {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const UrlDialog: React.FC<UrlDialogProps> = ({ onSubmit }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const container = dialogRef.current;
        if (!container) return;
        const focusables = container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="url-dialog-title"
    >
      <div ref={dialogRef} className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 id="url-dialog-title" className="text-xl font-bold mb-4">Enter IIIF Content URL</h2>
        <form onSubmit={onSubmit}>
          <label htmlFor="iiifContentUrl" className="sr-only">IIIF Content URL</label>
          <input
            ref={inputRef}
            type="text"
            id="iiifContentUrl"
            name="iiifContentUrl"
            placeholder="Enter IIIF Content URL"
            className="border p-2 mb-4 w-full"
            required
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default UrlDialog;
