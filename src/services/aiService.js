import natural from 'natural';
import axios from 'axios';

const tokenizer = new natural.WordTokenizer();
const classifier = new natural.BayesClassifier();


// Train the classifier with sample inputs
const trainClassifier = () => {
  classifier.addDocument('increase volume', 'volume');
  classifier.addDocument('turn up the volume', 'volume');
  classifier.addDocument('make it louder', 'volume');
  classifier.addDocument('decrease volume', 'volume');
  classifier.addDocument('turn down the volume', 'volume');
  classifier.addDocument('make it quieter', 'volume');
  classifier.addDocument('boost bass', 'eq');
  classifier.addDocument('more low end', 'eq');
  classifier.addDocument('increase treble', 'eq');
  classifier.addDocument('more high end', 'eq');
  classifier.addDocument('add compression', 'compression');
  classifier.addDocument('make it punchier', 'compression');
  classifier.addDocument('balance the mix', 'balance');
  classifier.addDocument('even out the levels', 'balance');
  classifier.train();
};

trainClassifier();

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
          'X-API-Key': process.env.ANTHROPIC_API_KEY,
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
  const tokens = tokenizer.tokenize(userInput.toLowerCase());
  const intent = classifier.classify(userInput);

  let effect, params;

  switch (intent) {
    case 'volume':
      effect = 'volume';
      params = { change: tokens.includes('increase') || tokens.includes('louder') ? 0.1 : -0.1 };
      break;
    case 'eq':
      effect = 'eq';
      if (tokens.includes('bass') || tokens.includes('low')) {
        params = { frequency: 100, gain: tokens.includes('boost') || tokens.includes('more') ? 3 : -3 };
      } else if (tokens.includes('treble') || tokens.includes('high')) {
        params = { frequency: 10000, gain: tokens.includes('boost') || tokens.includes('more') ? 3 : -3 };
      }
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