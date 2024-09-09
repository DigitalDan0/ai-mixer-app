import React, { useRef, useEffect, useState } from 'react';
import './WaveformSlider.css';

const WaveformSlider = ({ audioBuffer, currentTime, duration, onSeek, isPlaying, onPlayPause, onSkipToStart, onSkipToEnd }) => {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (audioBuffer && canvasRef.current) {
      drawWaveform(audioBuffer);
    }
  }, [audioBuffer]);

  useEffect(() => {
    if (canvasRef.current) {
      updatePlayhead();
    }
  }, [currentTime, duration]);

  const drawWaveform = (buffer) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);

    for (let i = 0; i < width; i++) {
      const min = Math.min(...data.slice(i * step, (i + 1) * step));
      const max = Math.max(...data.slice(i * step, (i + 1) * step));
      ctx.lineTo(i, ((1 + min) * height) / 2);
      ctx.lineTo(i, ((1 + max) * height) / 2);
    }

    ctx.strokeStyle = '#3498db';
    ctx.stroke();
  };

  const updatePlayhead = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    drawWaveform(audioBuffer);

    const playheadPosition = (currentTime / duration) * width;
    ctx.beginPath();
    ctx.moveTo(playheadPosition, 0);
    ctx.lineTo(playheadPosition, height);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleMouseMove(e);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const seekTime = (x / canvas.width) * duration;
      onSeek(seekTime);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="waveform-slider">
      <div className="waveform-controls">
        <button onClick={onSkipToStart}>⏮</button>
        <button onClick={onPlayPause}>{isPlaying ? '⏸' : '▶'}</button>
        <button onClick={onSkipToEnd}>⏭</button>
        <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={100}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default WaveformSlider;