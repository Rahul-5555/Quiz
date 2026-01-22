import React, { useEffect, useState } from "react";

const StatBar = ({ socket }) => {
  const [online, setOnline] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const handleOnlineCount = (count) => setOnline(count);

    socket.on("online_count", handleOnlineCount);
    socket.emit("get_online_count");

    return () => socket.off("online_count", handleOnlineCount);
  }, [socket]);

  return (
    <div className="mt-7 mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 flex items-center justify-between shadow-lg">

      {/* 👥 ONLINE COUNT */}
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
        </span>
        <span>{online} Online</span>
      </div>

      {/* 🔴 MATCHING STATUS */}
      <div className="flex items-center gap-2 text-sm text-white/70">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 animate-pulse" />
        </span>
        Matching…
      </div>
    </div>
  );
};

export default StatBar;
