import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, User, Lock, ArrowRight } from "lucide-react";
import { useColors } from "./ThemeContext";

export default function Auth() {
  const navigate = useNavigate();
  const c = useColors();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);

      if (mode === "login" && username.trim().toLowerCase() === "admin" && password === "admin123") {
        localStorage.setItem("skyspot_user", JSON.stringify({
          firstName: "Admin",
          lastName: "",
          initials: "A",
          course: "Administrator",
          vehicle: "car",
          arrivalTime: "8:30 AM",
          arrivalIdx: 6,
          photo: "",
          isAdmin: true,
        }));
        localStorage.setItem("skyspot_username", "admin");
        localStorage.setItem("skyspot_logged_in", "true");
        navigate("/app");
        return;
      }

      if (mode === "login") {
        const storedUsername = localStorage.getItem("skyspot_username");
        const existing = localStorage.getItem("skyspot_user");
        if (storedUsername === username.trim().toLowerCase() && existing) {
          localStorage.setItem("skyspot_logged_in", "true");
          navigate("/app");
        } else if (!storedUsername && existing) {
          localStorage.setItem("skyspot_logged_in", "true");
          navigate("/app");
        } else {
          setError("Invalid username or password.");
        }
      } else {
        localStorage.setItem("skyspot_username", username.trim().toLowerCase());
        navigate("/onboarding");
      }
    }, 800);
  };

  const inputStyle: React.CSSProperties = {
    background: c.inputBg,
    border: `1px solid ${c.inputBorder}`,
    color: c.text,
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 py-12" style={{ background: c.bgGrad, fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-md">
        {/* Top brand area */}
        <div className="flex flex-col items-center mb-8">
          <motion.div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "rgba(45,126,255,0.1)", border: "2px solid rgba(45,126,255,0.3)" }}
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="6" fill="#2D7EFF" />
              <line x1="32" y1="26" x2="32" y2="10" stroke="#2D7EFF" strokeWidth="2" />
              <line x1="32" y1="38" x2="32" y2="54" stroke="#2D7EFF" strokeWidth="2" />
              <line x1="26" y1="32" x2="10" y2="32" stroke="#2D7EFF" strokeWidth="2" />
              <line x1="38" y1="32" x2="54" y2="32" stroke="#2D7EFF" strokeWidth="2" />
            </svg>
          </motion.div>
          <motion.h1 style={{ fontSize: 36, fontWeight: 700, color: c.text }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            Sky<span style={{ color: "#2D7EFF" }}>Spot</span>
          </motion.h1>
          <motion.p style={{ color: c.textMuted, fontSize: 14 }} className="mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            Smart Parking · MTU Bishopstown
          </motion.p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 lg:p-8" style={{ background: c.card, border: `1px solid ${c.cardBorder}`, backdropFilter: "blur(20px)" }}>
          {/* Tab toggle */}
          <div className="mb-6">
            <div className="flex rounded-xl overflow-hidden" style={{ background: c.inputBg, border: `1px solid ${c.cardBorder}` }}>
              {(["login", "signup"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setError(""); }}
                  className="flex-1 py-3 text-[13px] transition-colors"
                  style={{
                    background: mode === m ? c.accentBg : "transparent",
                    color: mode === m ? c.accent : c.textMuted,
                    fontWeight: mode === m ? 600 : 400,
                    borderBottom: mode === m ? `2px solid ${c.accent}` : "2px solid transparent",
                  }}>
                  {m === "login" ? "Log In" : "Create Account"}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <motion.form onSubmit={handleSubmit} className="flex flex-col"
            key={mode} initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div key="error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="px-4 py-3 rounded-xl mb-4 text-[12px]"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Username */}
            <label className="text-[11px] mb-1.5 uppercase tracking-wider" style={{ color: c.textMuted }}>Username</label>
            <div className="relative mb-4">
              <User size={16} color={c.textFaint} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full py-3.5 pl-10 pr-4 rounded-xl text-[13px] outline-none transition-colors focus:ring-1 focus:ring-[#2D7EFF]"
                style={inputStyle} />
            </div>

            {/* Password */}
            <label className="text-[11px] mb-1.5 uppercase tracking-wider" style={{ color: c.textMuted }}>Password</label>
            <div className="relative mb-4">
              <Lock size={16} color={c.textFaint} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full py-3.5 pl-10 pr-12 rounded-xl text-[13px] outline-none transition-colors focus:ring-1 focus:ring-[#2D7EFF]"
                style={inputStyle} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {showPw ? <EyeOff size={16} color={c.textFaint} /> : <Eye size={16} color={c.textFaint} />}
              </button>
            </div>

            {/* Confirm password for signup */}
            {mode === "signup" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                <label className="text-[11px] mb-1.5 uppercase tracking-wider block" style={{ color: c.textMuted }}>Confirm Password</label>
                <div className="relative mb-4">
                  <Lock size={16} color={c.textFaint} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type={showPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-3.5 pl-10 pr-4 rounded-xl text-[13px] outline-none transition-colors focus:ring-1 focus:ring-[#2D7EFF]"
                    style={inputStyle} />
                </div>
              </motion.div>
            )}

            {mode === "login" && (
              <button type="button" className="self-end mb-6 text-[12px]" style={{ color: c.accent }}>
                Forgot password?
              </button>
            )}

            {/* Submit */}
            <motion.button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg, #2D7EFF, #1B5FCC)", fontSize: 15, fontWeight: 600, opacity: loading ? 0.7 : 1 }}
              whileTap={{ scale: 0.97 }}>
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Log In" : "Get Started"}
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: c.cardBorder }} />
              <span className="text-[11px]" style={{ color: c.textFaint }}>or</span>
              <div className="flex-1 h-px" style={{ background: c.cardBorder }} />
            </div>

            {/* Continue as Guest */}
            <motion.button type="button"
              onClick={() => {
                localStorage.setItem("skyspot_user", JSON.stringify({
                  firstName: "Guest",
                  lastName: "",
                  initials: "G",
                  course: "",
                  vehicle: "car",
                  arrivalTime: "8:30 AM",
                  arrivalIdx: 6,
                  photo: "",
                  isGuest: true,
                }));
                localStorage.setItem("skyspot_logged_in", "true");
                navigate("/app");
              }}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all text-[14px]"
              style={{ background: c.inputBg, border: `1px solid ${c.cardBorder}`, color: c.textSecondary, fontWeight: 500 }}
              whileTap={{ scale: 0.97 }}>
              Continue as Guest
            </motion.button>
          </motion.form>
        </div>
      </div>
    </div>
  );
}
