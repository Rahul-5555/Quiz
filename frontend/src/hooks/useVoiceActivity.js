import { useEffect, useRef, useState } from "react";

const DEFAULTS = {
  silenceTime: 800,
  smoothing: 0.95,
  sensitivity: 2.2,
  fftSize: 1024,
};

const useVoiceActivity = (stream, options = {}) => {
  const {
    silenceTime,
    smoothing,
    sensitivity,
    fftSize,
  } = { ...DEFAULTS, ...options };

  const [isSpeaking, setIsSpeaking] = useState(false);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastStateRef = useRef(false);
  const noiseFloorRef = useRef(0.01);

  useEffect(() => {
    if (!stream) return;

    let cancelled = false;

    const audioCtx = new (window.AudioContext ||
      window.webkitAudioContext)();
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = fftSize;
    source.connect(analyser);
    analyserRef.current = analyser;

    const buffer = new Uint8Array(analyser.fftSize);

    const resumeAudio = async () => {
      if (audioCtx.state === "suspended") {
        try {
          await audioCtx.resume();
        } catch (err) {
          console.warn("AudioContext resume failed", err);
        }
      }
    };
    resumeAudio();

    const detect = () => {
      if (cancelled) return;

      analyser.getByteTimeDomainData(buffer);

      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        const v = (buffer[i] - 128) / 128;
        sum += v * v;
      }

      const rms = Math.sqrt(sum / buffer.length);

      // 🎯 adaptive noise floor
      noiseFloorRef.current =
        noiseFloorRef.current * smoothing + rms * (1 - smoothing);

      const threshold = noiseFloorRef.current * sensitivity;
      const speaking = rms > threshold;

      if (speaking !== lastStateRef.current) {
        lastStateRef.current = speaking;

        if (speaking) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
          setIsSpeaking(true);
        } else {
          silenceTimerRef.current = setTimeout(() => {
            setIsSpeaking(false);
            silenceTimerRef.current = null;
          }, silenceTime);
        }
      }

      rafRef.current = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(silenceTimerRef.current);
      analyser.disconnect();
      source.disconnect();
      audioCtx.close();
    };
  }, [stream, silenceTime, smoothing, sensitivity, fftSize]);

  return { isSpeaking };
};

export default useVoiceActivity;
