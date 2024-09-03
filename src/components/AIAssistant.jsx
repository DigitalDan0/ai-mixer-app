import React, { useState } from 'react';
import './AIAssistant.css';

const AIAssistant = ({ onAIRequest, onGenerateSuggestion, aiSuggestion }) => {
  const [userInput, setUserInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAIRequest(userInput);
    setUserInput('');
  };

  return (
    <div className="ai-assistant">
      <h2>AI Mixing Assistant</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="E.g., Make the vocals louder and add more bass"
        />
        <button type="submit">Apply Effect</button>
      </form>
      <button onClick={onGenerateSuggestion} className="generate-suggestion">Generate Full Mix Suggestion</button>
      {aiSuggestion && (
        <div className="ai-suggestion">
          <h3>AI Suggestion:</h3>
          <pre>{typeof aiSuggestion === 'string' ? aiSuggestion : JSON.stringify(aiSuggestion, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;