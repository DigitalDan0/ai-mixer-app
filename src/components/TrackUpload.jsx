import React, { useRef, useState } from 'react';

const TrackUpload = ({ onTrackUpload }) => {
  const fileInputRef = useRef(null);
  const [uploadErrors, setUploadErrors] = useState([]);

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    console.log('Files selected:', files);
    const errors = [];

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        console.log('File converted to ArrayBuffer');
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(buffer);
        console.log('AudioBuffer created');
        
        const newTrack = {
          id: Date.now() + Math.random(),
          name: file.name,
          buffer: audioBuffer,
          volume: 1,
          pan: 0,
          muted: false,
          soloed: false,
          eq: { low: 0, mid: 0, high: 0 },
          compression: { threshold: -24, ratio: 4 },
          effects: [],
          status: 'success'
        };
        
        console.log('New track object created:', newTrack);
        onTrackUpload(newTrack);
      } catch (error) {
        console.error('Error loading audio file:', error);
        errors.push({ name: file.name, error: error.message });
      }
    }

    if (errors.length > 0) {
      setUploadErrors(errors);
    }

    fileInputRef.current.value = '';
  };

  return (
    <div className="track-upload">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*"
        multiple
      />
      <button onClick={() => fileInputRef.current.click()}>
        Upload Tracks
      </button>
      {uploadErrors.length > 0 && (
        <div className="upload-errors">
          <h4>Upload Errors:</h4>
          <ul>
            {uploadErrors.map((error, index) => (
              <li key={index}>{error.name}: {error.error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TrackUpload;