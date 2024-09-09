const API_URL = 'http://localhost:3000/api/claude'; // Adjust this URL if your backend is running on a different port

export const callClaudeAPI = async (prompt) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.completion;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
};

const isValidNumber = (value) => {
  return typeof value === 'number' && isFinite(value);
};

export const interpretUserRequest = async (userInput, tracks) => {
  // Implementation remains the same
};

export const generateMixingSuggestion = async (tracks) => {
  try {
    const batchSize = 5;
    const suggestions = [];

    for (let i = 0; i < tracks.length; i += batchSize) {
      const trackBatch = tracks.slice(i, i + batchSize);
      const batchSuggestions = await generateBatchSuggestions(trackBatch);
      suggestions.push(...batchSuggestions.trackSuggestions);
    }

    return {
      trackSuggestions: suggestions,
      overallAdvice: "Overall mixing advice based on all tracks."
    };
  } catch (error) {
    console.error('Error generating mixing suggestion:', error);
    throw new Error('Unable to generate mixing suggestion');
  }
};

const generateBatchSuggestions = async (trackBatch) => {
  try {
    const tracksDescription = trackBatch.map(track => `
      Track Name: ${track.name}
      Type: ${track.type}
      Classification: ${track.classification}
      Loudness: ${isValidNumber(track.analysis.loudness) ? track.analysis.loudness.toFixed(2) : 'N/A'} LUFS
      Dynamic Range: ${isValidNumber(track.analysis.dynamicRange) ? track.analysis.dynamicRange.toFixed(2) : 'N/A'} dB
      Spectral Centroid: ${isValidNumber(track.analysis.spectralCentroid) ? track.analysis.spectralCentroid.toFixed(2) : 'N/A'} Hz
      Current Settings:
        Volume: ${isValidNumber(track.volume) ? track.volume.toFixed(2) : 'N/A'}
        Pan: ${isValidNumber(track.pan) ? track.pan.toFixed(2) : 'N/A'}
        EQ: Low: ${isValidNumber(track.eq.low) ? track.eq.low.toFixed(2) : 'N/A'} dB, Mid: ${isValidNumber(track.eq.mid) ? track.eq.mid.toFixed(2) : 'N/A'} dB, High: ${isValidNumber(track.eq.high) ? track.eq.high.toFixed(2) : 'N/A'} dB
        Compression: Threshold: ${isValidNumber(track.compression.threshold) ? track.compression.threshold.toFixed(2) : 'N/A'} dB, Ratio: ${isValidNumber(track.compression.ratio) ? track.compression.ratio.toFixed(2) : 'N/A'}:1
    `).join('\n');

    const prompt = `As an expert audio engineer, analyze the following ${trackBatch.length} tracks in a mix and provide detailed mixing suggestions to improve their balance, clarity, and overall quality:

    ${tracksDescription}
    
    For each track, provide specific recommendations for the following parameters:
    1. Volume: Suggest a new volume level in dB, considering the balance with other tracks. Volume should be suggested as a positive value between 0 and 2, where 1 is unity gain (0 dB).
    2. Pan: Recommend a pan position (-1 to 1) to create a balanced stereo image.
    3. EQ: Suggest adjustments for low, mid, and high frequencies in dB to enhance clarity and reduce frequency masking.
    4. Compression: Recommend threshold and ratio settings to control dynamics effectively.
    
    Additionally, provide a brief explanation for each suggestion, relating it to the track's role in the mix, its classification, and its interaction with other tracks.
    
    Consider the following aspects in your analysis:
    - Frequency balance and potential conflicts between tracks
    - Dynamic range and consistency across the mix
    - Stereo image and spatial placement
    - Genre-specific mixing conventions (if genre is provided)
    - Track classification (Rhythmic, Harmonic, Melodic) and its implications for mixing
    - Transient content and its impact on dynamics processing
    - Overall envelope shape and its influence on track balance
    
    IMPORTANT: In your response, do not use contractions. For the compression ratio, provide only the number without ":1". Ensure all numeric values are valid JSON numbers without quotes.
    
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
    console.log('Received raw response from Claude API:', response);

    const cleanedResponse = response.replace(/:\s*\+/g, ': ');

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      console.log('Response that failed to parse:', cleanedResponse);
      throw new Error('Invalid JSON response from AI');
    }

    if (!parsedResponse.trackSuggestions || !Array.isArray(parsedResponse.trackSuggestions)) {
      console.error('Invalid response structure:', parsedResponse);
      throw new Error('Invalid response format from AI');
    }

    return parsedResponse;
  } catch (error) {
    console.error('Error generating batch mixing suggestion:', error);
    throw new Error('Unable to generate batch mixing suggestion');
  }
};