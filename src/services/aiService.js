import axios from 'axios';

const CLAUDE_API_URL = process.env.VITE_CLAUDE_API_URL || 'https://api.anthropic.com/v1/complete';
const CLAUDE_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;

const callClaudeAPI = async (prompt) => {
  try {
    const response = await axios.post(CLAUDE_API_URL, {
      prompt: prompt,
      max_tokens_to_sample: 300,
      model: "claude-2.1",
      temperature: 0.7,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
    });
    return response.data.completion;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error('Failed to get response from Claude API');
  }
};

export const generateMixingSuggestion = async (tracks) => {
  const tracksDescription = tracks.map(track => 
    `${track.name}: volume ${track.volume.toFixed(2)}, pan ${track.pan.toFixed(2)}, eq: low ${track.eq.low.toFixed(1)}dB, mid ${track.eq.mid.toFixed(1)}dB, high ${track.eq.high.toFixed(1)}dB, compression: threshold ${track.compression.threshold.toFixed(1)}dB, ratio ${track.compression.ratio.toFixed(1)}:1`
  ).join('\n');

  const prompt = `As an expert audio engineer, analyze the following tracks in a mix and provide detailed mixing suggestions to improve the overall balance and quality:

${tracksDescription}

Consider the following aspects when making suggestions:
1. Volume balance between tracks
2. Stereo placement (panning)
3. Frequency balance and potential conflicts
4. Dynamic range control

Provide mixing suggestions for each track, including volume, pan, EQ, and compression adjustments. Be specific with your recommendations, providing numerical values where appropriate. Respond in JSON format with an array of objects, each containing 'trackName' and 'adjustments'. The 'adjustments' should be an object with 'volume', 'pan', 'eq', and 'compression' properties.

Example response format:
[
  {
    "trackName": "Vocals",
    "adjustments": {
      "volume": 0.8,
      "pan": 0,
      "eq": {
        "low": -2,
        "mid": 1,
        "high": 2
      },
      "compression": {
        "threshold": -18,
        "ratio": 4
      }
    }
  },
  ...
]`;

  try {
    const response = await callClaudeAPI(prompt);
    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating mixing suggestion:', error);
    throw new Error('Unable to generate mixing suggestion');
  }
};

export const interpretUserRequest = async (userInput, currentMix) => {
  const prompt = `As an AI mixing assistant, interpret the following user request and suggest specific parameter changes for the mix:

User request: "${userInput}"

Current mix state:
${JSON.stringify(currentMix, null, 2)}

Provide a response in JSON format with an array of objects, each containing 'trackName' and 'adjustments'. The 'adjustments' should be an object with 'volume', 'pan', 'eq', and 'compression' properties, only including the parameters that need to be changed.`;

  try {
    const response = await callClaudeAPI(prompt);
    return JSON.parse(response);
  } catch (error) {
    console.error('Error interpreting user request:', error);
    throw new Error('Unable to interpret user request');
  }
};