import { useEffect, useRef, useState, useCallback } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

const useWebRTC = (socket, matchId) => {
  const pcRef = useRef(null);
  const micTrackRef = useRef(null);
  const pendingIceRef = useRef([]);
  const startedRef = useRef(false);
  const prevMatchIdRef = useRef(null); // 🔥 IMPORTANT

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isMicReady, setIsMicReady] = useState(false);

  /* ♻️ RESET ONLY WHEN MATCH ACTUALLY CHANGES (STRICTMODE SAFE) */
  useEffect(() => {
    if (!matchId) return;

    if (prevMatchIdRef.current === matchId) return; // 🚫 SAME MATCH → SKIP

    prevMatchIdRef.current = matchId;
    console.log("♻️ Reset WebRTC for NEW match:", matchId);

    startedRef.current = false;
    pendingIceRef.current = [];

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsMicReady(false);
  }, [matchId]);

  /* 🔌 CREATE PEER CONNECTION */
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.ontrack = (e) => {
      console.log("🔊 Remote stream received");
      setRemoteStream(e.streams[0]);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", {
          matchId,
          candidate: e.candidate,
        });
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket, matchId]);

  /* ▶️ START CALL (CALLER ONLY) */
  const startCall = useCallback(async () => {
    if (!socket || !matchId) return;
    if (startedRef.current) return;

    const pc = createPeerConnection();

    if (pc.signalingState === "closed") {
      console.warn("❌ PC already closed, abort startCall");
      return;
    }

    startedRef.current = true;
    console.log("🚀 WebRTC startCall");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    micTrackRef.current = stream.getAudioTracks()[0];
    setLocalStream(stream);
    setIsMicReady(true);

    stream.getTracks().forEach((track) => {
      if (pc.signalingState !== "closed") {
        pc.addTrack(track, stream);
      }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("offer", { matchId, offer });
  }, [socket, matchId, createPeerConnection]);

  /* 🔐 SIGNALING */
  useEffect(() => {
    if (!socket) return;

    const onOffer = async ({ offer }) => {
      const pc = createPeerConnection();

      if (pc.signalingState !== "stable") {
        console.warn("⚠️ Ignore offer, state:", pc.signalingState);
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      for (const ice of pendingIceRef.current) {
        await pc.addIceCandidate(ice);
      }
      pendingIceRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", { matchId, answer });
    };

    const onAnswer = async ({ answer }) => {
      if (!pcRef.current) return;
      const pc = pcRef.current;

      if (pc.signalingState !== "have-local-offer") {
        console.warn("⚠️ Ignore answer, state:", pc.signalingState);
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      for (const ice of pendingIceRef.current) {
        await pc.addIceCandidate(ice);
      }
      pendingIceRef.current = [];
    };

    const onIce = async ({ candidate }) => {
      if (!pcRef.current || !candidate) return;

      if (pcRef.current.remoteDescription) {
        await pcRef.current.addIceCandidate(candidate);
      } else {
        pendingIceRef.current.push(candidate);
      }
    };

    const onCallEnd = () => {
      endCall(false);
    };

    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIce);
    socket.on("call-ended", onCallEnd);

    return () => {
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIce);
      socket.off("call-ended", onCallEnd);
    };
  }, [socket, matchId, createPeerConnection]);

  /* 🔇 MUTE */
  const toggleMute = useCallback(() => {
    if (!micTrackRef.current) return;

    micTrackRef.current.enabled = !micTrackRef.current.enabled;
    setIsMuted(!micTrackRef.current.enabled);

    socket.emit(micTrackRef.current.enabled ? "unmute" : "mute");
  }, [socket]);

  /* ❌ END CALL */
  const endCall = useCallback(
    (emit = true) => {
      console.log("🧹 WebRTC cleanup");

      startedRef.current = false;
      pendingIceRef.current = [];

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      localStream?.getTracks().forEach((t) => t.stop());

      setLocalStream(null);
      setRemoteStream(null);
      setIsMuted(false);
      setIsMicReady(false);

      if (emit) socket.emit("call-ended", { matchId });
    },
    [socket, matchId, localStream]
  );

  return {
    localStream,
    remoteStream,
    startCall,
    endCall,
    toggleMute,
    isMuted,
    isMicReady,
  };
};

export default useWebRTC;
