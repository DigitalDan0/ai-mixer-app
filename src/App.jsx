import React, { useState, useEffect, useRef } from 'react';
import TrackList from './components/TrackList';
import AIAssistant from './components/AIAssistant';
import TrackUpload from './components/TrackUpload';
import MasteringControls from './components/MasteringControls';
import AudioVisualizer from './components/AudioVisualizer';
import { applyAIChanges } from './services/audioProcessor';
import { interpretUserRequest } from './services/aiService';
import './App.css';

const App = () => {
  const [tracks, setTracks] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masteringSettings, setMasteringSettings] = useState({
    compressorThreshold: -24,
    compressorRatio: 4,
    limiterThreshold: -1,
    outputGain: 0
  });
  const [isMasteringBypassed, setIsMasteringBypassed] = useState(false);
  
  const audioContextRef = useRef(null);
  const masterGainNode = useRef(null);
  const analyserNode = useRef(null);
  const trackNodes = useRef({});
  const compressorNode = useRef(null);
  const limiterNode = useRef(null);
  const outputGainNode = useRef(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode.current = audioContextRef.current.createGain();
    analyserNode.current = audioContextRef.current.createAnalyser();
    compressorNode.current = audioContextRef.current.createDynamicsCompressor();
    limiterNode.current = audioContextRef.current.createDynamicsCompressor();
    outputGainNode.current = audioContextRef.current.createGain();
    
    // Set up the audio processing chain
    masterGainNode.current.connect(compressorNode.current);
    compressorNode.current.connect(limiterNode.current);
    limiterNode.current.connect(outputGainNode.current);
    outputGainNode.current.connect(analyserNode.current);
    analyserNode.current.connect(audioContextRef.current.destination);

    return () => {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (compressorNode.current && limiterNode.current && outputGainNode.current) {
      compressorNode.current.threshold.setValueAtTime(masteringSettings.compressorThreshold, audioContextRef.current.currentTime);
      compressorNode.current.ratio.setValueAtTime(masteringSettings.compressorRatio, audioContextRef.current.currentTime);
      limiterNode.current.threshold.setValueAtTime(masteringSettings.limiterThreshold, audioContextRef.current.currentTime);
      limiterNode.current.ratio.setValueAtTime(20, audioContextRef.current.currentTime); // Fixed high ratio for limiting
      outputGainNode.current.gain.setValueAtTime(Math.pow(10, masteringSettings.outputGain / 20), audioContextRef.current.currentTime);
    }
  }, [masteringSettings]);

  const handleTrackUpload = (newTrack) => {
    setTracks(prevTracks => [...prevTracks, newTrack]);
  };

  const handleMixingChange = (trackId, change) => {
    setTracks(prevTracks => 
      prevTracks.map(track => 
        track.id === trackId ? { ...track, ...change } : track
      )
    );

    if (trackNodes.current[trackId]) {
      if ('volume' in change) {
        trackNodes.current[trackId].gainNode.gain.setValueAtTime(change.volume, audioContextRef.current.currentTime);
      }
      if ('muted' in change) {
        trackNodes.current[trackId].gainNode.gain.setValueAtTime(change.muted ? 0 : tracks.find(t => t.id === trackId).volume, audioContextRef.current.currentTime);
      }
    }
  };

  const handleAIRequest = async (request) => {
    const aiSuggestion = await interpretUserRequest(request);
    const updatedTracks = await applyAIChanges(tracks, aiSuggestion);
    setTracks(updatedTracks);
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

  return (
    <div className="app">
      <h1>Band Mixing Assistant</h1>
      <TrackUpload onTrackUpload={handleTrackUpload} />
      <TrackList 
        tracks={tracks} 
        onMixingChange={handleMixingChange}
      />
      <MasteringControls 
        settings={masteringSettings} 
        onSettingsChange={setMasteringSettings}
        isBypassed={isMasteringBypassed}
        onBypassToggle={handleMasteringBypass}
      />
      <div className="master-output">
        <h2>Master Output</h2>
        {analyserNode.current && (
          <AudioVisualizer 
            analyserNode={analyserNode.current}
            height={100}
          />
        )}
      </div>
      <AIAssistant onAIRequest={handleAIRequest} />
      <div className="playback-controls">
        <button onClick={handlePlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  );
};

export default App;