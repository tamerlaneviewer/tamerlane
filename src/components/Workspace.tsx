import React, { useState } from "react";
import { ImageIcon } from "lucide-react"; // Minimal placeholder icon

const Workspace = () => {
  const manifests = [
    { id: "manifest-1", label: "A" },
    { id: "manifest-2", label: "B" },
    { id: "manifest-3", label: "C" },
    { id: "manifest-4", label: "D" },
    { id: "manifest-5", label: "E" },
  ];

  const [selectedManifest, setSelectedManifest] = useState<string | null>(null);

  return (
    <div className="fixed bottom-0 w-full bg-gray-800 text-white p-2">
      <div className="flex space-x-2 overflow-x-auto items-center">
        {manifests.map((manifest) => (
          <div
            key={manifest.id}
            className={`cursor-pointer p-1 border ${
              selectedManifest === manifest.id ? "border-blue-500" : "border-transparent"
            } rounded`}
            onClick={() => setSelectedManifest(manifest.id)}
          >
            <div className="w-16 h-16 flex items-center justify-center bg-gray-700 rounded-md">
              <ImageIcon className="text-gray-400 w-8 h-8" /> {/* Placeholder Icon */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Workspace;
