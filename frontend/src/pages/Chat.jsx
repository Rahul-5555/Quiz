import React, { useEffect, useRef, useState } from "react";
import ChatAudioController from "./ChatAudioController";

const Chat = ({
  socket,
  onEnd,
  matchId,
  mode,
  audioOn,
  setAudioOn,
  isCaller,
}) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partnerMuted, setPartnerMuted] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState("");

  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const exitHandledRef = useRef(false);

  /* 🔁 RESET ON NEW MATCH */
  useEffect(() => {
    exitHandledRef.current = false;
    setShowToast(false);
    setToastText("");
  }, [matchId]);

  /* 🔽 AUTO SCROLL */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* 👀 TOAST + DELAY EXIT */
  const triggerExitWithToast = (reason = "ended") => {
    if (exitHandledRef.current) return;
    exitHandledRef.current = true;

    if (reason === "timeout") {
      setToastText("⏱️ Call timed out");
    } else if (reason === "left") {
      setToastText("👀 Partner left the chat");
    } else {
      setToastText("👀 Partner ended the call");
    }

    setShowToast(true);

    setTimeout(() => {
      cleanupAndExit();
    }, 2000);
  };

  /* 🔌 SOCKET EVENTS (LISTEN ONLY) */
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (msg) => {
      setMessages((p) => [...p, { from: "partner", text: msg.text }]);
    };

    socket.on("receive_message", handleReceive);
    socket.on("partner_typing", () => setIsTyping(true));
    socket.on("partner_stop_typing", () => setIsTyping(false));
    socket.on("partner_left", () => triggerExitWithToast("left"));
    socket.on("match_timeout", () => triggerExitWithToast("timeout"));
    socket.on("partner_muted", () => setPartnerMuted(true));
    socket.on("partner_unmuted", () => setPartnerMuted(false));
    socket.on("call-ended", () => triggerExitWithToast("ended"));

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("partner_typing");
      socket.off("partner_stop_typing");
      socket.off("partner_left");
      socket.off("match_timeout");
      socket.off("partner_muted");
      socket.off("partner_unmuted");
      socket.off("call-ended");
    };
  }, [socket]);

  /* ❌ FINAL EXIT (NO SOCKET EMIT HERE ❗) */
  const cleanupAndExit = () => {
    setShowToast(false);
    setMessages([]);
    setPartnerMuted(false);

    setAudioOn(false); // sirf UI
    onEnd();           // navigation / stage change
  };

  const sendMessage = () => {
    if (!text.trim()) return;

    setMessages((p) => [...p, { from: "me", text }]);
    socket.emit("send_message", text);
    socket.emit("stop_typing");
    setText("");
  };

  return (
    <>
      {/* 👀 TOAST */}
      {showToast && (
        <div className="fixed top-6 z-[10000] bg-black/80 text-white px-4 py-2 rounded-xl shadow-lg">
          {toastText}
        </div>
      )}

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

          {/* ❗ Chat End = only chat exit */}
          <button
            onClick={cleanupAndExit}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            End
          </button>
        </div>

        {/* 🔊 AUDIO OVERLAY */}
        {audioOn && (
          <ChatAudioController
            socket={socket}
            matchId={matchId}
            audioOn={audioOn}
            setAudioOn={setAudioOn}
            isCaller={isCaller}
          />
        )}

        {/* 💬 CHAT */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${m.from === "me"
                ? "self-end bg-indigo-600 text-white"
                : "self-start bg-slate-200 dark:bg-white/10"
                }`}
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
        <div className="flex items-center gap-3 p-3 border-t bg-white dark:bg-slate-900">
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
            className="flex-1 px-4 py-2 rounded-xl text-sm bg-slate-100 dark:bg-white/10 outline-none"
          />

          <button
            onClick={sendMessage}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
};

export default Chat;
