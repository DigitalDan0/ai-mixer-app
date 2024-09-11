import React from 'react';
import MasteringControls from '../src/components/MasteringControls';
import AudioVisualizer from '../src/components/AudioVisualizer';

const MasteringStage = ({
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
  onLimiterThresholdChange,
  analyserNode
}) => {
  return (
    <div className="mastering-stage">
      <h2>Mastering Stage</h2>
      <MasteringControls
        isBypassed={isBypassed}
        onBypassChange={onBypassChange}
        masterVolume={masterVolume}
        onMasterVolumeChange={onMasterVolumeChange}
        compressorThreshold={compressorThreshold}
        onCompressorThresholdChange={onCompressorThresholdChange}
        compressorRatio={compressorRatio}
        onCompressorRatioChange={onCompressorRatioChange}
        eqBands={eqBands}
        onEQChange={onEQChange}
        reverbMix={reverbMix}
        onReverbMixChange={onReverbMixChange}
        limiterThreshold={limiterThreshold}
        onLimiterThresholdChange={onLimiterThresholdChange}
      />
      <AudioVisualizer analyserNode={analyserNode} />
    </div>
  );
};

export default MasteringStage;