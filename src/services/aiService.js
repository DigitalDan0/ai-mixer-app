import axios from 'axios';
import { analyzeTrack } from './audioProcessor';

const CLAUDE_API_URL = process.env.VITE_CLAUDE_API_URL || 'https://api.anthropic.com/v1/complete';
const CLAUDE_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
const MAX_TRACKS_PER_CALL = 4;

export const interpretUserRequest = async (userInput, tracks) => {
  const prompt = `As an AI mixing assistant, interpret the following user request and suggest specific parameter changes for the mix:

User request: "${userInput}"

Current mix state:
${JSON.stringify(tracks, null, 2)}

Provide a response in JSON format with an array of objects, each containing 'trackName' and 'adjustments'. The 'adjustments' should be an object with 'volume', 'pan', 'eq', and 'compression' properties, only including the parameters that need to be changed.`;

  try {
    const response = await callClaudeAPI(prompt);
    return JSON.parse(response);
  } catch (error) {
    console.error('Error interpreting user request:', error);
    throw new Error('Unable to interpret user request');
  }
};

export const generateMixingSuggestion = async (tracks) => {
  const analyzedTracks = await Promise.all(tracks.map(async (track) => {
    if (!track.analysis) {
      const analysis = await analyzeTrack(track.buffer);
      return { ...track, analysis };
    }
    return track;
  }));

  const suggestions = [];
  for (let i = 0; i < analyzedTracks.length; i += MAX_TRACKS_PER_CALL) {
    const trackBatch = analyzedTracks.slice(i, i + MAX_TRACKS_PER_CALL);
    const batchSuggestions = await generateBatchSuggestions(trackBatch);
    suggestions.push(...batchSuggestions.trackSuggestions);
  }

  const overallMixAdvice = await generateOverallMixAdvice(analyzedTracks);

  return {
    trackSuggestions: suggestions,
    overallMixAdvice
  };
};

const generateBatchSuggestions = async (trackBatch) => {
  const tracksDescription = trackBatch.map(track => 
    `${track.name}:
     Volume: ${track.volume.toFixed(2)}
     Pan: ${track.pan.toFixed(2)}
     EQ: low ${track.eq.low.toFixed(1)}dB, mid ${track.eq.mid.toFixed(1)}dB, high ${track.eq.high.toFixed(1)}dB
     Compression: threshold ${track.compression.threshold.toFixed(1)}dB, ratio ${track.compression.ratio.toFixed(1)}:1
     Loudness: ${track.analysis.loudness.toFixed(2)} dB
     Spectral Centroid: ${track.analysis.spectralCentroid.toFixed(2)} Hz
     FFT Data: ${JSON.stringify(track.analysis.fft.slice(0, 10))}... (truncated)`
  ).join('\n\n');

  const prompt = `As an expert audio engineer, analyze the following ${trackBatch.length} tracks in a mix and provide detailed mixing suggestions to improve their balance and quality:

${tracksDescription}

Consider the following aspects when making suggestions:
1. Volume balance between tracks
2. Stereo placement (panning)
3. Frequency balance and potential conflicts (use the FFT and spectral centroid data)
4. Dynamic range control (use the loudness data)
5. Tonal balance and clarity

Provide mixing suggestions for each track, including volume, pan, EQ, and compression adjustments. Be specific with your recommendations, providing numerical values where appropriate. Base your suggestions on the actual audio analysis data provided.

Respond in JSON format with the following structure:
{
  "trackSuggestions": [
    {
      "trackName": "string",
      "adjustments": {
        "volume": number,
        "pan": number,
        "eq": { "low": number, "mid": number, "high": number },
        "compression": { "threshold": number, "ratio": number }
      }
    }
  ]
}`;

  try {
    const response = await callClaudeAPI(prompt);
    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating batch mixing suggestion:', error);
    throw new Error('Unable to generate batch mixing suggestion');
  }
};

const generateOverallMixAdvice = async (allTracks) => {
  const tracksOverview = allTracks.map(track => 
    `${track.name}: Volume ${track.volume.toFixed(2)}, Pan ${track.pan.toFixed(2)}, Loudness ${track.analysis.loudness.toFixed(2)} dB`
  ).join('\n');

  const prompt = `As an expert audio engineer, provide general mixing advice for the following tracks:

${tracksOverview}

Consider the overall balance, clarity, and coherence of the mix. Provide advice on how to improve the interaction between tracks and achieve a professional sound.

Respond with a concise paragraph of mixing advice.`;

  try {
    const response = await callClaudeAPI(prompt);
    return response.trim();
  } catch (error) {
    console.error('Error generating overall mix advice:', error);
    throw new Error('Unable to generate overall mix advice');
  }
};

const callClaudeAPI = async (prompt) => {
  try {
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        prompt: prompt,
        model: 'claude-v1',
        max_tokens_to_sample: 2000,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': CLAUDE_API_KEY,
        },
      }
    );

    return response.data.completion;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error('Failed to get response from Claude API');
  }
};