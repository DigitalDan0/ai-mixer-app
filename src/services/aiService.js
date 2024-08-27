export const interpretUserRequest = async (userInput) => {
  const lowercaseInput = userInput.toLowerCase();
  
  if (lowercaseInput.includes('volume')) {
    const change = lowercaseInput.includes('increase') ? 0.1 : -0.1;
    return { effect: 'volume', params: { change } };
  } else if (lowercaseInput.includes('bass')) {
    const change = lowercaseInput.includes('increase') ? 3 : -3;
    return { effect: 'eq', params: { frequency: 100, gain: change } };
  } else if (lowercaseInput.includes('treble')) {
    const change = lowercaseInput.includes('increase') ? 3 : -3;
    return { effect: 'eq', params: { frequency: 10000, gain: change } };
  }
  
  throw new Error('Unable to interpret request');
};