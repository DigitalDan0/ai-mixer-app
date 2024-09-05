import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import MixingStage from './components/MixingStage';
import MasteringStage from './components/MasteringStage';
import { createEQ, createCompressor, updateTrackProcessing, analyzeTrack, extractTrackType } from './services/audioProcessor';
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

  const handleTrackUpload = async (newTrack) => {
    try {
      console.log('Received new track:', newTrack);
      const analysis = await analyzeTrack(newTrack.buffer);
      console.log('Track analysis completed:', analysis);
      const analyzedTrack = { 
        ...newTrack, 
        analysis,
        type: extractTrackType(newTrack.name),
        classification: analysis.classification,
        volume: 0,
        pan: 0,
        eq: { low: 0, mid: 0, high: 0 },
        compression: { threshold: -24, ratio: 4 },
      };
      setTracks(prevTracks => [...prevTracks, analyzedTrack]);
    } catch (error) {
      console.error('Error during track upload:', error);
      setTracks(prevTracks => [...prevTracks, newTrack]);
    }
  };
  
  const extractTrackType = (filename) => {
    const parts = filename.split(/[_\s-]/);
    return parts[0] || 'Unknown';
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

    updateTrackProcessing(changes, audioContextRef.current, trackNode.gainNode, trackNode.pannerNode, trackNode.eqNode, trackNode.compressorNode);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      audioContextRef.current.suspend();
      setIsPlaying(false);
    } else {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      } else {
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
      }
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

  const handleAIRequest = async (userInput) => {
    try {
      const suggestion = await interpretUserRequest(userInput, tracks);
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error('Error handling AI request:', error);
      setAiSuggestion('Error: Unable to process AI request');
    }
  };

  const handleGenerateSuggestion = async () => {
    try {
      console.log('Generating mixing suggestion for tracks:', tracks);
      const suggestion = await generateMixingSuggestion(tracks);
      console.log('Received AI suggestion:', suggestion);
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error('Error generating mixing suggestion:', error);
      setAiSuggestion('Error: Unable to generate mixing suggestion. Please check the console for more details.');
    }
  };

  const handleApplyAIMix = () => {
    if (aiSuggestion) {
      const updatedTracks = tracks.map(track => {
        const suggestion = aiSuggestion.find(s => s.trackName === track.name);
        if (suggestion) {
          const { adjustments } = suggestion;
          return {
            ...track,
            volume: adjustments.volume !== undefined ? adjustments.volume : track.volume,
            pan: adjustments.pan !== undefined ? adjustments.pan : track.pan,
            eq: {
              low: adjustments.eq?.low !== undefined ? adjustments.eq.low : track.eq.low,
              mid: adjustments.eq?.mid !== undefined ? adjustments.eq.mid : track.eq.mid,
              high: adjustments.eq?.high !== undefined ? adjustments.eq.high : track.eq.high,
            },
            compression: {
              threshold: adjustments.compression?.threshold !== undefined ? adjustments.compression.threshold : track.compression.threshold,
              ratio: adjustments.compression?.ratio !== undefined ? adjustments.compression.ratio : track.compression.ratio,
            },
          };
        }
        return track;
      });
        isBypassed={isMasteringBypassed}
      setTracks(updatedTracks);
      updatedTracks.forEach(track => {
        updateTrackAudio(track.id, track);
      });
    }
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