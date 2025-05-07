import React from 'react';

interface ErrorDialogProps {
  message: string;
  onDismiss: () => void;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({ message, onDismiss }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <button
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
