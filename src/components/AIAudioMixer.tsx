import React, { useState } from 'react';
import { Sliders, User, Menu, Wand2, Maximize2, MessageSquare, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import WaveformSlider from './WaveformSlider';
import AudioVisualizer from './AudioVisualizer';
import TrackList from './TrackList';
import TrackUpload from './TrackUpload';

interface Track {
  id: number;
  name: string;
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  eq: { low: number; mid: number; high: number };
  compression: { threshold: number; ratio: number };
  effects: any[];
  status: string;
  errorMessage?: string;
}

interface AIAudioMixerProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: number;
  duration: number;
  onTrackUpload: (newTrack: any) => void;
  onMixingChange: (trackId: number, changes: Partial<Track>) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onGenerateSuggestion: () => void;
  onApplyAIMix: (isApplied: boolean) => void;
  aiSuggestion: string | null;
  onDeleteErrorTracks: () => void;
  analyserNode: AnalyserNode | null;
  onSkipToStart: () => void;
  onSkipToEnd: () => void;
}

export default function AIAudioMixer({
  tracks,
  setTracks,
  isPlaying,
  setIsPlaying,
  currentTime,
  duration,
  onTrackUpload,
  onMixingChange,
  onPlayPause,
  onSeek,
  onGenerateSuggestion,
  onApplyAIMix,
  aiSuggestion,
  onDeleteErrorTracks,
  analyserNode,
  onSkipToStart,
  onSkipToEnd
}: AIAudioMixerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [isAIMixApplied, setIsAIMixApplied] = useState(false);
  const [isGeneratingMix, setIsGeneratingMix] = useState(false);
  const [userInput, setUserInput] = useState('');

  const handleVolumeChange = (trackId: number, newVolume: number) => {
    onMixingChange(trackId, { volume: newVolume });
  };

  const handleMuteToggle = (trackId: number) => {
    const updatedTracks = tracks.map(track => {
      if (track.id === trackId) {
        return { ...track, muted: !track.muted };
      }
      return track;
    });
    setTracks(updatedTracks);
    onMixingChange(trackId, { muted: !tracks.find(t => t.id === trackId)?.muted });
  };

  const handlePanChange = (trackId: number, newPan: number) => {
    onMixingChange(trackId, { pan: newPan });
  };

  const handleSoloToggle = (trackId: number) => {
    const updatedTracks = tracks.map(track => {
      if (track.id === trackId) {
        return { ...track, soloed: !track.soloed };
      }
      return track;
    });
  
    const hasSoloedTrack = updatedTracks.some(track => track.soloed);
  
    updatedTracks.forEach(track => {
      if (hasSoloedTrack) {
        track.muted = !track.soloed;
      } else {
        track.muted = false;
      }
    });
  
    setTracks(updatedTracks);
    onMixingChange(trackId, { soloed: !tracks.find(t => t.id === trackId)?.soloed });
  };

  const handleGenerateAIMix = () => {
    setIsGeneratingMix(true);
    onGenerateSuggestion();
    setIsGeneratingMix(false);
  };

  const handleApplyAIMix = (isApplied: boolean) => {
    setIsAIMixApplied(isApplied);
    onApplyAIMix(isApplied);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-gray-800">
        {/* ... (keep existing header content) */}
      </header>
  
       {/* Main content */}
       <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className={`w-64 bg-gray-800 p-4 overflow-y-auto transition-all ${sidebarOpen ? '' : '-ml-64'}`}>
          <h2 className="text-xl font-semibold mb-4">Tracks</h2>
          <TrackUpload onTrackUpload={onTrackUpload} />
          <div className="mt-4">
            <TrackList
              tracks={tracks}
              onMuteToggle={handleMuteToggle}
              onVolumeChange={handleVolumeChange}
            />
          </div>
        </aside>
  
        {/* Mixing console */}
        <main className="flex-1 overflow-y-auto p-4">
          <WaveformSlider
            tracks={tracks}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
            onSkipToStart={onSkipToStart}
            onSkipToEnd={onSkipToEnd}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
            {tracks.map(track => (
              <div key={track.id} className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">{track.name}</h3>
                <div className="space-y-4">
                  <div className="h-24 bg-gray-700 rounded-lg overflow-hidden">
                    {/* Placeholder for individual track waveform */}
                    <div className="h-full bg-blue-500 opacity-50" style={{ width: '100%' }}></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>Volume</span>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={track.volume}
                      onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>Pan</span>
                    <input 
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={track.pan}
                      onChange={(e) => handlePanChange(track.id, parseFloat(e.target.value))}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex justify-between">
                    <button 
                      className={`px-2 py-1 rounded ${track.muted ? 'bg-red-600' : 'bg-gray-600'} hover:bg-opacity-80`}
                      onClick={() => handleMuteToggle(track.id)}
                    >
                      {track.muted ? 'Unmute' : 'Mute'}
                    </button>
                    <button 
                      className={`px-2 py-1 rounded ${track.soloed ? 'bg-green-600' : 'bg-gray-600'} hover:bg-opacity-80`}
                      onClick={() => handleSoloToggle(track.id)}
                    >
                      {track.soloed ? 'Unsolo' : 'Solo'}
                    </button>
                    <button className="p-2 rounded-full hover:bg-gray-700">
                      <Sliders className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
  
        {/* Right sidebar */}
        <aside className={`w-64 bg-gray-800 p-4 overflow-y-auto transition-all ${rightSidebarOpen ? '' : 'mr-64'}`}>
          <h2 className="text-xl font-semibold mb-4">AI Assistant</h2>
          <div className="bg-gray-700 rounded-lg p-4 h-64 mb-4 overflow-y-auto">
            {aiSuggestion && (
              <p className="bg-blue-600 rounded-lg p-2 inline-block">{aiSuggestion}</p>
            )}
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <input 
              type="text" 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask AI..." 
              className="flex-1 bg-gray-700 rounded-lg p-2" 
            />
            <button className="p-2 rounded-full hover:bg-gray-700">
              <MessageSquare className="h-4 w-4" />
            </button>
          </div>
          <AudioVisualizer analyserNode={analyserNode} />
        </aside>
      </div>
  
      {/* Footer */}
      <footer className="bg-gray-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-full hover:bg-gray-700" onClick={onSkipToStart}>
              <SkipBack className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-700" onClick={onPlayPause}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button className="p-2 rounded-full hover:bg-gray-700" onClick={onSkipToEnd}>
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
          <button className="p-2 rounded-full hover:bg-gray-700" onClick={() => setRightSidebarOpen(!rightSidebarOpen)}>
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
        <div className="relative w-full h-2 bg-gray-700 rounded-full">
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          ></div>
        </div>
      </footer>
    </div>
  );
}