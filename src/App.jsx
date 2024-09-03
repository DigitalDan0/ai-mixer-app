import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import MixingStage from './components/MixingStage';
import MasteringStage from './components/MasteringStage';
import { createEQ, createCompressor, updateTrackProcessing, applyAIMixingSuggestions } from './services/audioProcessor';
import { interpretUserRequest, generateMixingSuggestion } from './services/aiService';

const App = () => {
  const [tracks, setTracks] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMasteringBypassed, setIsMasteringBypassed] = useState(false);
  const [masterVolume, setMasterVolume] = useState(1);
  const [compressorThreshold, setCompressorThreshold] = useState(-24);
  const [compressorRatio, setCompressorRatio] = useState(4);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [eqBands, setEqBands] = useState([
    { type: 'lowshelf', frequency: 320, gain: 0 },
    { type: 'peaking', frequency: 1000, gain: 0, Q: 0.5 },
    { type: 'highshelf', frequency: 3200, gain: 0 }
  ]);
  const [reverbMix, setReverbMix] = useState(0);
  const [limiterThreshold, setLimiterThreshold] = useState(-3);

  const audioContextRef = useRef(null);
  const masterGainNode = useRef(null);
  const analyserNode = useRef(null);
  const trackNodes = useRef({});

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode.current = audioContextRef.current.createGain();
    analyserNode.current = audioContextRef.current.createAnalyser();
    
    masterGainNode.current.connect(analyserNode.current);
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
    if (isPlaying) {
      updateTrackAudio(trackId, changes);
    }
  };

  const updateTrackAudio = (trackId, changes) => {
    const trackNode = trackNodes.current[trackId];
    if (!trackNode) return;

    const { gainNode, pannerNode, eqNode, compressorNode } = trackNode;
    const track = tracks.find(t => t.id === trackId);

    updateTrackProcessing(track, audioContextRef.current, gainNode, pannerNode, eqNode, compressorNode);
  };

  const handleAIRequest = async (request) => {
    try {
      const suggestion = await interpretUserRequest(request, tracks);
      setAiSuggestion(aiSuggestion);
    } catch (error) {
      console.error('Error processing AI request:', error);
      setAiSuggestion(null);
    }
  };

  const handleGenerateSuggestion = async () => {
    try {
      const suggestion = await generateMixingSuggestion(tracks);
      setAiSuggestion(aiSuggestion);
    } catch (error) {
      console.error('Error generating mixing suggestion:', error);
      setAiSuggestion('Unable to generate mixing suggestion. Please try again.');
    }
  };

  const handleApplyAIMix = () => {
    if (aiSuggestion) {
      const updatedTracks = applyAIMixingSuggestions(tracks, aiSuggestion);
      setTracks(updatedTracks);
      updatedTracks.forEach(track => {
        updateTrackAudio(track.id, track);
      });
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      Object.values(trackNodes.current).forEach(({ sourceNode }) => sourceNode.stop());
      trackNodes.current = {};
      setIsPlaying(false);
    } else {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      tracks.forEach(track => {
        const sourceNode = audioContextRef.current.createBufferSource();
        sourceNode.buffer = track.buffer;
        
        const gainNode = audioContextRef.current.createGain();
        const pannerNode = audioContextRef.current.createStereoPanner();
        const eqNode = createEQ(audioContextRef.current);
        const compressorNode = createCompressor(audioContextRef.current);
        
        sourceNode.connect(eqNode.input);
        eqNode.output.connect(compressorNode);
        compressorNode.connect(pannerNode);
        pannerNode.connect(gainNode);
        gainNode.connect(masterGainNode.current);
        
        updateTrackProcessing(track, audioContextRef.current, gainNode, pannerNode, eqNode, compressorNode);
        
        sourceNode.start();
        trackNodes.current[track.id] = { sourceNode, gainNode, pannerNode, eqNode, compressorNode };
      });
      setIsPlaying(true);
    }
  };

  const handleMasteringBypass = (bypassed) => {
    setIsMasteringBypassed(bypassed);
    // Implement mastering bypass logic here
  };

  const handleMasterVolumeChange = (newVolume) => {
    setMasterVolume(newVolume);
    masterGainNode.current.gain.setValueAtTime(newVolume, audioContextRef.current.currentTime);
  };

  return (
    <div className="app">
      <h1>AI Mixer App</h1>
      <MixingStage
        tracks={tracks}
        onTrackUpload={handleTrackUpload}
        onMixingChange={handleMixingChange}
        onAIRequest={handleAIRequest}
        onApplyAIMix={handleApplyAIMix}
        analyserNode={analyserNode.current}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onGenerateSuggestion={handleGenerateSuggestion}
        aiSuggestion={aiSuggestion}
      />
      <MasteringStage
        isBypassed={isMasteringBypassed}
        onBypassChange={handleMasteringBypass}
        masterVolume={masterVolume}
        onMasterVolumeChange={handleMasterVolumeChange}
        compressorThreshold={compressorThreshold}
        onCompressorThresholdChange={setCompressorThreshold}
        compressorRatio={compressorRatio}
        onCompressorRatioChange={setCompressorRatio}
        eqBands={eqBands}
        onEQChange={(index, updates) => {
          const newBands = [...eqBands];
          newBands[index] = { ...newBands[index], ...updates };
          setEqBands(newBands);
        }}
        reverbMix={reverbMix}
        onReverbMixChange={setReverbMix}
        limiterThreshold={limiterThreshold}
        onLimiterThresholdChange={setLimiterThreshold}
        analyserNode={analyserNode.current}
      />
    </div>
  );
};

export default App;