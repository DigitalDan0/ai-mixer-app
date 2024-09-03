import React from 'react';
import TrackList from './TrackList';
import TrackUpload from './TrackUpload';
import AIAssistant from './AIAssistant';
import AudioVisualizer from './AudioVisualizer';

const MixingStage = ({
  tracks,
  onTrackUpload,
  onMixingChange,
  onAIRequest,
  analyserNode,
  isPlaying,
  onPlayPause,
  onGenerateSuggestion,
  aiSuggestion
}) => {
  return (
    <div className="mixing-stage">
      <h2>Mixing Stage</h2>
      <TrackUpload onTrackUpload={onTrackUpload} />
      <TrackList tracks={tracks} onMixingChange={onMixingChange} />
      <div className="playback-controls">
        <button onClick={onPlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
      </div>
      <AIAssistant onAIRequest={onAIRequest} />
      <button onClick={onGenerateSuggestion}>Generate Mixing Suggestion</button>
      {aiSuggestion && (
        <div className="ai-suggestion">
          <h3>AI Suggestion:</h3>
          <pre>{aiSuggestion}</pre>
        </div>
      )}
      <AudioVisualizer analyserNode={analyserNode} />
    </div>
  );
};

export default MixingStage;