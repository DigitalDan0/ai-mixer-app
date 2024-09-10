import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

const WaveformSlider = ({
  tracks,
  currentTime,
  duration,
  onSeek,
  isPlaying,
  onPlayPause,
  onSkipToStart,
  onSkipToEnd
}) => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [isWaveformReady, setIsWaveformReady] = useState(false);

  useEffect(() => {
    if (waveformRef.current && !wavesurfer.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'violet',
        progressColor: 'purple',
        cursorColor: 'navy',
        backend: 'WebAudio',
        height: 80,
        normalize: true,
        responsive: true,
        barWidth: 2,
        barGap: 1,
        plugins: []
      });

      wavesurfer.current.on('ready', () => {
        setIsWaveformReady(true);
      });

      wavesurfer.current.on('seek', (progress) => {
        onSeek(progress * duration);
      });
    }

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (wavesurfer.current && tracks.length > 0) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const channelCount = Math.max(...tracks.map(track => track.audioBuffer.numberOfChannels));
      const combinedBuffer = audioContext.createBuffer(
        channelCount,
        Math.max(...tracks.map(track => track.audioBuffer.length)),
        audioContext.sampleRate
      );

      for (let channel = 0; channel < channelCount; channel++) {
        const outputData = combinedBuffer.getChannelData(channel);
        tracks.forEach(track => {
          if (channel < track.audioBuffer.numberOfChannels) {
            const inputData = track.audioBuffer.getChannelData(channel);
            for (let i = 0; i < inputData.length; i++) {
              outputData[i] += inputData[i];
            }
          }
        });
      }

      // Convert the combined buffer to a Blob
      const wavBlob = bufferToWave(combinedBuffer, combinedBuffer.length);

      // Load the Blob into WaveSurfer
      wavesurfer.current.loadBlob(wavBlob);
    }
  }, [tracks]);

  useEffect(() => {
    if (wavesurfer.current && isWaveformReady) {
      wavesurfer.current.seekTo(currentTime / duration);
    }
  }, [currentTime, duration, isWaveformReady]);

  return (
    <div className="waveform-slider">
      <div ref={waveformRef} className="mb-4" />
      <div className="flex items-center justify-center space-x-4">
        <button onClick={onSkipToStart} className="p-2 rounded-full hover:bg-gray-700">
          <SkipBack className="h-6 w-6" />
        </button>
        <button onClick={onPlayPause} className="p-2 rounded-full hover:bg-gray-700">
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </button>
        <button onClick={onSkipToEnd} className="p-2 rounded-full hover:bg-gray-700">
          <SkipForward className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

// Helper function to convert AudioBuffer to WAV Blob
function bufferToWave(abuffer, len) {
  const numOfChan = abuffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);
  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164);
  setUint32(length - pos - 4);

  // write interleaved data
  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    channels.push(abuffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([buffer], { type: "audio/wav" });

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

export default WaveformSlider;