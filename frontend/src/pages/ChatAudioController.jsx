import { useEffect, useRef } from "react";
import AudioCall from "../components/AudioCall";
import useWebRTC from "../hooks/useWebRTC";

const ChatAudioController = ({
  socket,
  matchId,
  audioOn,
  setAudioOn,
  isCaller,
}) => {
  const startedRef = useRef(false);

  const webrtc = useWebRTC(socket, matchId);
  const { startCall, endCall } = webrtc;

  /* ▶️ START CALL (CALLER ONLY) */
  useEffect(() => {
    if (!audioOn) return;
    if (!isCaller) return;
    if (startedRef.current) return;

    startedRef.current = true;
    console.log("🎤 Caller starting WebRTC");
    startCall();
  }, [audioOn, isCaller, startCall]);

  /* 🔔 SERVER END */
  useEffect(() => {
    if (!socket) return;

    const handleEnd = () => {
      setAudioOn(false);
      startedRef.current = false;
    };

    socket.on("call-ended", handleEnd);
    return () => socket.off("call-ended", handleEnd);
  }, [socket, setAudioOn]);

  if (!audioOn) return null;

  return (
    <AudioCall
      {...webrtc}
      onEnd={() => {
        endCall();
        setAudioOn(false);
        startedRef.current = false;
      }}
    />
  );
};

export default ChatAudioController;
