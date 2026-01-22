import { useEffect, useRef } from "react";
import AudioCall from "../components/AudioCall";


const ChatAudioController = ({
  socket,
  matchId,
  mode,
  audioOn,
  setAudioOn,
}) => {
  const autoStartedRef = useRef(false);

  /* 🔥 AUTO START AUDIO IF MODE === audio */
  useEffect(() => {
    if (mode === "audio" && !autoStartedRef.current) {
      autoStartedRef.current = true;
      setAudioOn(true);
    }
  }, [mode, setAudioOn]);

  if (!audioOn) return null;

  return (
    <AudioCall
      socket={socket}
      matchId={matchId}
      onEnd={() => {
        setAudioOn(false); // 🔊 sirf audio band
      }}
    />
  );
};

export default ChatAudioController;
