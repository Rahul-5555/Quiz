import React, { memo, useRef, useState } from "react";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];
const LONG_PRESS_TIME = 400;

const MessageBubble = memo(({ m, onReact }) => {
  const [showReactions, setShowReactions] = useState(false);
  const longPressTimer = useRef(null);

  /* 📱 Long press for mobile */
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowReactions(true);
    }, LONG_PRESS_TIME);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      className={`relative group max-w-[85%] sm:max-w-[75%] px-4 py-2 
      rounded-2xl text-[15px] sm:text-sm shadow-sm select-none ${m.from === "me"
          ? "ml-auto bg-indigo-600 text-white rounded-br-sm"
          : "mr-auto bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm"
        }`}
      /* Desktop */
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
      /* Mobile */
      onTouchStart={handleTouchStart}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
    >
      {/* MESSAGE TEXT */}
      <div>{m.text}</div>

      {/* STATUS */}
      {m.from === "me" && (
        <div className="text-[10px] text-right opacity-70 mt-1">
          {m.status === "sent" && "✔"}
          {m.status === "delivered" && "✔✔"}
          {m.status === "seen" && "👁"}
        </div>
      )}

      {/* 😀 REACTION PICKER */}
      {showReactions && (
        <div
          className="absolute -top-10 left-2 flex gap-2 
          bg-white dark:bg-slate-700 px-3 py-1.5 
          rounded-full shadow-lg text-lg z-20"
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(m.id, emoji);
                setShowReactions(false);
              }}
              className="active:scale-125 transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* REACTION COUNTS */}
      {Object.keys(m.reactions.counts).length > 0 && (
        <div className="flex gap-1 mt-1 text-xs">
          {Object.entries(m.reactions.counts).map(([emoji, count]) => (
            <span
              key={emoji}
              className={`px-2 py-[2px] rounded-full ${m.reactions.myReaction === emoji
                ? "bg-indigo-500 text-white"
                : "bg-slate-200 dark:bg-slate-700"
                }`}
            >
              {emoji} {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

export default MessageBubble;
