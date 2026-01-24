import React, { useEffect, useRef, useState } from "react";

const Matching = ({ socket, onMatched }) => {
  const hasRequestedMatch = useRef(false);
  const retryTimeoutRef = useRef(null);
  const [dots, setDots] = useState("");

  /* 🔁 UI animation */
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length === 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  /* 🔌 MATCHING LOGIC (STRICTMODE + SAFE) */
  useEffect(() => {
    if (!socket) return;

    // ✅ emit find_match ONLY ONCE
    if (!hasRequestedMatch.current) {
      hasRequestedMatch.current = true;
      socket.emit("find_match");
      console.log("📤 find_match emitted");
    }

    const handleMatchFound = ({ matchId, role }) => {
      if (!matchId || !role) {
        console.warn("⚠️ match_found invalid payload");
        return;
      }

      console.log("🎯 MATCH FOUND:", matchId, role);

      // stop any pending retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      onMatched({
        matchId,
        isCaller: role === "caller",
      });
    };

    const handleTimeout = () => {
      console.log("⏱️ match_timeout → retry in 1s");

      // allow retry but not immediately (avoid spam)
      retryTimeoutRef.current = setTimeout(() => {
        hasRequestedMatch.current = false;
        socket.emit("find_match");
      }, 1000);
    };

    socket.on("match_found", handleMatchFound);
    socket.on("match_timeout", handleTimeout);

    return () => {
      socket.off("match_found", handleMatchFound);
      socket.off("match_timeout", handleTimeout);

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      // ❌ DO NOT reset hasRequestedMatch here
    };
  }, [socket, onMatched]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1e293b 0%, #020617 65%)",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "32px 24px",
          borderRadius: "24px",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(16px)",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "600" }}>
          Finding opponent{dots}
        </h2>

        <p style={{ marginTop: "10px", fontSize: "14px", opacity: 0.7 }}>
          Looking for a random opponent
        </p>

        <div
          style={{
            marginTop: "28px",
            width: "100%",
            height: "6px",
            borderRadius: "6px",
            background: "rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "40%",
              height: "100%",
              background:
                "linear-gradient(90deg, #2563eb, #4f46e5)",
              animation: "loading 1.2s infinite ease-in-out",
            }}
          />
        </div>

        <p style={{ marginTop: "22px", fontSize: "12px", opacity: 0.4 }}>
          This usually takes a few seconds
        </p>
      </div>

      <style>
        {`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}
      </style>
    </div>
  );
};

export default Matching;
