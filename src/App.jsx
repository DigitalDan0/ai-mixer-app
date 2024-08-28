import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import TrackList from './components/TrackList';
import TrackUpload from './components/TrackUpload';
import AudioVisualizer from './components/AudioVisualizer';
import MasteringControls from './components/MasteringControls';
import AIAssistant from './components/AIAssistant';
import { processAudioTracks, applyAIChanges, updateTrackVolume, createEQ, createReverb, createLimiter, applyMasteringChain } from './services/audioProcessor';
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
    { type: 'lowshelf', frequency: 100, gain: 0, Q: 1 },
    { type: 'peaking', frequency: 500, gain: 0, Q: 1 },
    { type: 'peaking', frequency: 1000, gain: 0, Q: 1 },
    { type: 'peaking', frequency: 2000, gain: 0, Q: 1 },
    { type: 'highshelf', frequency: 10000, gain: 0, Q: 1 }
  ]);
  const [reverbMix, setReverbMix] = useState(0);
  const [limiterThreshold, setLimiterThreshold] = useState(-3);
  const [audioContext, setAudioContext] = useState(null);

  const masterGainNode = useRef(null);
  const compressorNode = useRef(null);
  const analyserNode = useRef(null);
  const trackNodes = useRef({});
  const eqNode = useRef(null);
  const reverbNode = useRef(null);
  const limiterNode = useRef(null);
  const dryGainNode = useRef(null);
  const wetGainNode = useRef(null);

  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(ctx);

    masterGainNode.current = ctx.createGain();
    compressorNode.current = ctx.createDynamicsCompressor();
    analyserNode.current = ctx.createAnalyser();
    
    eqNode.current = createEQ(ctx, eqBands);
    limiterNode.current = createLimiter(ctx, limiterThreshold);
    
    dryGainNode.current = ctx.createGain();
    wetGainNode.current = ctx.createGain();

    createReverb(ctx).then(reverb => {
      reverbNode.current = reverb;
      applyMasteringChain(
        ctx,
        masterGainNode.current,
        compressorNode.current,
        limiterNode.current,
        eqNode.current,
        dryGainNode.current,
        wetGainNode.current,
        reverbNode.current,
        analyserNode.current
      );
      updateReverbMix(reverbMix);
    });

    return () => {
      if (ctx.state !== 'closed') {
        ctx.close();
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
      updateTrackVolume(tracks.find(t => t.id === trackId), audioContext, trackNodes.current[trackId].gainNode);
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
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      tracks.forEach(track => {
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = track.buffer;
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(track.muted ? 0 : track.volume, audioContext.currentTime);
        
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
      analyserNode.current.connect(audioContext.destination);
    } else {
      applyMasteringChain(
        audioContext,
        masterGainNode.current,
        compressorNode.current,
        limiterNode.current,
        eqNode.current,
        dryGainNode.current,
        wetGainNode.current,
        reverbNode.current,
        analyserNode.current
      );
    }
  };

  const handleMasterVolumeChange = (newVolume) => {
    setMasterVolume(newVolume);
    masterGainNode.current.gain.setValueAtTime(newVolume, audioContext.currentTime);
  };

  const handleCompressorThresholdChange = (newThreshold) => {
    setCompressorThreshold(newThreshold);
    if (compressorNode.current) {
      compressorNode.current.threshold.setValueAtTime(newThreshold, audioContext.currentTime);
    }
  };

  const handleCompressorRatioChange = (newRatio) => {
    setCompressorRatio(newRatio);
    if (compressorNode.current) {
      compressorNode.current.ratio.setValueAtTime(newRatio, audioContext.currentTime);
    }
  };

  const handleEQChange = (index, updates) => {
    setEqBands(prevBands => {
      const newBands = [...prevBands];
      newBands[index] = { ...newBands[index], ...updates };
      return newBands;
    });
    eqNode.current.updateBand(index, updates);
  };

  const handleReverbMixChange = (newMix) => {
    setReverbMix(newMix);
    updateReverbMix(newMix);
  };

  const updateReverbMix = (mix) => {
    if (dryGainNode.current && wetGainNode.current) {
      dryGainNode.current.gain.setValueAtTime(1 - mix, audioContext.currentTime);
      wetGainNode.current.gain.setValueAtTime(mix, audioContext.currentTime);
    }
  };

  const handleLimiterThresholdChange = (newThreshold) => {
    setLimiterThreshold(newThreshold);
    if (limiterNode.current) {
      limiterNode.current.threshold.setValueAtTime(newThreshold, audioContext.currentTime);
    }
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
          compressorThreshold={compressorThreshold}
          onCompressorThresholdChange={handleCompressorThresholdChange}
          compressorRatio={compressorRatio}
          onCompressorRatioChange={handleCompressorRatioChange}
          eqBands={eqBands}
          onEQChange={handleEQChange}
          reverbMix={reverbMix}
          onReverbMixChange={handleReverbMixChange}
          limiterThreshold={limiterThreshold}
          onLimiterThresholdChange={handleLimiterThresholdChange}
        />
      </div>
    </div>
  );
};

export default App;