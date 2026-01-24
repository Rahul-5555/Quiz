import React, { useEffect, useRef, useState } from "react";
import ChatAudioController from "./ChatAudioController";

const Chat = ({
  socket,
  onEnd,
  matchId,
  mode,
  audioOn,        // 🔥 parent se
  setAudioOn,     // 🔥 parent se
  isCaller,       // 🔥 parent se
}) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partnerMuted, setPartnerMuted] = useState(false);

  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const exitHandledRef = useRef(false);

  /* 🔽 AUTO SCROLL */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* 🔌 SOCKET EVENTS */
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (msg) => {
      setMessages((p) => [...p, { from: "partner", text: msg.text }]);
    };

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

  /* ❌ SINGLE EXIT (CHAT + AUDIO SAFE) */
  const cleanupAndExit = () => {
    if (exitHandledRef.current) return;
    exitHandledRef.current = true;

    setMessages([]);
    setPartnerMuted(false);

    setAudioOn(false); // 🔥 stop audio overlay
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
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white">

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10">
        <div className="text-sm">
          🟢 Connected
          {audioOn && <span className="ml-1">• Audio</span>}
          {partnerMuted && (
            <div className="text-xs opacity-60">🔇 Partner muted</div>
          )}
        </div>

        <button
          onClick={cleanupAndExit}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          End
        </button>
      </div>

      {/* 🔊 AUDIO OVERLAY (ALWAYS ON TOP OF CHAT) */}
      {audioOn && (
        <ChatAudioController
          socket={socket}
          matchId={matchId}
          audioOn={audioOn}
          setAudioOn={setAudioOn}
          isCaller={isCaller}
        />
      )}

      {/* 💬 CHAT MESSAGES */}
      <div
        className="
          flex-1 min-h-0
          overflow-y-auto
          px-4 py-3
          flex flex-col gap-2
        "
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[75%] px-3 py-2 rounded-xl text-sm
              ${m.from === "me"
                ? "self-end bg-indigo-600 text-white"
                : "self-start bg-slate-200 dark:bg-white/10"
              }
            `}
          >
            {m.text}
          </div>
        ))}

        {isTyping && (
          <span className="text-xs opacity-60">Typing…</span>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ⌨️ INPUT */}
      <div
        className="
          flex items-center gap-3
          p-3
          border-t
          border-slate-200 dark:border-white/10
          bg-white dark:bg-slate-900
        "
      >
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
          placeholder="Type a message…"
          className="
            flex-1
            px-4 py-2
            rounded-xl
            text-sm
            bg-slate-100 dark:bg-white/10
            text-slate-900 dark:text-white
            placeholder-slate-500 dark:placeholder-white/40
            outline-none
            border border-slate-300 dark:border-white/10
            focus:ring-2 focus:ring-indigo-500/50
          "
        />

        <button
          onClick={sendMessage}
          className="
            px-5 py-2
            rounded-xl
            text-sm font-medium
            text-white
            bg-indigo-600
            hover:bg-indigo-700
            active:scale-95
            transition
          "
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
