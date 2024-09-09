import React from 'react';
import './TrackList.css';

const TrackList = ({ tracks, onMixingChange }) => {
  const handleChange = (trackId, parameter, value) => {
    const parsedValue = parseFloat(value);
    if (parameter.includes('.')) {
      const [mainParam, subParam] = parameter.split('.');
      onMixingChange(trackId, { [mainParam]: { [subParam]: parsedValue } });
    } else {
      onMixingChange(trackId, { [parameter]: parsedValue });
    }
  };

  return (
    <div className="track-list">
      {tracks.map(track => (
        <div key={track.id} className="track">
          <div className="track-name">{track.name}</div>
          <div className="track-controls">
            <div className="control-group">
              <label>Volume</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={track.volume}
                onChange={(e) => handleChange(track.id, 'volume', e.target.value)}
              />
              <span>{track.volume.toFixed(2)}</span>
            </div>
            <div className="control-group">
              <label>Pan</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={track.pan}
                onChange={(e) => handleChange(track.id, 'pan', e.target.value)}
              />
              <span>{track.pan.toFixed(2)}</span>
            </div>
            <div className="eq-controls">
              <h4>EQ</h4>
              {['low', 'mid', 'high'].map(band => (
                <div key={band} className="control-group">
                  <label>{band.charAt(0).toUpperCase() + band.slice(1)}</label>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.1"
                    value={track.eq[band]}
                    onChange={(e) => handleChange(track.id, `eq.${band}`, e.target.value)}
                  />
                  <span>{track.eq[band].toFixed(1)} dB</span>
                </div>
              ))}
            </div>
            <div className="compression-controls">
              <h4>Compression</h4>
              <div className="control-group">
                <label>Threshold</label>
                <input
                  type="range"
                  min="-60"
                  max="0"
                  step="1"
                  value={track.compression.threshold}
                  onChange={(e) => handleChange(track.id, 'compression.threshold', e.target.value)}
                />
                <span>{track.compression.threshold} dB</span>
              </div>
              <div className="control-group">
                <label>Ratio</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.1"
                  value={track.compression.ratio}
                  onChange={(e) => handleChange(track.id, 'compression.ratio', e.target.value)}
                />
                <span>{track.compression.ratio}:1</span>
              </div>
            </div>
            <div className="track-buttons">
              <button
                className={`mute-button ${track.muted ? 'active' : ''}`}
                onClick={() => handleChange(track.id, 'muted', !track.muted)}
              >
                M
              </button>
              <button
                className={`solo-button ${track.soloed ? 'active' : ''}`}
                onClick={() => handleChange(track.id, 'soloed', !track.soloed)}
              >
                S
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrackList;