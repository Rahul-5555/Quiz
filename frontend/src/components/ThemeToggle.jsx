import { useEffect, useState } from "react";

const ThemeToggle = () => {
  const [theme, setTheme] = useState("dark");

  // 🔄 Load saved theme
  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);

  // 🔁 Toggle theme
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);

    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };


  return (
    <button
      onClick={toggleTheme}
      className="
        flex items-center gap-2
        px-3 py-1.5 rounded-lg
        text-xs font-medium
        border border-black/10 dark:border-white/10
        bg-white/70 dark:bg-white/5
        backdrop-blur
        text-slate-800 dark:text-white
        hover:bg-white dark:hover:bg-white/10
        transition
      "
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
};

export default ThemeToggle;
