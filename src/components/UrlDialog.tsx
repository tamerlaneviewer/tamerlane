import React from 'react';

interface UrlDialogProps {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const UrlDialog: React.FC<UrlDialogProps> = ({ onSubmit }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
      <div className="bg-white p-6 rounded shadow-lg">
        <h2 className="text-xl font-bold mb-4">Enter IIIF Content URL</h2>
        <form onSubmit={onSubmit}>
          <input
            type="text"
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
