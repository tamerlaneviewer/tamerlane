import React, { useEffect, useRef } from 'react';

interface ErrorDialogProps {
  message: string;
  onDismiss: () => void;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({ message, onDismiss }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = (document.activeElement as HTMLElement) || null;
    // focus the close button when mounted
    closeRef.current?.focus();

  // Prevent background scroll while modal is open
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onDismiss();
      } else if (e.key === 'Tab') {
        // basic focus trap
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
      // restore focus
      previouslyFocused.current?.focus();
      // restore scroll
      document.body.style.overflow = prevOverflow;
    };
  }, [onDismiss]);

  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only dismiss if clicking the backdrop, not the dialog itself
    if (e.target === e.currentTarget) onDismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-dialog-title"
      aria-describedby="error-dialog-desc"
      onMouseDown={onBackdropClick}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 text-center"
      >
        <h2 id="error-dialog-title" className="text-lg font-semibold text-gray-800 mb-3">
          Something went wrong
        </h2>
        <p id="error-dialog-desc" className="text-sm text-gray-600 mb-5">{message}</p>
        <button
          ref={closeRef}
          onClick={onDismiss}
          className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default ErrorDialog;
