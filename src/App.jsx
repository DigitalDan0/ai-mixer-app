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

  useEffect(() => {
    console.log('Tracks updated:', tracks);
  }, [tracks]);

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
        id: String(newTrack.id), // Ensure ID is a string
        type: trackType,
        analysis: analysis,
        audioBuffer: audioBuffer,
        status: 'loaded'
      };
  
      trackNodes.current[updatedTrack.id] = [sourceNode, gainNode];
      setTracks(prevTracks => [...prevTracks, updatedTrack]);
      setDuration(prevDuration => Math.max(prevDuration, audioBuffer.duration));
  
      console.log(`Track uploaded: ${updatedTrack.id}`, updatedTrack);
  
      return updatedTrack;
    } catch (error) {
      console.error('Error uploading track:', error);
      const errorTrack = {
        ...newTrack,
        id: String(newTrack.id),
        status: 'error',
        errorMessage: 'Failed to load audio file'
      };
      setTracks(prevTracks => [...prevTracks, errorTrack]);
      return errorTrack;
    }
  };


  const handleMixingChange = (trackId, changes) => {
    setTracks(prevTracks => prevTracks.map(track => {
      if (track.id === trackId) {
        const updatedTrack = { ...track, ...changes };
        const [sourceNode, gainNode] = trackNodes.current[trackId];
        if (changes.volume !== undefined && !updatedTrack.muted) {
          gainNode.gain.setValueAtTime(changes.volume, audioContextRef.current.currentTime);
        }
        if (changes.muted !== undefined) {
          gainNode.gain.setValueAtTime(changes.muted ? 0 : updatedTrack.volume, audioContextRef.current.currentTime);
        }
        if (changes.soloed !== undefined) {
          const soloedTracks = prevTracks.filter(t => t.id !== trackId && t.soloed);
          if (changes.soloed) {
            soloedTracks.push(updatedTrack);
          }
          prevTracks.forEach(t => {
            const [, tGainNode] = trackNodes.current[t.id];
            if (soloedTracks.length > 0) {
              tGainNode.gain.setValueAtTime(soloedTracks.includes(t) ? t.volume : 0, audioContextRef.current.currentTime);
            } else {
              tGainNode.gain.setValueAtTime(t.muted ? 0 : t.volume, audioContextRef.current.currentTime);
            }
          });
        }
        // Implement other parameter changes here (pan, eq, compression, etc.)
        return updatedTrack;
      }
      return track;
    }));
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      Object.values(trackNodes.current).forEach(([sourceNode]) => sourceNode.stop());
      clearInterval(timerRef.current);
    } else {
      tracks.forEach(track => {
        if (track.status === 'loaded' && track.audioBuffer) {
          const [, gainNode] = trackNodes.current[track.id];
          const sourceNode = audioContextRef.current.createBufferSource();
          sourceNode.buffer = track.audioBuffer;
          sourceNode.connect(gainNode);
          sourceNode.start(0, currentTime);
          trackNodes.current[track.id][0] = sourceNode;
        } else {
          console.warn(`Track with id ${track.id} not found or has no audioBuffer`);
        }
      });
      timerRef.current = setInterval(() => {
        setCurrentTime(prevTime => {
          if (prevTime >= duration) {
            clearInterval(timerRef.current);
            setIsPlaying(false);
            return duration;
          }
          return prevTime + 0.1;
        });
      }, 100);
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleSeek = (time) => {
    setCurrentTime(time);
    if (isPlaying) {
      Object.values(trackNodes.current).forEach(([sourceNode]) => sourceNode.stop());
      tracks.forEach(track => {
        if (track.status === 'loaded' && track.audioBuffer) {
          const [, gainNode] = trackNodes.current[track.id];
          const sourceNode = audioContextRef.current.createBufferSource();
          sourceNode.buffer = track.audioBuffer;
          sourceNode.connect(gainNode);
          sourceNode.start(0, time);
          trackNodes.current[track.id][0] = sourceNode;
        } else {
          console.warn(`Track with id ${track.id} not found or has no audioBuffer`);
        }
      });
    }
  };

  const handleGenerateSuggestion = async () => {
    const suggestion = await generateMixingSuggestion(tracks);
    setAiSuggestion(suggestion);
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
}

export default App;