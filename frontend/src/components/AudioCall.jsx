import { useEffect, useRef, useState, useCallback } from "react";
import useVoiceActivity from "../hooks/useVoiceActivity";

const CALL_DURATION = 10 * 60;

const AudioCall = ({
  localStream,
  remoteStream,
  toggleMute,
  isMuted,
  isMicReady,
  onEnd,
}) => {
  const { isSpeaking } = useVoiceActivity(localStream);

  const [timeLeft, setTimeLeft] = useState(CALL_DURATION);

  const endedRef = useRef(false);
  const timerRef = useRef(null);
  const remoteAudioRef = useRef(null);

  /* ⏱️ START TIMER ON MOUNT */
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  /* ❌ SAFE END */
  const handleEnd = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    onEnd?.();
  }, [onEnd]);

  /* 🔊 REMOTE AUDIO */
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => { });
    }
  }, [remoteStream]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isEndingSoon = timeLeft <= 30;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black text-white">
      <div className="w-[92%] max-w-sm rounded-3xl bg-white/5 p-6 flex flex-col items-center gap-6">

        <h2 className="text-lg font-semibold">🔊 Audio Call</h2>

        {/* ⏱️ TIMER */}
        <div
          className={`text-4xl font-bold ${isEndingSoon
            ? "text-red-400 animate-pulse"
            : "text-yellow-400"
            }`}
        >
          {formatTime(timeLeft)}
        </div>

        {/* 🎙️ SPEAKING INDICATOR */}
        <div
          className={`px-4 py-1 rounded-full text-sm ${isSpeaking
            ? "bg-green-500/20 text-green-400 animate-pulse"
            : "bg-white/10 text-gray-400"
            }`}
        >
          {isSpeaking ? "Speaking…" : "Silent"}
        </div>

        {!isMicReady && (
          <span className="text-xs text-yellow-400">
            🎤 Waiting for microphone permission
          </span>
        )}

        {/* 🎤 LOCAL AUDIO */}
        {localStream && (
          <audio
            autoPlay
            muted
            playsInline
            ref={(el) => el && (el.srcObject = localStream)}
          />
        )}

        {/* 🔊 REMOTE AUDIO */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* 🎛️ CONTROLS */}
        <div className="flex gap-6 mt-4">
          <button
            onClick={toggleMute}
            disabled={!isMicReady}
            className="w-14 h-14 rounded-full bg-slate-700"
          >
            {isMuted ? "🔈" : "🔇"}
          </button>

          <button
            onClick={handleEnd}
            className="w-14 h-14 rounded-full bg-red-600"
          >
            📞
          </button>
        </div>

        <p className="text-xs opacity-40">
          Call ends automatically
        </p>
      </div>
    </div>
  );
};

export default AudioCall;
