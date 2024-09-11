import React from 'react';
import { Sliders, BarChart3 } from 'lucide-react';

const MixingConsole = ({ tracks, onMixingChange }) => {
  const handleVolumeChange = (trackId, newVolume) => {
    onMixingChange(trackId, { volume: newVolume });
  };

  const handlePanChange = (trackId, newPan) => {
    onMixingChange(trackId, { pan: newPan });
  };

  const handleMuteToggle = (trackId) => {
    onMixingChange(trackId, { muted: !tracks.find(t => t.id === trackId)?.muted });
  };

  const handleSoloToggle = (trackId) => {
    onMixingChange(trackId, { soloed: !tracks.find(t => t.id === trackId)?.soloed });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
      {tracks.map(track => (
        <div key={track.id} className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">{track.name}</h3>
          <div className="space-y-4">
            <div className="h-24 bg-gray-700 rounded-lg overflow-hidden">
              <div className="h-full bg-blue-500 opacity-50" style={{ width: '100%' }}></div>
            </div>
            <div className="flex items-center space-x-2">
              <span>Volume</span>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={track.volume}
                onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span>Pan</span>
              <input 
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={track.pan}
                onChange={(e) => handlePanChange(track.id, parseFloat(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex justify-between">
              <button 
                className={`px-2 py-1 rounded ${track.muted ? 'bg-red-600' : 'bg-gray-600'} hover:bg-opacity-80`}
                onClick={() => handleMuteToggle(track.id)}
              >
                {track.muted ? 'Unmute' : 'Mute'}
              </button>
              <button 
                className={`px-2 py-1 rounded ${track.soloed ? 'bg-green-600' : 'bg-gray-600'} hover:bg-opacity-80`}
                onClick={() => handleSoloToggle(track.id)}
              >
                {track.soloed ? 'Unsolo' : 'Solo'}
              </button>
              <button className="p-2 rounded-full hover:bg-gray-700">
                <Sliders className="h-4 w-4" />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-700">
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MixingConsole;