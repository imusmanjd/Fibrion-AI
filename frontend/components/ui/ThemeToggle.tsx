"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fibrion:theme";

function SunMoonIcon({ light }: { light: boolean }) {
  return light ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1z" />
    </svg>
  );
}

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const isLight = stored === "light";

    setLight(isLight);
    document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.setAttribute("data-theme", next ? "light" : "dark");
    window.localStorage.setItem(STORAGE_KEY, next ? "light" : "dark");
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
    >
      <SunMoonIcon light={light} />
    </button>
  );
}