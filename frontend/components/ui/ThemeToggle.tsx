"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="theme-toggle"
        aria-label="Toggle theme"
        disabled
      >
        <Monitor size={16} />
      </button>
    );
  }

  const themes = [
    { value: "light", label: "Light", icon: <Sun size={16} /> },
    { value: "dark", label: "Dark", icon: <Moon size={16} /> },
    { value: "system", label: "System", icon: <Monitor size={16} /> },
  ] as const;

  return (
    <div className="theme-toggle-wrapper">
      <button
        type="button"
        className="theme-toggle"
        aria-label="Toggle theme"
        onClick={() => {
          const currentIndex = themes.findIndex((t) => t.value === theme);
          const nextIndex = (currentIndex + 1) % themes.length;
          setTheme(themes[nextIndex].value);
        }}
      >
        {themes.find((t) => t.value === resolvedTheme)?.icon || <Monitor size={16} />}
      </button>
    </div>
  );
}