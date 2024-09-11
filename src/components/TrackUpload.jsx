import React, { useRef } from 'react';
import { Upload } from "lucide-react";

const TrackUpload = ({ onTrackUpload }) => {
  const fileInputRef = useRef(null);

  const handleTrackUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const newTrack = {
          id: Date.now() + Math.random(),
          name: file.name,
          arrayBuffer: arrayBuffer,
          volume: 1,
          pan: 0,
          muted: false,
          soloed: false,
          eq: { low: 0, mid: 0, high: 0 },
          compression: { threshold: -24, ratio: 4 },
          effects: [],
          status: 'pending'
        };
        onTrackUpload(newTrack);
      } catch (error) {
        console.error('Error loading audio file:', error);
        // Handle error (e.g., show error message to user)
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <label className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer">
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*"
        className="hidden"
        onChange={handleTrackUpload}
        multiple
      />
      <Upload className="h-8 w-8 mx-auto mb-2" />
      <p>Drag & Drop files here</p>
    </label>
  );
};

export default TrackUpload;