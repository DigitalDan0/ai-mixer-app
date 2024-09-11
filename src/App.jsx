import React, { useState, useRef, useEffect } from 'react';
import AIAudioMixer from './components/AIAudioMixer';
import { generateMixingSuggestion } from './services/aiService';

const App = () => {
  const [tracks, setTracks] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const audioContextRef = useRef(null);
  const masterGainNode = useRef(null);
  const analyserNode = useRef(null);
  const trackNodes = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode.current = audioContextRef.current.createGain();
    analyserNode.current = audioContextRef.current.createAnalyser();
    masterGainNode.current.connect(analyserNode.current);
    analyserNode.current.connect(audioContextRef.current.destination);

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleTrackUpload = async (newTrack) => {
    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(newTrack.arrayBuffer.slice(0));
      
      const analysis = {
        duration: audioBuffer.duration,
        numberOfChannels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate
      };
      const trackType = newTrack.name.toLowerCase().includes('drum') ? 'drums' : 'instrument';
  
      const sourceNode = audioContextRef.current.createBufferSource();
      sourceNode.buffer = audioBuffer;
      const gainNode = audioContextRef.current.createGain();
      sourceNode.connect(gainNode);
      gainNode.connect(masterGainNode.current);
  
      const updatedTrack = {
        ...newTrack,
        type: trackType,
        analysis: analysis,
        audioBuffer: audioBuffer,
        status: 'loaded'
      };
  
      trackNodes.current[updatedTrack.id] = [sourceNode, gainNode];
      setTracks(prevTracks => [...prevTracks, updatedTrack]);
      setDuration(prevDuration => Math.max(prevDuration, audioBuffer.duration));
  
      if (isPlaying) {
        sourceNode.start(0, currentTime);
      }
    } catch (error) {
      console.error('Error uploading track:', error);
      setTracks(prevTracks => [...prevTracks, {
        ...newTrack,
        status: 'error',
        errorMessage: 'Failed to load audio file'
      }]);
    }
  };

  const handleMixingChange = (trackId, changes) => {
    setTracks(prevTracks => prevTracks.map(track => {
      if (track.id === trackId) {
        const updatedTrack = { ...track, ...changes };
        const [sourceNode, gainNode] = trackNodes.current[trackId];
        if (changes.volume !== undefined) {
          gainNode.gain.setValueAtTime(changes.volume, audioContextRef.current.currentTime);
        }
        // Implement other parameter changes here (pan, eq, compression, etc.)
        return updatedTrack;
      }
      return track;
    }));
  };

  const handlePlayPause = () => {
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      clearInterval(timerRef.current);
      Object.values(trackNodes.current).forEach(([sourceNode]) => {
        sourceNode.stop();
      });
    } else {
      const startTime = audioContextRef.current.currentTime - currentTime;
      tracks.forEach(track => {
        const [, gainNode] = trackNodes.current[track.id];
        const newSource = audioContextRef.current.createBufferSource();
        newSource.buffer = track.audioBuffer;
        newSource.connect(gainNode);
        newSource.start(0, currentTime);
        trackNodes.current[track.id][0] = newSource;
      });

      timerRef.current = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = audioContextRef.current.currentTime - startTime;
          return newTime > duration ? duration : newTime;
        });
      }, 50);
    }

    setIsPlaying(!isPlaying);
  };

  const handleSeek = (newTime) => {
    setCurrentTime(newTime);
    if (isPlaying) {
      clearInterval(timerRef.current);
      Object.values(trackNodes.current).forEach(([sourceNode]) => {
        sourceNode.stop();
      });

      const startTime = audioContextRef.current.currentTime - newTime;
      tracks.forEach(track => {
        const [, gainNode] = trackNodes.current[track.id];
        const newSource = audioContextRef.current.createBufferSource();
        newSource.buffer = track.audioBuffer;
        newSource.connect(gainNode);
        newSource.start(0, newTime);
        trackNodes.current[track.id][0] = newSource;
      });

      timerRef.current = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = audioContextRef.current.currentTime - startTime;
          return newTime > duration ? duration : newTime;
        });
      }, 50);
    }
  };

  const handleGenerateSuggestion = async () => {
    try {
      const suggestion = await generateMixingSuggestion(tracks);
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error('Error generating mixing suggestion:', error);
      setAiSuggestion('Error: Unable to generate mixing suggestion');
    }
  };

  const handleApplyAIMix = (isApplied) => {
    if (isApplied && aiSuggestion) {
      const updatedTracks = tracks.map(track => {
        if (aiSuggestion.adjustments[track.id]) {
          return {
            ...track,
            ...aiSuggestion.adjustments[track.id]
          };
        }
        return track;
      });
      setTracks(updatedTracks);
      updatedTracks.forEach(track => {
        const [, gainNode] = trackNodes.current[track.id];
        gainNode.gain.setValueAtTime(track.volume, audioContextRef.current.currentTime);
        // Apply other audio parameter changes here (pan, eq, compression)
      });
    }
  };

  const handleDeleteErrorTracks = () => {
    setTracks(prevTracks => prevTracks.filter(track => track.status !== 'error'));
  };

  const handleSkipToStart = () => {
    handleSeek(0);
  };

  const handleSkipToEnd = () => {
    handleSeek(duration);
  };

  return (
    <div className="app">
      <AIAudioMixer
        tracks={tracks}
        setTracks={setTracks}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        currentTime={currentTime}
        duration={duration}
        onTrackUpload={handleTrackUpload}
        onMixingChange={handleMixingChange}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onGenerateSuggestion={handleGenerateSuggestion}
        onApplyAIMix={handleApplyAIMix}
        aiSuggestion={aiSuggestion}
        onDeleteErrorTracks={handleDeleteErrorTracks}
        analyserNode={analyserNode.current}
        onSkipToStart={handleSkipToStart}
        onSkipToEnd={handleSkipToEnd}
      />
    </div>
  );
};

export default App;