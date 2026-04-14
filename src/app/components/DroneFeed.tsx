import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { useColors } from "./ThemeContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export default function DroneFeed() {
  const navigate = useNavigate();
  const c = useColors();
  const [showReport, setShowReport] = useState(false);

  return (
    <div className="flex flex-col min-h-full p-4 lg:p-8">
      <div className="relative rounded-2xl overflow-hidden">
        <ImageWithFallback src="https://images.unsplash.com/photo-1758936381586-199e2bc329d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXJpYWwlMjBkcm9uZSUyMGNhbXB1cyUyMHBhcmtpbmclMjBsb3R8ZW58MXx8fHwxNzczNzkxNzAyfDA&ixlib=rb-4.1.0&q=80&w=1080" alt="Drone aerial feed" className="w-full h-[420px] object-cover" />

        {/* Grid overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 49.5%, rgba(45,126,255,0.1) 49.5%, rgba(45,126,255,0.1) 50.5%, transparent 50.5%), linear-gradient(90deg, transparent 49.5%, rgba(45,126,255,0.1) 49.5%, rgba(45,126,255,0.1) 50.5%, transparent 50.5%)", backgroundSize: "80px 80px" }} />

        <button onClick={() => navigate("/app")}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)" }}>
          <ArrowLeft size={18} color="white" />
        </button>

        <div className="absolute top-4 left-16 px-3 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)" }}>
          <span className="text-[12px] text-white">🛸 Last flight: 9:30 AM</span>
        </div>

        {[{ x: 15, y: 60, col: "#EF4444" }, { x: 28, y: 55, col: "#22C55E" }, { x: 42, y: 58, col: "#EF4444" }, { x: 55, y: 52, col: "#EF4444" }, { x: 68, y: 56, col: "#EF4444" }, { x: 82, y: 60, col: "#22C55E" }, { x: 92, y: 55, col: "#EF4444" }].map((dot, i) => (
          <motion.div key={i} className="absolute w-3 h-3 rounded-full border-2 border-white/30"
            style={{ left: `${dot.x}%`, top: `${dot.y}%`, background: dot.col }}
            animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>

      {/* Bottom sheet */}
      <div className="flex-1 -mt-6 rounded-t-3xl p-5"
        style={{ background: c.bg, border: `1px solid ${c.cardBorder}`, borderBottom: "none" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: c.textFaint }} />

        <h3 style={{ color: c.text, fontSize: 16, fontWeight: 600 }} className="mb-3">Scan Summary</h3>

        <div className="flex gap-3 mb-4">
          {[{ n: 24, l: "Detected", col: c.accent }, { n: 8, l: "Free", col: c.green }, { n: 16, l: "Occupied", col: c.red }].map((s) => (
            <div key={s.l} className="flex-1 p-3 rounded-xl text-center" style={{ background: s.col + "10", border: `1px solid ${s.col}20` }}>
              <div style={{ color: s.col, fontSize: 22, fontWeight: 700 }}>{s.n}</div>
              <div style={{ color: c.textMuted }} className="text-[11px]">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl" style={{ background: c.card }}>
          <span style={{ color: c.textMuted }} className="text-[12px]">Detection accuracy</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: c.cardBorder }}>
            <div className="h-full rounded-full" style={{ width: "94%", background: c.green }} />
          </div>
          <span style={{ color: c.green }} className="text-[12px]">94%</span>
        </div>

        <button onClick={() => setShowReport(!showReport)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all active:scale-95"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <AlertTriangle size={16} color={c.red} />
          <span className="text-[13px]" style={{ color: c.red }}>Report an Error</span>
        </button>

        {showReport && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 p-3 rounded-xl" style={{ background: c.card }}>
            <p style={{ color: c.textMuted }} className="text-[12px] mb-2">Tap the bay that seems incorrect and we'll flag it for the next drone pass.</p>
            <button onClick={() => setShowReport(false)} className="w-full py-2 rounded-lg text-[12px]" style={{ color: c.textMuted, background: c.cardBorder }}>
              Submit Report
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}