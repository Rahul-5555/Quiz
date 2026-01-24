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
  const prevMatchIdRef = useRef(null);
  const endingRef = useRef(false);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isMicReady, setIsMicReady] = useState(false);
  const [partnerEnded, setPartnerEnded] = useState(false);

  /* ♻️ RESET WHEN MATCH CHANGES */
  useEffect(() => {
    if (!matchId || prevMatchIdRef.current === matchId) return;

    prevMatchIdRef.current = matchId;
    startedRef.current = false;
    endingRef.current = false;
    pendingIceRef.current = [];

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    micTrackRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsMicReady(false);
    setPartnerEnded(false);
  }, [matchId]);

  /* 🔌 CREATE PEER CONNECTION */
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && socket && matchId) {
        socket.emit("ice-candidate", {
          matchId,
          candidate: e.candidate,
        });
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket, matchId]);

  /* 🎤 GET MICROPHONE (CALLER + ANSWERER) */
  const getMicStream = useCallback(async () => {
    if (micTrackRef.current) return;

    try {
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

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    } catch (err) {
      console.warn("🎤 Mic permission denied");
      setIsMicReady(false);
    }
  }, [createPeerConnection]);

  /* ▶️ START CALL (CALLER ONLY) */
  const startCall = useCallback(async () => {
    if (!socket || !matchId || startedRef.current) return;

    startedRef.current = true;
    await getMicStream();

    const pc = pcRef.current;
    if (!pc) return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("offer", { matchId, offer });
  }, [socket, matchId, getMicStream]);

  /* 🔐 SIGNALING */
  useEffect(() => {
    if (!socket) return;

    const onOffer = async ({ offer }) => {
      const pc = createPeerConnection();

      await getMicStream(); // ✅ answerer mic

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      pendingIceRef.current.forEach((c) => pc.addIceCandidate(c));
      pendingIceRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", { matchId, answer });
    };

    const onAnswer = async ({ answer }) => {
      const pc = pcRef.current;
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      pendingIceRef.current.forEach((c) => pc.addIceCandidate(c));
      pendingIceRef.current = [];
    };

    const onIce = async ({ candidate }) => {
      if (!pcRef.current || !candidate) return;

      if (pcRef.current.remoteDescription) {
        pcRef.current.addIceCandidate(candidate);
      } else {
        pendingIceRef.current.push(candidate);
      }
    };

    /* 👀 PARTNER ENDED CALL (NO CLEANUP HERE) */
    const onCallEnded = () => {
      if (endingRef.current) return;
      setPartnerEnded(true); // 🔥 Chat.jsx will decide what to do
    };

    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIce);
    socket.on("call-ended", onCallEnded);

    return () => {
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIce);
      socket.off("call-ended", onCallEnded);
    };
  }, [socket, matchId, createPeerConnection, getMicStream]);

  /* 🔇 TOGGLE MUTE */
  const toggleMute = useCallback(() => {
    if (!micTrackRef.current) return;

    micTrackRef.current.enabled = !micTrackRef.current.enabled;
    setIsMuted(!micTrackRef.current.enabled);
  }, []);

  /* ❌ FINAL CLEANUP (CALLED BY CHAT / CONTROLLER) */
  const endCall = useCallback(
    (emit = true) => {
      if (endingRef.current) return;
      endingRef.current = true;

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }

      micTrackRef.current = null;
      pendingIceRef.current = [];
      startedRef.current = false;

      setLocalStream(null);
      setRemoteStream(null);
      setIsMuted(false);
      setIsMicReady(false);

      if (emit && socket && matchId) {
        socket.emit("call-ended", { matchId });
      }
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
    partnerEnded,
  };
};

export default useWebRTC;
