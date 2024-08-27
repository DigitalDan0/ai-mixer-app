import React, { useState, useEffect, useRef } from 'react';
import TrackList from './components/TrackList';
import AIAssistant from './components/AIAssistant';
import TrackUpload from './components/TrackUpload';
import { processAudioTracks, applyAIChanges } from './services/audioProcessor';
import { interpretUserRequest } from './services/aiService';
import './App.css';

const App = () => {
  const [tracks, setTracks] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const sourceNodesRef = useRef({});

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleTrackUpload = (newTrack) => {
    setTracks([...tracks, newTrack]);
  };

  const handleMixingChange = (trackId, change) => {
    const updatedTracks = tracks.map(track => 
      track.id === trackId ? { ...track, ...change } : track
    );
    setTracks(updatedTracks);
  };

  const handleAIRequest = async (request) => {
    const aiSuggestion = await interpretUserRequest(request);
    const updatedTracks = await applyAIChanges(tracks, aiSuggestion);
    setTracks(updatedTracks);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      // Stop all tracks
      Object.values(sourceNodesRef.current).forEach(sourceNode => sourceNode.stop());
      sourceNodesRef.current = {};
      setIsPlaying(false);
    } else {
      // Play all tracks
      tracks.forEach(track => {
        const sourceNode = audioContextRef.current.createBufferSource();
        sourceNode.buffer = track.buffer;
        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.setValueAtTime(track.volume, audioContextRef.current.currentTime);
        sourceNode.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        sourceNode.start();
        sourceNodesRef.current[track.id] = sourceNode;
      });
      setIsPlaying(true);
    }
  };

  return (
    <div className="app">
      <h1>Band Mixing Assistant</h1>
      <TrackUpload onTrackUpload={handleTrackUpload} />
      <TrackList tracks={tracks} onMixingChange={handleMixingChange} />
      <AIAssistant onAIRequest={handleAIRequest} />
      <button onClick={handlePlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
    </div>
  );
};

export default App;