import React from 'react';
import { Mic2, Upload } from "lucide-react";

const TrackList = ({ tracks, onTrackUpload, onMuteToggle, onVolumeChange }) => {
  const fileInputRef = React.useRef(null);

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
    <div className="space-y-4">
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
      {tracks.map(track => (
        <div key={track.id} className="flex items-center space-x-2 p-2 bg-gray-700 rounded-lg">
          <div className={`w-2 h-8 ${track.status === 'error' ? 'bg-red-500' : 'bg-blue-500'} rounded-full`}></div>
          <span>{track.name}</span>
          <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500"
              style={{ width: `${track.volume * 100}%` }}
            ></div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={track.volume}
            onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
            className="w-20"
          />
          <button className="p-1 rounded-full hover:bg-gray-600" onClick={() => onMuteToggle(track.id)}>
            <Mic2 className={`h-4 w-4 ${track.muted ? 'text-red-500' : 'text-white'}`} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default TrackList;