import React from 'react';

const TrackUpload = ({ onTrackUpload }) => {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.decodeAudioData(e.target.result, (buffer) => {
          const newTrack = {
            id: Date.now(),
            name: file.name,
            buffer: buffer,
            volume: 1,
            muted: false,
            soloed: false
          };
          onTrackUpload(newTrack);
        });
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="track-upload">
      <input 
        type="file" 
        onChange={handleFileChange}
        accept="audio/*"
      />
    </div>
  );
};

export default TrackUpload;