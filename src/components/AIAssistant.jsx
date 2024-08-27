import React, { useState } from 'react';

const AIAssistant = ({ onAIRequest }) => {
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
          placeholder="E.g., Increase volume, More bass, Less treble"
        />
        <button type="submit">Apply Effect</button>
      </form>
    </div>
  );
};

export default AIAssistant;