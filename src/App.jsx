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
  const [isAIMixApplied, setIsAIMixApplied] = useState(false);
  const [originalTracks, setOriginalTracks] = useState([]);

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

  const isValidNumber = (value) => {
    return typeof value === 'number' && isFinite(value);
  };

  const handleTrackUpload = async (newTrack) => {
    if (newTrack.status === 'error') {
      setTracks(prevTracks => [...prevTracks, newTrack]);
      return;
    }
  
    try {
      console.log('Received new track:', newTrack);
      const analysis = await analyzeTrack(newTrack.buffer);
      console.log('Track analysis completed:', analysis);
  
      if (analysis.error) {
        throw new Error(analysis.message);
      }
  
      if (!analysis.loudness && !analysis.spectralCentroid) {
        throw new Error('Invalid track analysis results');
      }
  
      const analyzedTrack = { 
        ...newTrack, 
        analysis,
        type: extractTrackType(newTrack.name),
        classification: analysis.classification,
        volume: 1,
        pan: 0,
        eq: { low: 0, mid: 0, high: 0 },
        compression: { threshold: -24, ratio: 4 },
        status: 'success'
      };
      setTracks(prevTracks => [...prevTracks, analyzedTrack]);
    } catch (error) {
      console.error('Error during track analysis:', error);
      const errorTrack = {
        ...newTrack,
        status: 'error',
        errorMessage: `Error analyzing track: ${error.message}`
      };
      setTracks(prevTracks => [...prevTracks, errorTrack]);
    }
  };

  const deleteErrorTracks = () => {
    setTracks(prevTracks => prevTracks.filter(track => track.status !== 'error'));
  };

  const handleMixingChange = (trackId, changes) => {
    console.log('Mixing change:', trackId, changes);
    setTracks(prevTracks =>
      prevTracks.map(track => {
        if (track.id === trackId) {
          const updatedTrack = { ...track };
          Object.entries(changes).forEach(([key, value]) => {
            if (typeof value === 'object') {
              updatedTrack[key] = { ...updatedTrack[key], ...value };
            } else {
              updatedTrack[key] = value;
            }
          });
          return updatedTrack;
        }
        return track;
      })
    );
    if (isPlaying) {
      updateTrackAudio(trackId, changes);
    }
  };

  const updateTrackAudio = (trackId, changes) => {
    console.log('Updating track audio:', trackId, changes);
    const trackNode = trackNodes.current[trackId];
    if (!trackNode) {
      console.warn('Track node not found:', trackId);
      return;
    }
  
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
          if (!trackNodes.current[track.id]) {
            console.log('Creating audio nodes for track:', track.id);
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
            
            trackNodes.current[track.id] = { sourceNode, gainNode, pannerNode, eqNode, compressorNode };
          }

          const { sourceNode, gainNode, pannerNode, eqNode, compressorNode } = trackNodes.current[track.id];
          
          console.log('Applying initial track settings:', track.id, track);
          updateTrackProcessing(
            {
              volume: track.volume,
              pan: track.pan,
              eq: track.eq,
              compression: track.compression
            },
            audioContextRef.current,
            gainNode,
            pannerNode,
            eqNode,
            compressorNode
          );

          if (!sourceNode.started) {
            sourceNode.start();
            sourceNode.started = true;
          }
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
    if (!isAIMixApplied && aiSuggestion && aiSuggestion.trackSuggestions) {
      setOriginalTracks([...tracks]);

      const updatedTracks = tracks.map(track => {
        if (track.status === 'error') return track;
        const suggestion = aiSuggestion.trackSuggestions.find(s => s.trackName === track.name);
        if (suggestion) {
          const { adjustments } = suggestion;
          return {
            ...track,
            volume: isValidNumber(adjustments.volume) ? Math.max(0, Math.min(2, adjustments.volume)) : track.volume,
            pan: isValidNumber(adjustments.pan) ? Math.max(-1, Math.min(1, adjustments.pan)) : track.pan,
            eq: {
              low: isValidNumber(adjustments.eq?.low) ? Math.max(-12, Math.min(12, adjustments.eq.low)) : track.eq.low,
              mid: isValidNumber(adjustments.eq?.mid) ? Math.max(-12, Math.min(12, adjustments.eq.mid)) : track.eq.mid,
              high: isValidNumber(adjustments.eq?.high) ? Math.max(-12, Math.min(12, adjustments.eq.high)) : track.eq.high,
            },
            compression: {
              threshold: isValidNumber(adjustments.compression?.threshold) ? Math.max(-60, Math.min(0, adjustments.compression.threshold)) : track.compression.threshold,
              ratio: isValidNumber(adjustments.compression?.ratio) ? Math.max(1, Math.min(20, adjustments.compression.ratio)) : track.compression.ratio,
            },
          };
        }
        return track;
      });
      setTracks(updatedTracks);
    } else {
      setTracks(originalTracks);
    }
    setIsAIMixApplied(!isAIMixApplied);
  };

  useEffect(() => {
    if (isPlaying) {
      tracks.forEach(track => {
        updateTrackAudio(track.id, track);
      });
    }
  }, [isAIMixApplied, isPlaying]);

  return (
    <div className="app">
      <h1>AI Mixer App</h1>
      <MixingStage
        tracks={tracks}
        onTrackUpload={handleTrackUpload}
        onMixingChange={handleMixingChange}
        onAIRequest={handleAIRequest}
        onApplyAIMix={handleApplyAIMix}
        isAIMixApplied={isAIMixApplied}
        analyserNode={analyserNode.current}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onGenerateSuggestion={handleGenerateSuggestion}
        aiSuggestion={aiSuggestion}
        onDeleteErrorTracks={deleteErrorTracks}
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
}

export default App;