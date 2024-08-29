import React from 'react';
import './TrackList.css';

const TrackList = ({ tracks, onMixingChange }) => {
  const handleVolumeChange = (trackId, volume) => {
    onMixingChange(trackId, { volume: parseFloat(volume) });
  };

  const handlePanChange = (trackId, pan) => {
    onMixingChange(trackId, { pan: parseFloat(pan) });
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
      {tracks.map(track => (
        <div key={track.id} className="track">
          <div className="track-name">{track.name}</div>
          <div className="track-controls">
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={track.volume}
              onChange={(e) => handleVolumeChange(track.id, e.target.value)}
            />
            <span>{track.volume.toFixed(2)}</span>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={track.pan}
              onChange={(e) => handlePanChange(track.id, e.target.value)}
            />
            <span>{track.pan.toFixed(2)}</span>
            <button
              className={`mute-button ${track.muted ? 'active' : ''}`}
              onClick={() => handleMuteToggle(track.id)}
            >
              M
            </button>
            <button
              className={`solo-button ${track.soloed ? 'active' : ''}`}
              onClick={() => handleSoloToggle(track.id)}
            >
              S
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrackList;