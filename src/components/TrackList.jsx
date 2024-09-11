import React from 'react';
import { Mic2 } from "lucide-react";

const TrackList = ({ tracks, onMuteToggle, onVolumeChange }) => {
  return (
    <div className="space-y-4">
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