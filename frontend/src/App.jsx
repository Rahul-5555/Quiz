import React, { useEffect, useState } from "react";
import Home from "./pages/Home.jsx";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800); // ⏱️ 1.8 sec (perfect balance)

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4 animate-fade-in">

          {/* LOGO */}
          <div className="text-3xl font-extrabold tracking-wide">
            ♟ MatchMate
          </div>

          {/* SUBTEXT */}
          <div className="text-sm text-white/60">
            Connecting anonymously…
          </div>

          {/* LOADER */}
          <div className="mt-2 flex gap-1">
            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:-0.2s]" />
            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:-0.1s]" />
            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  return <Home />;
}

export default App;
