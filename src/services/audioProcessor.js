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

  // Wait for a short time to ensure we get valid data
  await new Promise(resolve => setTimeout(resolve, 100));

  const fftData = analyzer.getValue();
  const loudnessValue = loudness.getValue();
  const centroidValue = spectralCentroid.getValue();

  // Calculate RMS (Root Mean Square) for average loudness
  const rms = calculateRMS(audioBuffer);

  // Calculate peak amplitude
  const peakAmplitude = calculatePeakAmplitude(audioBuffer);

  // Calculate zero-crossing rate
  const zeroCrossingRate = calculateZeroCrossingRate(audioBuffer);

  // Analyze envelope
  const envelope = analyzeEnvelope(audioBuffer);

  // Detect transients
  const transients = detectTransients(audioBuffer);

  // Classify track
  const classification = classifyTrack(rms, zeroCrossingRate, spectralCentroid);

  player.stop();
  player.dispose();
  analyzer.dispose();
  loudness.dispose();
  spectralCentroid.dispose();

  return {
    duration: audioBuffer.duration,
    fft: Array.from(fftData),
    loudness: isFinite(loudnessValue) ? loudnessValue : -60,
    spectralCentroid: calculateSpectralCentroid(centroidValue),
    rms,
    peakAmplitude,
    zeroCrossingRate,
    envelope,
    transients,
    classification
  };
};

const calculateRMS = (audioBuffer) => {
  const channelData = audioBuffer.getChannelData(0);
  let sum = 0;
  for (let i = 0; i < channelData.length; i++) {
    sum += channelData[i] * channelData[i];
  }
  return Math.sqrt(sum / channelData.length);
};

const calculatePeakAmplitude = (audioBuffer) => {
  const channelData = audioBuffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < channelData.length; i++) {
    const abs = Math.abs(channelData[i]);
    if (abs > peak) {
      peak = abs;
    }
  }
  return peak;
};

const calculateZeroCrossingRate = (audioBuffer) => {
  const channelData = audioBuffer.getChannelData(0);
  let zeroCrossings = 0;
  for (let i = 1; i < channelData.length; i++) {
    if ((channelData[i - 1] < 0 && channelData[i] >= 0) ||
        (channelData[i - 1] >= 0 && channelData[i] < 0)) {
      zeroCrossings++;
    }
  }
  return zeroCrossings / (channelData.length - 1);
};

const calculateSpectralCentroid = (fftData) => {
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < fftData.length; i++) {
    const magnitude = Math.abs(fftData[i]);
    numerator += magnitude * i;
    denominator += magnitude;
  }

  return denominator !== 0 ? numerator / denominator : 0;
};

const analyzeEnvelope = (audioBuffer) => {
  const channelData = audioBuffer.getChannelData(0);
  const envelopeLength = Math.ceil(channelData.length / 1000); // Analyze 1000 points
  const envelope = new Float32Array(envelopeLength);

  for (let i = 0; i < envelopeLength; i++) {
    const start = i * 1000;
    const end = Math.min((i + 1) * 1000, channelData.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    envelope[i] = max;
  }

  return Array.from(envelope);
};

const detectTransients = (audioBuffer) => {
  const channelData = audioBuffer.getChannelData(0);
  const transients = [];
  const threshold = 0.1; // Adjust this value to change sensitivity
  const minDistance = 1000; // Minimum distance between transients in samples

  let lastTransient = -minDistance;

  for (let i = 1; i < channelData.length; i++) {
    const diff = Math.abs(channelData[i] - channelData[i - 1]);
    if (diff > threshold && i - lastTransient >= minDistance) {
      transients.push(i / audioBuffer.sampleRate); // Convert to seconds
      lastTransient = i;
    }
  }

  return transients;
};

const classifyTrack = (rms, zeroCrossingRate, spectralCentroid) => {
  // These thresholds are approximate and may need adjustment
  const isRhythmic = zeroCrossingRate > 0.1;
  const isHarmonic = spectralCentroid < 2000 && rms > 0.1;
  const isMelodic = spectralCentroid > 2000 && rms > 0.05;

  if (isRhythmic) return 'Rhythmic';
  if (isHarmonic) return 'Harmonic';
  if (isMelodic) return 'Melodic';
  return 'Unknown';
};

export const extractTrackType = (filename) => {
  const parts = filename.split(/[_\s-]/);
  return parts[0] || 'Unknown';
};