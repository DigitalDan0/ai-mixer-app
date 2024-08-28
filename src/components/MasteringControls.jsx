import React from 'react';
import './MasteringControls.css';

const MasteringControls = ({
  isBypassed,
  onBypassChange,
  masterVolume,
  onMasterVolumeChange,
  compressorThreshold,
  onCompressorThresholdChange,
  compressorRatio,
  onCompressorRatioChange,
  eqBands,
  onEQChange,
  reverbMix,
  onReverbMixChange,
  limiterThreshold,
  onLimiterThresholdChange
}) => {
  return (
    <div className="mastering-controls">
      <h2>Mastering Controls</h2>
      <div className="bypass-control">
        <label>
          <input
            type="checkbox"
            checked={isBypassed}
            onChange={(e) => onBypassChange(e.target.checked)}
          />
          Bypass Mastering
        </label>
      </div>
      <div className="control-group">
        <label htmlFor="master-volume">Master Volume</label>
        <input
          type="range"
          id="master-volume"
          min="0"
          max="2"
          step="0.01"
          value={masterVolume}
          onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
        />
        <span>{masterVolume.toFixed(2)}</span>
      </div>
      <div className="control-group">
        <label htmlFor="compressor-threshold">Compressor Threshold</label>
        <input
          type="range"
          id="compressor-threshold"
          min="-60"
          max="0"
          step="1"
          value={compressorThreshold}
          onChange={(e) => onCompressorThresholdChange(parseFloat(e.target.value))}
        />
        <span>{compressorThreshold} dB</span>
      </div>
      <div className="control-group">
        <label htmlFor="compressor-ratio">Compressor Ratio</label>
        <input
          type="range"
          id="compressor-ratio"
          min="1"
          max="20"
          step="0.1"
          value={compressorRatio}
          onChange={(e) => onCompressorRatioChange(parseFloat(e.target.value))}
        />
        <span>{compressorRatio}:1</span>
      </div>
      
      <h3>EQ</h3>
      {eqBands.map((band, index) => (
        <div key={index} className="eq-band">
          <label>{band.type} - {band.frequency}Hz</label>
          <input
            type="range"
            min="-12"
            max="12"
            step="0.1"
            value={band.gain}
            onChange={(e) => onEQChange(index, { gain: parseFloat(e.target.value) })}
          />
          <span>{band.gain.toFixed(1)} dB</span>
        </div>
      ))}
      
      <h3>Reverb</h3>
      <div className="control-group">
        <label htmlFor="reverb-mix">Reverb Mix</label>
        <input
          type="range"
          id="reverb-mix"
          min="0"
          max="1"
          step="0.01"
          value={reverbMix}
          onChange={(e) => onReverbMixChange(parseFloat(e.target.value))}
        />
        <span>{(reverbMix * 100).toFixed(0)}%</span>
      </div>
      
      <h3>Limiter</h3>
      <div className="control-group">
        <label htmlFor="limiter-threshold">Limiter Threshold</label>
        <input
          type="range"
          id="limiter-threshold"
          min="-12"
          max="0"
          step="0.1"
          value={limiterThreshold}
          onChange={(e) => onLimiterThresholdChange(parseFloat(e.target.value))}
        />
        <span>{limiterThreshold.toFixed(1)} dB</span>
      </div>
    </div>
  );
};

export default MasteringControls;