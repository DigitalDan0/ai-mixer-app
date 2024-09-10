import * as Tone from 'tone';

const isValidNumber = (value) => {
  return typeof value === 'number' && isFinite(value);
};

export const createEQ = (audioContext) => {
  const lowShelf = audioContext.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 320;
  lowShelf.gain.value = 0;

  const midPeak = audioContext.createBiquadFilter();
  midPeak.type = 'peaking';
  midPeak.frequency.value = 1000;
  midPeak.Q.value = 0.5;
  midPeak.gain.value = 0;

  const highShelf = audioContext.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 3200;
  highShelf.gain.value = 0;

  lowShelf.connect(midPeak);
  midPeak.connect(highShelf);

  return {
    input: lowShelf,
    output: highShelf,
    lowShelf,
    midPeak,
    highShelf
  };
};

export const createCompressor = (audioContext) => {
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  return compressor;
};

export const updateTrackProcessing = (changes, audioContext, gainNode, pannerNode, eqNode, compressorNode) => {
  const currentTime = audioContext.currentTime;

  console.log('Updating track processing with changes:', changes);

  if (isValidNumber(changes.volume) && gainNode && gainNode.gain) {
    console.log('Setting volume:', changes.volume);
    gainNode.gain.setValueAtTime(changes.volume, currentTime);
  }

  if (isValidNumber(changes.pan) && pannerNode && pannerNode.pan) {
    console.log('Setting pan:', changes.pan);
    pannerNode.pan.setValueAtTime(changes.pan, currentTime);
  }

  if (changes.eq && eqNode) {
    console.log('Setting EQ:', changes.eq);
    if (isValidNumber(changes.eq.low) && eqNode.low && eqNode.low.gain) {
      eqNode.low.gain.setValueAtTime(changes.eq.low, currentTime);
    }
    if (isValidNumber(changes.eq.mid) && eqNode.mid && eqNode.mid.gain) {
      eqNode.mid.gain.setValueAtTime(changes.eq.mid, currentTime);
    }
    if (isValidNumber(changes.eq.high) && eqNode.high && eqNode.high.gain) {
      eqNode.high.gain.setValueAtTime(changes.eq.high, currentTime);
    }
  }

  if (changes.compression && compressorNode) {
    console.log('Setting compression:', changes.compression);
    if (isValidNumber(changes.compression.threshold) && compressorNode.threshold) {
      compressorNode.threshold.setValueAtTime(changes.compression.threshold, currentTime);
    }
    if (isValidNumber(changes.compression.ratio) && compressorNode.ratio) {
      compressorNode.ratio.setValueAtTime(changes.compression.ratio, currentTime);
    }
  }
};

export const analyzeTrack = async (audioBuffer) => {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const loudness = calculateLoudness(channelData);
  const spectralCentroid = calculateSpectralCentroid(channelData);
  const envelope = analyzeEnvelope(audioBuffer);
  const classification = classifyTrack(loudness, spectralCentroid, envelope);

  return {
    loudness,
    spectralCentroid,
    envelope,
    classification
  };
};

export const extractTrackType = (filename) => {
  const lowercaseFilename = filename.toLowerCase();
  if (lowercaseFilename.includes('vocal') || lowercaseFilename.includes('vox')) return 'Vocals';
  if (lowercaseFilename.includes('guitar')) return 'Guitar';
  if (lowercaseFilename.includes('bass')) return 'Bass';
  if (lowercaseFilename.includes('drum') || lowercaseFilename.includes('kick') || lowercaseFilename.includes('snare')) return 'Drums';
  if (lowercaseFilename.includes('synth') || lowercaseFilename.includes('pad')) return 'Synth';
  if (lowercaseFilename.includes('piano') || lowercaseFilename.includes('keys')) return 'Keys';
  return 'Other';
};

const calculateLoudness = (channelData) => {
  let sum = 0;
  for (let i = 0; i < channelData.length; i++) {
    sum += channelData[i] * channelData[i];
  }
  const rms = Math.sqrt(sum / channelData.length);
  return 20 * Math.log10(rms);
};

const calculateSpectralCentroid = (channelData) => {
  const fftSize = 2048;
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = fftSize;

  const source = audioContext.createBufferSource();
  const buffer = audioContext.createBuffer(1, channelData.length, audioContext.sampleRate);
  buffer.getChannelData(0).set(channelData);
  source.buffer = buffer;

  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const frequencyData = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(frequencyData);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < frequencyData.length; i++) {
    const magnitude = Math.pow(10, frequencyData[i] / 20);
    numerator += magnitude * i;
    denominator += magnitude;
  }

  source.disconnect();
  analyser.disconnect();
  audioContext.close();

  return denominator !== 0 ? numerator / denominator : 0;
};

const analyzeEnvelope = (audioBuffer) => {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const envelopeLength = Math.floor(sampleRate * 0.01); // 10ms segments
  const envelopeData = [];

  for (let i = 0; i < channelData.length; i += envelopeLength) {
    const segment = channelData.slice(i, i + envelopeLength);
    const rms = Math.sqrt(segment.reduce((sum, sample) => sum + sample * sample, 0) / segment.length);
    envelopeData.push(rms);
  }

  return envelopeData;
};

const classifyTrack = (loudness, spectralCentroid, envelope) => {
  // This is a simplified classification method. In a real-world scenario, you'd use more sophisticated techniques.
  if (loudness > -10 && spectralCentroid > 3000) return 'Lead';
  if (loudness < -15 && spectralCentroid < 500) return 'Bass';
  if (envelope.some(value => value > 0.8)) return 'Percussive';
  return 'Other';
};