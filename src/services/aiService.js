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
  try {
    const tracksDescription = trackBatch.map(track => {
      const { name, volume, pan, eq, compression, analysis } = track;
      return `
        Track: ${name}
        Type: ${track.type || 'Unknown'}
        Genre: ${track.genre || 'Unknown'}
        Current Settings:
          Volume: ${volume.toFixed(2)} dB
          Pan: ${pan.toFixed(2)} (0 = center, -1 = full left, 1 = full right)
          EQ:
            Low: ${eq.low.toFixed(1)} dB
            Mid: ${eq.mid.toFixed(1)} dB
            High: ${eq.high.toFixed(1)} dB
          Compression:
            Threshold: ${compression.threshold.toFixed(1)} dB
            Ratio: ${compression.ratio.toFixed(1)}:1
        Analysis:
          Loudness: ${analysis.loudness.toFixed(2)} dB
          Spectral Centroid: ${analysis.spectralCentroid.toFixed(2)} Hz
          Frequency Distribution: ${JSON.stringify(analysis.fft.slice(0, 10))}... (truncated)
      `.trim();
    }).join('\n\n');

    const prompt = `As an expert audio engineer, analyze the following ${trackBatch.length} tracks in a mix and provide detailed mixing suggestions to improve their balance, clarity, and overall quality:

${tracksDescription}

For each track, provide specific recommendations for the following parameters:
1. Volume: Suggest a new volume level in dB, considering the balance with other tracks.
2. Pan: Recommend a pan position (-1 to 1) to create a balanced stereo image.
3. EQ: Suggest adjustments for low, mid, and high frequencies in dB to enhance clarity and reduce frequency masking.
4. Compression: Recommend threshold and ratio settings to control dynamics effectively.

Additionally, provide a brief explanation for each suggestion, relating it to the track's role in the mix and its interaction with other tracks.

Consider the following aspects in your analysis:
- Frequency balance and potential conflicts between tracks
- Dynamic range and consistency across the mix
- Stereo image and spatial placement
- Genre-specific mixing conventions (if genre is provided)

Respond in JSON format with the following structure:
{
  "trackSuggestions": [
    {
      "trackName": "string",
      "adjustments": {
        "volume": number,
        "pan": number,
        "eq": {
          "low": number,
          "mid": number,
          "high": number
        },
        "compression": {
          "threshold": number,
          "ratio": number
        }
      },
      "explanation": "string"
    }
  ],
  "overallAdvice": "string"
}`;

    console.log('Generating batch suggestions with prompt:', prompt);
    const response = await callClaudeAPI(prompt);
    console.log('Received response from Claude API:', response);
    const parsedResponse = JSON.parse(response);
    
    if (!parsedResponse.trackSuggestions || !Array.isArray(parsedResponse.trackSuggestions)) {
      throw new Error('Invalid response format from AI');
    }

    return parsedResponse;
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
    console.log('Sending request to Claude API with prompt:', prompt);
    const response = await axios.post(
      'http://localhost:3000/api/claude',
      { prompt },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Received response from Claude API:', response.data);
    return response.data.completion;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    throw new Error(`Failed to get response from Claude API: ${error.message}`);
  }
};