import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

const PlaybackControls = ({ isPlaying, currentTime, duration, onPlayPause, onSeek, onSkipToStart, onSkipToEnd }) => {
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div>
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
    </div>
  );
};

export default PlaybackControls;