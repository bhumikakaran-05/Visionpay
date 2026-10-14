import React from 'react';
import { Mic, MicOff, Volume2, Radio, Loader2, AlertTriangle } from 'lucide-react';
import { VoiceStatus } from '../types/payment';

interface SoundWaveVisualizerProps {
  status: VoiceStatus;
}

export const SoundWaveVisualizer: React.FC<SoundWaveVisualizerProps> = ({ status }) => {
  return (
    <div className="relative flex items-center justify-center my-6 select-none pointer-events-none" aria-hidden="true">
      {/* Outer pulsing rings strictly when actively listening (Accessible Blue) */}
      {status === 'LISTENING' && (
        <>
          <div className="absolute w-44 h-44 rounded-full border-2 border-blue-500/30 animate-ping opacity-75" />
          <div className="absolute w-36 h-36 rounded-full border border-blue-600/40 animate-pulse" />
        </>
      )}

      {/* Outer ripple strictly when actively speaking */}
      {status === 'SPEAKING' && (
        <>
          <div className="absolute w-40 h-40 rounded-full border-2 border-emerald-500/30 animate-pulse" />
          <div className="absolute w-48 h-48 rounded-full border border-emerald-500/20 animate-ping" />
        </>
      )}

      {/* Main Center Microphone / Sound Circle */}
      <div
        className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl z-10 ${
          status === 'LISTENING'
            ? 'bg-blue-600 text-white scale-105 shadow-blue-600/40 ring-8 ring-blue-100'
            : status === 'SPEAKING'
            ? 'bg-emerald-600 text-white scale-105 shadow-emerald-600/40 ring-8 ring-emerald-100'
            : status === 'PROCESSING'
            ? 'bg-blue-700 text-white shadow-blue-700/40'
            : status === 'ERROR'
            ? 'bg-amber-500 text-white shadow-amber-500/40 ring-8 ring-amber-100'
            : status === 'MICROPHONE_UNAVAILABLE'
            ? 'bg-rose-600 text-white shadow-rose-600/40 ring-8 ring-rose-100'
            : 'bg-white text-blue-700 border-2 border-blue-600 shadow-md ring-4 ring-blue-50'
        }`}
      >
        {status === 'LISTENING' ? (
          <Radio className="w-12 h-12 animate-pulse" />
        ) : status === 'SPEAKING' ? (
          <Volume2 className="w-12 h-12 animate-bounce" />
        ) : status === 'PROCESSING' ? (
          <Loader2 className="w-12 h-12 animate-spin" />
        ) : status === 'ERROR' ? (
          <AlertTriangle className="w-12 h-12" />
        ) : status === 'MICROPHONE_UNAVAILABLE' ? (
          <MicOff className="w-12 h-12" />
        ) : (
          <Mic className="w-12 h-12 opacity-95" />
        )}
      </div>

      {/* Animated Sound Wave Bars when Speaking or Listening */}
      {(status === 'SPEAKING' || status === 'LISTENING') && (
        <div className="absolute -bottom-8 flex items-end gap-1.5 h-6">
          {[35, 70, 95, 55, 85, 45, 75].map((h, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-150 ${
                status === 'LISTENING' ? 'bg-blue-600' : 'bg-emerald-600'
              }`}
              style={{
                height: `${Math.max(8, h * 0.9)}px`,
                animation: `pulse ${0.5 + (i % 3) * 0.2}s infinite alternate ease-in-out`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
