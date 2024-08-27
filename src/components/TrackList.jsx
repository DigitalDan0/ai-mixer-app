import React from 'react';
import './TrackList.css';

const TrackList = ({ tracks, onMixingChange }) => {
  const handleVolumeChange = (trackId, newVolume) => {
    onMixingChange(trackId, { volume: newVolume });
  };

  const handleMuteToggle = (trackId) => {
    const track = tracks.find(t => t.id === trackId);
    onMixingChange(trackId, { muted: !track.muted });
  };

  const handleSoloToggle = (trackId) => {
    const track = tracks.find(t => t.id === trackId);
    onMixingChange(trackId, { soloed: !track.soloed });
  };

  return (
    <div className="track-list">
      <h2>Tracks</h2>
      {tracks.map(track => (
        <div key={track.id} className="track-item">
          <div className="track-info">
            <span className="track-name">{track.name}</span>
            <button 
              className={`track-button ${track.muted ? 'active' : ''}`} 
              onClick={() => handleMuteToggle(track.id)}
            >
              {track.muted ? 'Unmute' : 'Mute'}
            </button>
            <button 
              className={`track-button ${track.soloed ? 'active' : ''}`} 
              onClick={() => handleSoloToggle(track.id)}
            >
              Solo
            </button>
          </div>
          <div className="track-controls">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.volume}
              onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
              className="volume-slider"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrackList;