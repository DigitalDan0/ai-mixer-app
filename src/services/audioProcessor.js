import * as Tone from 'tone';

export const createEQ = (audioContext) => {
  const lowFilter = audioContext.createBiquadFilter();
  lowFilter.type = 'lowshelf';
  lowFilter.frequency.value = 320;

  const midFilter = audioContext.createBiquadFilter();
  midFilter.type = 'peaking';
  midFilter.frequency.value = 1000;
  midFilter.Q.value = 0.5;

  const highFilter = audioContext.createBiquadFilter();
  highFilter.type = 'highshelf';
  highFilter.frequency.value = 3200;

  lowFilter.connect(midFilter);
  midFilter.connect(highFilter);

  return {
    low: lowFilter,
    mid: midFilter,
    high: highFilter,
    input: lowFilter,
    output: highFilter
  };
};

export const createCompressor = (audioContext) => {
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.ratio.value = 4;
  compressor.knee.value = 5;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.050;
  return compressor;
};

export const updateTrackProcessing = (track, audioContext, gainNode, pannerNode, eqNode, compressorNode) => {
  if (gainNode) {
    gainNode.gain.setValueAtTime(track.volume * (track.muted ? 0 : 1), audioContext.currentTime);
  }

  if (pannerNode) {
    pannerNode.pan.setValueAtTime(track.pan, audioContext.currentTime);
  }

  if (eqNode) {
    eqNode.low.gain.setValueAtTime(track.eq.low, audioContext.currentTime);
    eqNode.mid.gain.setValueAtTime(track.eq.mid, audioContext.currentTime);
    eqNode.high.gain.setValueAtTime(track.eq.high, audioContext.currentTime);
  }

  if (compressorNode) {
    compressorNode.threshold.setValueAtTime(track.compression.threshold, audioContext.currentTime);
    compressorNode.ratio.setValueAtTime(track.compression.ratio, audioContext.currentTime);
  }
};
// Add this function to the existing audioProcessor.js file

export const applyAIMixingSuggestions = (tracks, suggestions) => {
  return tracks.map(track => {
    const suggestion = suggestions.find(s => s.trackName === track.name);
    if (suggestion) {
      const { adjustments } = suggestion;
      return {
        ...track,
        volume: adjustments.volume !== undefined ? adjustments.volume : track.volume,
        pan: adjustments.pan !== undefined ? adjustments.pan : track.pan,
        eq: {
          low: adjustments.eq?.low !== undefined ? adjustments.eq.low : track.eq.low,
          mid: adjustments.eq?.mid !== undefined ? adjustments.eq.mid : track.eq.mid,
          high: adjustments.eq?.high !== undefined ? adjustments.eq.high : track.eq.high,
        },
        compression: {
          threshold: adjustments.compression?.threshold !== undefined ? adjustments.compression.threshold : track.compression.threshold,
          ratio: adjustments.compression?.ratio !== undefined ? adjustments.compression.ratio : track.compression.ratio,
        },
      };
    }
    return track;
  });
};
export const analyzeTrack = async (audioBuffer) => {
  const analyzer = new Tone.Analyser('fft', 2048);
  const player = new Tone.Player(audioBuffer).connect(analyzer);
  
  await Tone.loaded();
  player.start();

  const loudness = new Tone.Meter();
  player.connect(loudness);

  const spectralCentroid = new Tone.FFT(2048);
  player.connect(spectralCentroid);

  await new Promise(resolve => setTimeout(resolve, audioBuffer.duration * 1000));

  const fftData = analyzer.getValue();
  const loudnessValue = loudness.getValue();
  const centroidValue = spectralCentroid.getValue();

  player.stop();
  player.dispose();
  analyzer.dispose();
  loudness.dispose();
  spectralCentroid.dispose();

  return {
    fft: Array.from(fftData),
    loudness: loudnessValue,
    spectralCentroid: calculateSpectralCentroid(centroidValue),
  };
};

const calculateSpectralCentroid = (fftData) => {
  let weightedSum = 0;
  let totalMagnitude = 0;
  for (let i = 0; i < fftData.length; i++) {
    const magnitude = Math.abs(fftData[i]);
    weightedSum += magnitude * i;
    totalMagnitude += magnitude;
  }
  return totalMagnitude > 0 ? weightedSum / totalMagnitude : 0;
};