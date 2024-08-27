import React from 'react';
import './MasteringControls.css';

const MasteringControls = ({ settings, onSettingsChange, isBypassed, onBypassToggle }) => {
  const handleChange = (settingName, value) => {
    onSettingsChange({ ...settings, [settingName]: value });
  };

  return (
    <div className="mastering-controls">
      <h2>Mastering</h2>
      <div className="bypass-control">
        <label>
          <input
            type="checkbox"
            checked={!isBypassed}
            onChange={() => onBypassToggle(!isBypassed)}
          />
          Enable Mastering
        </label>
      </div>
      <div className="control-group">
        <label>Compressor Threshold</label>
        <input
          type="range"
          min="-60"
          max="0"
          step="1"
          value={settings.compressorThreshold}
          onChange={(e) => handleChange('compressorThreshold', Number(e.target.value))}
          disabled={isBypassed}
        />
        <span>{settings.compressorThreshold} dB</span>
      </div>
      <div className="control-group">
        <label>Compressor Ratio</label>
        <input
          type="range"
          min="1"
          max="20"
          step="0.1"
          value={settings.compressorRatio}
          onChange={(e) => handleChange('compressorRatio', Number(e.target.value))}
          disabled={isBypassed}
        />
        <span>{settings.compressorRatio}:1</span>
      </div>
      <div className="control-group">
        <label>Limiter Threshold</label>
        <input
          type="range"
          min="-60"
          max="0"
          step="1"
          value={settings.limiterThreshold}
          onChange={(e) => handleChange('limiterThreshold', Number(e.target.value))}
          disabled={isBypassed}
        />
        <span>{settings.limiterThreshold} dB</span>
      </div>
      <div className="control-group">
        <label>Output Gain</label>
        <input
          type="range"
          min="-12"
          max="12"
          step="0.1"
          value={settings.outputGain}
          onChange={(e) => handleChange('outputGain', Number(e.target.value))}
          disabled={isBypassed}
        />
        <span>{settings.outputGain} dB</span>
      </div>
    </div>
  );
};

export default MasteringControls;