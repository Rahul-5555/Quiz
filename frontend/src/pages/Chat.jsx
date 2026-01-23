import React, { useEffect, useState, useRef } from "react";
import ChatAudioController from "./ChatAudioController";


const Chat = ({ socket, onEnd, matchId, mode }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [partnerMuted, setPartnerMuted] = useState(false);

  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const exitHandledRef = useRef(false);

  /* 🔽 AUTO SCROLL */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* 🔽 JOIN / LEAVE ROOM */
  useEffect(() => {
    if (!socket || !matchId) return;

    socket.emit("join-room", matchId);
    return () => socket.emit("leave-room", matchId);
  }, [socket, matchId]);

  /* 🔌 SOCKET EVENTS */
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (msg) =>
      setMessages((p) => [...p, { from: "partner", text: msg.text }]);

    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);

    const handlePartnerLeft = () => cleanupAndExit();
    const handleTimeout = () => cleanupAndExit();

    socket.on("receive_message", handleReceive);
    socket.on("partner_typing", handleTyping);
    socket.on("partner_stop_typing", handleStopTyping);
    socket.on("partner_left", handlePartnerLeft);
    socket.on("match_timeout", handleTimeout);
    socket.on("partner_muted", () => setPartnerMuted(true));
    socket.on("partner_unmuted", () => setPartnerMuted(false));

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("partner_typing", handleTyping);
      socket.off("partner_stop_typing", handleStopTyping);
      socket.off("partner_left", handlePartnerLeft);
      socket.off("match_timeout", handleTimeout);
      socket.off("partner_muted");
      socket.off("partner_unmuted");
    };
  }, [socket]);

  /* 🔧 SINGLE EXIT */
  const cleanupAndExit = () => {
    if (exitHandledRef.current) return;
    exitHandledRef.current = true;

    setMessages([]);
    setAudioOn(false);
    setPartnerMuted(false);

    socket.emit("leave-room", matchId);
    onEnd();
  };

  const sendMessage = () => {
    if (!text.trim()) return;

    setMessages((p) => [...p, { from: "me", text }]);
    socket.emit("send_message", text);
    socket.emit("stop_typing");
    setText("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "white", display: "flex", flexDirection: "column" }}>

      {/* HEADER */}
      <div style={{ padding: "14px", display: "flex", justifyContent: "space-between" }}>
        <span>🟢 Connected {mode === "audio" && "• Audio"}</span>
        <button onClick={cleanupAndExit}>End</button>
      </div>

      {/* 🔊 AUDIO CONTROLLER */}
      <ChatAudioController
        socket={socket}
        matchId={matchId}
        mode={mode}
        audioOn={audioOn}
        setAudioOn={setAudioOn}
      />

      {/* 💬 CHAT */}
      <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.from === "me" ? "right" : "left" }}>
            {m.text}
          </div>
        ))}
        {isTyping && <small>Typing…</small>}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div style={{ display: "flex", padding: "12px", gap: "8px" }}>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            socket.emit("typing");
            clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(
              () => socket.emit("stop_typing"),
              800
            );
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          style={{ flex: 1 }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chat;


