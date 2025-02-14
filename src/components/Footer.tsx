import React from "react";
import IIIFControls from "./IIIFControls.tsx"; // ✅ Import Navigation Controls

const Footer = ({ 
  currentIndex, 
  totalImages, 
  totalManifests, 
  onPreviousImage, 
  onNextImage, 
  onPreviousManifest, 
  onNextManifest 
}: { 
  currentIndex: number; 
  totalImages: number; 
  totalManifests: number; 
  onPreviousImage: () => void; 
  onNextImage: () => void; 
  onPreviousManifest: () => void; 
  onNextManifest: () => void; 
}) => {
  return (
    <footer className="bg-gray-900 text-white p-3 flex justify-center">
      <IIIFControls
        currentIndex={currentIndex}
        totalImages={totalImages}
        totalManifests={totalManifests}
        onPreviousImage={onPreviousImage}
        onNextImage={onNextImage}
        onPreviousManifest={onPreviousManifest}
        onNextManifest={onNextManifest}
      />
    </footer>
  );
};

export default Footer;
