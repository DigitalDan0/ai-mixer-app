import React from 'react';
import TrackList from './TrackList';
import TrackUpload from './TrackUpload';
import AIAssistant from './AIAssistant';
import AudioVisualizer from './AudioVisualizer';
import './MixingStage.css';

const MixingStage = ({
  tracks,
  onTrackUpload,
  onMixingChange,
  onAIRequest,
  onApplyAIMix,
  isAIMixApplied,
  analyserNode,
  isPlaying,
  onPlayPause,
  onGenerateSuggestion,
  aiSuggestion,
  onDeleteErrorTracks
}) => {
  const errorTracks = tracks.filter(track => track.status === 'error');

  return (
    <div className="mixing-stage">
      <h2>Mixing Stage</h2>
      <div className="mixing-controls">
        <TrackUpload onTrackUpload={onTrackUpload} />
        <div className="playback-controls">
          <button onClick={onPlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
        </div>
      </div>
      {errorTracks.length > 0 && (
        <div className="error-tracks">
          <h3>Tracks with Errors</h3>
          {errorTracks.map(track => (
            <div key={track.id} className="error-track">
              <p><strong>{track.name}</strong>: {track.errorMessage}</p>
            </div>
          ))}
          <button onClick={onDeleteErrorTracks}>Delete Error Tracks</button>
        </div>
      )}
      <div className="mixing-workspace">
        <TrackList tracks={tracks.filter(track => track.status !== 'error')} onMixingChange={onMixingChange} />
        <div className="ai-and-visualizer">
          <AIAssistant 
            onAIRequest={onAIRequest} 
            onGenerateSuggestion={onGenerateSuggestion}
            aiSuggestion={aiSuggestion}
          />
          <AudioVisualizer analyserNode={analyserNode} />
        </div>
      </div>
      <div className="ai-mix-toggle">
        <label htmlFor="ai-mix-toggle">AI Mix</label>
        <input
          type="checkbox"
          id="ai-mix-toggle"
          checked={isAIMixApplied}
          onChange={onApplyAIMix}
        />
        <span>{isAIMixApplied ? 'On' : 'Off'}</span>
      </div>
    </div>
  );
};

export default MixingStage;