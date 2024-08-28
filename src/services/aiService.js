import axios from 'axios';

const keywordClassifier = (input) => {
  const lowercaseInput = input.toLowerCase();
  if (lowercaseInput.includes('volume')) return 'volume';
  if (lowercaseInput.includes('bass') || lowercaseInput.includes('low end')) return 'eq_bass';
  if (lowercaseInput.includes('treble') || lowercaseInput.includes('high end')) return 'eq_treble';
  if (lowercaseInput.includes('compression') || lowercaseInput.includes('punchy')) return 'compression';
  if (lowercaseInput.includes('balance') || lowercaseInput.includes('even out')) return 'balance';
  return 'unknown';
};

// Function to call Claude API
const callClaudeAPI = async (prompt) => {
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/complete',
      {
        prompt: prompt,
        model: 'claude-3-sonnet-20240229',
        max_tokens_to_sample: 150,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': import.meta.env.VITE_ANTHROPIC_API_KEY,
        },
      }
    );
    return response.data.completion;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error('Unable to process request');
  }
};

export const interpretUserRequest = async (userInput) => {
  const intent = keywordClassifier(userInput);
  let effect, params;

  switch (intent) {
    case 'volume':
      effect = 'volume';
      params = { change: userInput.toLowerCase().includes('increase') ? 0.1 : -0.1 };
      break;
    case 'eq_bass':
      effect = 'eq';
      params = { frequency: 100, gain: userInput.toLowerCase().includes('boost') ? 3 : -3 };
      break;
    case 'eq_treble':
      effect = 'eq';
      params = { frequency: 10000, gain: userInput.toLowerCase().includes('boost') ? 3 : -3 };
      break;
    case 'compression':
      effect = 'compression';
      params = { threshold: -24, ratio: 4 };
      break;
    case 'balance':
      effect = 'balance';
      break;
    default:
      // If we can't classify the intent, use Claude for a more nuanced interpretation
      const prompt = `Interpret the following audio mixing request and provide a JSON response with 'effect' and 'params': "${userInput}"`;
      try {
        const response = await callClaudeAPI(prompt);
        const parsedResponse = JSON.parse(response);
        effect = parsedResponse.effect;
        params = parsedResponse.params;
      } catch (error) {
        console.error('Error interpreting request with Claude:', error);
        throw new Error('Unable to interpret request');
      }
  }

  return { effect, params };
};

export const generateMixingSuggestion = async (tracks) => {
  const tracksDescription = tracks.map(track => 
    `${track.name}: volume ${track.volume}, muted: ${track.muted}, soloed: ${track.soloed}`
  ).join('\n');

  const prompt = `Given the following tracks in a mix:
${tracksDescription}

Provide a mixing suggestion to improve the overall balance and quality of the mix. Respond in JSON format with 'suggestion' and 'actions' fields.`;

  try {
    const response = await callClaudeAPI(prompt);
    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating mixing suggestion:', error);
    throw new Error('Unable to generate mixing suggestion');
  }
};