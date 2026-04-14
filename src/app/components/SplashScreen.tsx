import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { useColors } from "./ThemeContext";

export default function SplashScreen() {
  const navigate = useNavigate();
  const c = useColors();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const loggedIn = localStorage.getItem("skyspot_logged_in");
    const userData = localStorage.getItem("skyspot_user");
    if (loggedIn && userData) {
      const timer = setTimeout(() => navigate("/app"), 1200);
      return () => clearTimeout(timer);
    }
    setChecking(false);
  }, [navigate]);

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-6" style={{ background: c.bgGrad, fontFamily: "Inter, sans-serif" }}>
      <div className="flex flex-col items-center max-w-lg w-full">

        {/* Pulse rings */}
        <div className="relative mb-10">
          {[0, 1, 2].map((i) => (
            <motion.div key={i}
              className="absolute inset-0 rounded-full border"
              style={{ borderColor: "rgba(45,126,255,0.3)", width: 160 + i * 40, height: 160 + i * 40, top: -(i * 20), left: -(i * 20) }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }} />
          ))}
          <div className="w-40 h-40 rounded-full flex items-center justify-center"
            style={{ background: "rgba(45,126,255,0.1)", border: "2px solid rgba(45,126,255,0.4)" }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="6" fill="#2D7EFF" />
              <line x1="32" y1="26" x2="32" y2="10" stroke="#2D7EFF" strokeWidth="2" />
              <line x1="32" y1="38" x2="32" y2="54" stroke="#2D7EFF" strokeWidth="2" />
              <line x1="26" y1="32" x2="10" y2="32" stroke="#2D7EFF" strokeWidth="2" />
              <line x1="38" y1="32" x2="54" y2="32" stroke="#2D7EFF" strokeWidth="2" />
              <circle cx="10" cy="32" r="5" stroke="#2D7EFF" strokeWidth="1.5" fill="none" />
              <circle cx="54" cy="32" r="5" stroke="#2D7EFF" strokeWidth="1.5" fill="none" />
              <circle cx="32" cy="10" r="5" stroke="#2D7EFF" strokeWidth="1.5" fill="none" />
              <circle cx="32" cy="54" r="5" stroke="#2D7EFF" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>

        {/* MTU Logo area */}
        <div className="mb-4 px-4 py-2 rounded-lg" style={{ background: c.dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${c.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}` }}>
          <span style={{ color: c.textMuted }} className="text-[11px] tracking-widest uppercase">MTU Cork · Bishopstown Campus</span>
        </div>

        {/* Wordmark */}
        <motion.h1 className="mb-2 tracking-tight" style={{ fontSize: 48, fontWeight: 700, color: c.text }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          Sky<span style={{ color: "#2D7EFF" }}>Spot</span>
        </motion.h1>

        <motion.p className="mb-12 text-center" style={{ fontSize: 15, color: c.textMuted }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          Smart Parking. Powered by Air.
        </motion.p>

        {checking ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-[#2D7EFF]/30 border-t-[#2D7EFF] rounded-full animate-spin" />
            <span style={{ color: c.textMuted }} className="text-[13px]">Signing you in...</span>
          </motion.div>
        ) : (
          <motion.button onClick={() => navigate("/auth")}
            className="w-full max-w-xs py-4 rounded-2xl text-white transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #2D7EFF, #1B5FCC)", fontSize: 16, fontWeight: 600 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
            whileTap={{ scale: 0.96 }}>
            Find My Space
          </motion.button>
        )}
      </div>
    </div>
  );
}
