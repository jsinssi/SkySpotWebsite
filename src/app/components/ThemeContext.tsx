import { useState, useEffect } from "react";

export type FontChoice  = "inter" | "opendyslexic";
export type ColorFilter = "none" | "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";

interface A11ySettings { textSize: number; font: FontChoice; colorFilter: ColorFilter; }
const DEFAULT_A11Y: A11ySettings = { textSize: 1, font: "inter", colorFilter: "none" };

function loadA11y(): A11ySettings {
  try { const r = localStorage.getItem("skyspot_a11y"); if (r) return { ...DEFAULT_A11Y, ...JSON.parse(r) }; } catch {}
  return DEFAULT_A11Y;
}

let currentA11y = loadA11y();
const a11yListeners = new Set<(s: A11ySettings) => void>();

function setGlobalA11y(s: A11ySettings) {
  currentA11y = s;
  localStorage.setItem("skyspot_a11y", JSON.stringify(s));
  a11yListeners.forEach(fn => fn(s));
}

export function useAccessibility() {
  const [a11y, setA11y] = useState<A11ySettings>(currentA11y);
  useEffect(() => {
    const h = (s: A11ySettings) => setA11y(s);
    a11yListeners.add(h);
    return () => { a11yListeners.delete(h); };
  }, []);
  return {
    ...a11y,
    setTextSize:    (v: number)      => setGlobalA11y({ ...currentA11y, textSize: v }),
    setFont:        (v: FontChoice)  => setGlobalA11y({ ...currentA11y, font: v }),
    setColorFilter: (v: ColorFilter) => setGlobalA11y({ ...currentA11y, colorFilter: v }),
  };
}

type Theme = "default" | "light" | "amoled";

let currentTheme: Theme = "default";
const listeners = new Set<(t: Theme) => void>();

function setGlobalTheme(t: Theme) {
  currentTheme = t;
  listeners.forEach((fn) => fn(t));
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    const handler = (t: Theme) => setTheme(t);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const setMode = (t: Theme) => setGlobalTheme(t);
  return { theme, setMode };
}

export function useColors() {
  const { theme } = useTheme();
  const dark = theme === "default" || theme === "amoled";
  const amoled = theme === "amoled";
  const base = amoled ? "#000000" : "#0A0E1A";
  const baseCard = amoled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.04)";
  const baseBorder = amoled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)";

  return {
    bg: dark ? base : "#F2F4F8",
    bgGrad: dark
      ? `linear-gradient(180deg, ${base} 0%, ${amoled ? "#050510" : "#0F1B3D"} 50%, ${base} 100%)`
      : "linear-gradient(180deg, #F2F4F8 0%, #E0E7F1 50%, #F2F4F8 100%)",
    card: dark ? baseCard : "rgba(0,0,0,0.03)",
    cardBorder: dark ? baseBorder : "rgba(0,0,0,0.08)",
    text: dark ? "#FFFFFF" : "#0A0E1A",
    textSecondary: dark ? "rgba(255,255,255,0.7)" : "rgba(10,14,26,0.7)",
    textMuted: dark ? "rgba(255,255,255,0.4)" : "rgba(10,14,26,0.45)",
    textFaint: dark ? "rgba(255,255,255,0.3)" : "rgba(10,14,26,0.3)",
    textSubtle: dark ? "rgba(255,255,255,0.25)" : "rgba(10,14,26,0.2)",
    navBg: dark ? (amoled ? "rgba(0,0,0,0.98)" : "rgba(10,14,26,0.95)") : "rgba(242,244,248,0.95)",
    navBorder: dark ? (amoled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)") : "rgba(0,0,0,0.08)",
    navInactive: dark ? "rgba(255,255,255,0.4)" : "rgba(10,14,26,0.35)",
    accent: "#2D7EFF",
    accentBg: dark ? "rgba(45,126,255,0.12)" : "rgba(45,126,255,0.08)",
    accentBorder: dark ? "rgba(45,126,255,0.2)" : "rgba(45,126,255,0.15)",
    inputBg: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
    inputBorder: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
    mapBg: dark ? (amoled ? "rgba(0,0,0,0.9)" : "rgba(15,20,40,0.8)") : "rgba(225,232,242,0.9)",
    mapGrid: dark ? "rgba(45,126,255,0.08)" : "rgba(45,126,255,0.06)",
    pillBg: dark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)",
    green: "#22C55E",
    amber: "#F59E0B",
    red: "#EF4444",
    dark,
    amoled,
    outerBg: dark ? (amoled ? "#000000" : "black") : "#E8ECF2",
  };
}
