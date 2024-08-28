import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import TrackList from './components/TrackList';
import TrackUpload from './components/TrackUpload';
import AudioVisualizer from './components/AudioVisualizer';
import MasteringControls from './components/MasteringControls';
import AIAssistant from './components/AIAssistant';
import { processAudioTracks, applyAIChanges, updateTrackVolume, applyMasteringChain } from './services/audioProcessor';
import { interpretUserRequest, generateMixingSuggestion } from './services/aiService';

const App = () => {
  const [tracks, setTracks] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMasteringBypassed, setIsMasteringBypassed] = useState(false);
  const [masterVolume, setMasterVolume] = useState(1);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const audioContextRef = useRef(null);
  const masterGainNode = useRef(null);
  const compressorNode = useRef(null);
  const analyserNode = useRef(null);
  const trackNodes = useRef({});

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode.current = audioContextRef.current.createGain();
    compressorNode.current = audioContextRef.current.createDynamicsCompressor();
    analyserNode.current = audioContextRef.current.createAnalyser();

    compressorNode.current.connect(analyserNode.current);
    analyserNode.current.connect(audioContextRef.current.destination);

    return () => {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleTrackUpload = (newTrack) => {
    setTracks(prevTracks => [...prevTracks, newTrack]);
  };

  const handleMixingChange = (trackId, changes) => {
    setTracks(prevTracks =>
      prevTracks.map(track =>
        track.id === trackId ? { ...track, ...changes } : track
      )
    );
    if (isPlaying && trackNodes.current[trackId]) {
      updateTrackVolume(tracks.find(t => t.id === trackId), audioContextRef.current, trackNodes.current[trackId].gainNode);
    }
  };

  const handleAIRequest = async (request) => {
    try {
      const aiSuggestion = await interpretUserRequest(request);
      const updatedTracks = await applyAIChanges(tracks, aiSuggestion);
      setTracks(updatedTracks);
      setAiSuggestion(`Applied ${aiSuggestion.effect} with parameters: ${JSON.stringify(aiSuggestion.params)}`);
    } catch (error) {
      console.error('Error processing AI request:', error);
      setAiSuggestion('Unable to process the request. Please try again.');
    }
  };

  const handleGenerateSuggestion = async () => {
    try {
      const suggestion = await generateMixingSuggestion(tracks);
      setAiSuggestion(JSON.stringify(suggestion, null, 2));
    } catch (error) {
      console.error('Error generating mixing suggestion:', error);
      setAiSuggestion('Unable to generate mixing suggestion. Please try again.');
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      Object.values(trackNodes.current).forEach(({ sourceNode }) => sourceNode.stop());
      trackNodes.current = {};
      setIsPlaying(false);
    } else {
      tracks.forEach(track => {
        const sourceNode = audioContextRef.current.createBufferSource();
        sourceNode.buffer = track.buffer;
        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.setValueAtTime(track.muted ? 0 : track.volume, audioContextRef.current.currentTime);
        
        sourceNode.connect(gainNode);
        gainNode.connect(masterGainNode.current);
        
        sourceNode.start();
        trackNodes.current[track.id] = { sourceNode, gainNode };
      });
      setIsPlaying(true);
    }
  };

  const handleMasteringBypass = (bypassed) => {
    setIsMasteringBypassed(bypassed);
    if (bypassed) {
      masterGainNode.current.disconnect();
      masterGainNode.current.connect(analyserNode.current);
    } else {
      masterGainNode.current.disconnect();
      masterGainNode.current.connect(compressorNode.current);
    }
  };

  const handleMasterVolumeChange = (newVolume) => {
    setMasterVolume(newVolume);
    masterGainNode.current.gain.setValueAtTime(newVolume, audioContextRef.current.currentTime);
  };

  return (
    <div className="app">
      <h1>AI Mixer App</h1>
      <TrackUpload onTrackUpload={handleTrackUpload} />
      <TrackList tracks={tracks} onMixingChange={handleMixingChange} />
      <div className="playback-controls">
        <button onClick={handlePlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
      </div>
      <AIAssistant onAIRequest={handleAIRequest} />
      <button onClick={handleGenerateSuggestion}>Generate Mixing Suggestion</button>
      {aiSuggestion && (
        <div className="ai-suggestion">
          <h3>AI Suggestion:</h3>
          <pre>{aiSuggestion}</pre>
        </div>
      )}
      <div className="master-output">
        <h2>Master Output</h2>
        <AudioVisualizer analyserNode={analyserNode.current} />
        <MasteringControls
          isBypassed={isMasteringBypassed}
          onBypassChange={handleMasteringBypass}
          masterVolume={masterVolume}
          onMasterVolumeChange={handleMasterVolumeChange}
        />
      </div>
    </div>
  );
};

export default App;