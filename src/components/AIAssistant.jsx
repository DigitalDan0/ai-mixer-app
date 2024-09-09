import React, { useState } from 'react';
import './AIAssistant.css';

const AIAssistant = ({ onAIRequest, onGenerateSuggestion, aiSuggestion }) => {
  const [userInput, setUserInput] = useState('');

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAIRequest(userInput);
    setUserInput('');
  };

  const renderSuggestions = () => {
    if (!aiSuggestion || !aiSuggestion.trackSuggestions) return null;

    return (
      <div className="ai-suggestions">
        <h3>AI Mixing Suggestions</h3>
        {aiSuggestion.trackSuggestions.map((suggestion, index) => (
          <div key={index} className="track-suggestion">
            <h4>{suggestion.trackName}</h4>
            <p><strong>Classification:</strong> {suggestion.classification}</p>
            <div className="adjustments">
              <p><strong>Volume:</strong> {suggestion.adjustments.volume.toFixed(2)} dB</p>
              <p><strong>Pan:</strong> {suggestion.adjustments.pan.toFixed(2)}</p>
              <div className="eq-adjustments">
                <p><strong>EQ:</strong></p>
                <ul>
                  <li>Low: {suggestion.adjustments.eq.low.toFixed(2)} dB</li>
                  <li>Mid: {suggestion.adjustments.eq.mid.toFixed(2)} dB</li>
                  <li>High: {suggestion.adjustments.eq.high.toFixed(2)} dB</li>
                </ul>
              </div>
              <div className="compression-adjustments">
                <p><strong>Compression:</strong></p>
                <ul>
                  <li>Threshold: {suggestion.adjustments.compression.threshold.toFixed(2)} dB</li>
                  <li>Ratio: {suggestion.adjustments.compression.ratio.toFixed(2)}:1</li>
                </ul>
              </div>
            </div>
            <p><strong>Explanation:</strong> {suggestion.explanation}</p>
          </div>
        ))}
        <div className="overall-advice">
          <h4>Overall Mix Advice</h4>
          <p>{aiSuggestion.overallAdvice}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="ai-assistant">
      <h3>AI Mixing Assistant</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={userInput}
          onChange={handleInputChange}
          placeholder="Ask for mixing advice..."
        />
        <button type="submit">Ask AI</button>
      </form>
      <button onClick={onGenerateSuggestion} className="generate-suggestion">
        Generate AI Mixing Suggestion
      </button>
      {renderSuggestions()}
    </div>
  );
};

export default AIAssistant;