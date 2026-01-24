import { useRef, useState } from "react";

const SafariAudioGate = ({ children, remoteAudioRef }) => {
  const [enabled, setEnabled] = useState(false);
  const unlockingRef = useRef(false);

  const enableAudio = async () => {
    if (unlockingRef.current) return;
    unlockingRef.current = true;

    try {
      if (remoteAudioRef?.current) {
        await remoteAudioRef.current.play();
      }
    } catch {
      // Safari ignore
    }

    setEnabled(true);
  };

  if (enabled) return children;

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex items-center justify-center">
      <button
        onClick={enableAudio}
        className="px-6 py-4 rounded-2xl bg-green-600 text-white text-lg font-semibold"
      >
        👆 Tap to enable audio
      </button>
    </div>
  );
};

export default SafariAudioGate;
