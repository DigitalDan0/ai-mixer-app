const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: 'http://localhost:5173', // Replace with your frontend URL if different
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const CLAUDE_API_URL = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/complete';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

app.post('/api/claude', async (req, res) => {
  try {
    console.log('Received request to Claude API:', req.body);
    console.log('CLAUDE_API_URL:', CLAUDE_API_URL);
    console.log('CLAUDE_API_KEY:', CLAUDE_API_KEY ? 'Set' : 'Not set');

    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY is not set');
    }

    // Format the prompt to match Claude's expected format
    const formattedPrompt = `\n\nHuman: ${req.body.prompt}\n\nAssistant: Certainly! I'll analyze the tracks and provide mixing suggestions based on the information you've provided. Here's my analysis and recommendations in the requested JSON format:`;

    const response = await axios.post(
      CLAUDE_API_URL,
      {
        prompt: formattedPrompt,
        model: 'claude-v1',
        max_tokens_to_sample: 2000,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      }
    );
    console.log('Received response from Claude API:', response.data);
    res.json({ completion: response.data.completion });
  } catch (error) {
    console.error('Error calling Claude API:', error);
    if (error.response) {
      console.error('Claude API error response:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to get response from Claude API', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});