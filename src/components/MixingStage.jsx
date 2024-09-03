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
  analyserNode,
  isPlaying,
  onPlayPause,
  onGenerateSuggestion,
  aiSuggestion
}) => {
  return (
    <div className="mixing-stage">
      <h2>Mixing Stage</h2>
      <div className="mixing-controls">
        <TrackUpload onTrackUpload={onTrackUpload} />
        <div className="playback-controls">
          <button onClick={onPlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
        </div>
      </div>
      <div className="mixing-workspace">
        <TrackList tracks={tracks} onMixingChange={onMixingChange} />
        <div className="ai-and-visualizer">
          <AIAssistant 
            onAIRequest={onAIRequest} 
            onGenerateSuggestion={onGenerateSuggestion}
            aiSuggestion={aiSuggestion}
          />
          <AudioVisualizer analyserNode={analyserNode} />
        </div>
      </div>
      <button onClick={onApplyAIMix} className="apply-ai-mix">Apply AI Mix</button>
    </div>
  );
};

export default MixingStage;