import React, { useState, useRef, useEffect } from 'react';
import { Sliders, Mic2, BarChart3, User, Upload, Play, Pause, SkipBack, SkipForward, Maximize2, MessageSquare, Menu, Wand2, Trash2 } from "lucide-react";
import WaveformSlider from './WaveformSlider';
import AudioVisualizer from './AudioVisualizer';

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
  onTrackUpload: (file: File) => void;
  onMixingChange: (trackId: number, changes: Partial<Track>) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onGenerateSuggestion: () => void;
  onApplyAIMix: (isApplied: boolean) => void;
  aiSuggestion: string | null;
  onDeleteErrorTracks: () => void;
  audioBuffer: AudioBuffer | null;
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

  const handleTrackUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onTrackUpload(file);
    }
  };

  const handleVolumeChange = (trackId: number, newVolume: number) => {
    onMixingChange(trackId, { volume: newVolume });
  };

  const handlePanChange = (trackId: number, newPan: number) => {
    onMixingChange(trackId, { pan: newPan });
  };

  const handleMuteToggle = (trackId: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      onMixingChange(trackId, { muted: !track.muted });
    }
  };

  const handleSoloToggle = (trackId: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      onMixingChange(trackId, { soloed: !track.soloed });
    }
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
        <div className="flex items-center space-x-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-full hover:bg-gray-700">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold">AI Audio Mixer</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleGenerateAIMix} 
            disabled={isGeneratingMix}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50"
          >
            {isGeneratingMix ? 'Generating...' : 'Generate AI Mix'}
          </button>
          <div className="flex items-center space-x-2">
            <span>Apply AI Mix</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isAIMixApplied} onChange={(e) => handleApplyAIMix(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <button className="p-2 rounded-full hover:bg-gray-700">
            <User className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className={`w-64 bg-gray-800 p-4 overflow-y-auto transition-all ${sidebarOpen ? '' : '-ml-64'}`}>
          <h2 className="text-xl font-semibold mb-4">Tracks</h2>
          <div className="space-y-4">
            <label className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer">
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleTrackUpload}
              />
              <Upload className="h-8 w-8 mx-auto mb-2" />
              <p>Drag & Drop files here</p>
            </label>
            {tracks.map(track => (
              <div key={track.id} className="flex items-center space-x-2 p-2 bg-gray-700 rounded-lg">
                <div className={`w-2 h-8 ${track.status === 'error' ? 'bg-red-500' : 'bg-blue-500'} rounded-full`}></div>
                <span>{track.name}</span>
                <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ width: `${track.volume * 100}%` }}
                  ></div>
                </div>
                <button className="p-1 rounded-full hover:bg-gray-600" onClick={() => handleMuteToggle(track.id)}>
                  <Mic2 className={`h-4 w-4 ${track.muted ? 'text-red-500' : 'text-white'}`} />
                </button>
              </div>
            ))}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {tracks.map(track => (
              <div key={track.id} className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">{track.name}</h3>
                <div className="space-y-4">
                  <div className="h-24 bg-gray-700 rounded-lg overflow-hidden">
                    {/* Placeholder for waveform */}
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
                      Mute
                    </button>
                    <button 
                      className={`px-2 py-1 rounded ${track.soloed ? 'bg-green-600' : 'bg-gray-600'} hover:bg-opacity-80`}
                      onClick={() => handleSoloToggle(track.id)}
                    >
                      Solo
                    </button>
                    <button className="p-2 rounded-full hover:bg-gray-700">
                      <Sliders className="h-4 w-4" />
                    </button>
                    <button className="p-2 rounded-full hover:bg-gray-700">
                      <BarChart3 className="h-4 w-4" />
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