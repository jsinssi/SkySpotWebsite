import { useState } from "react";
import { motion } from "motion/react";
import { useColors } from "./ThemeContext";

const timeSlots = Array.from({ length: 17 }, (_, i) => {
  const h = 6 + i;
  return `${h > 12 ? h - 12 : h}${h >= 12 ? "PM" : "AM"}`;
});

const thisWeekOccupancy = [15, 25, 45, 78, 92, 88, 75, 65, 50, 55, 70, 82, 90, 85, 60, 35, 20];
const typicalOccupancy = [20, 30, 50, 72, 85, 82, 70, 60, 48, 52, 65, 75, 82, 78, 55, 30, 18];

const peakTimes = [
  { emoji: "🔴", time: "9:00–9:30 AM", label: "Very Busy", note: "Lectures start" },
  { emoji: "🟢", time: "12:30–1:30 PM", label: "Quieter", note: "Lunch gap" },
  { emoji: "🔴", time: "2:00 PM", label: "High demand", note: "Afternoon lectures" },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const thisWeekHeatmap = [
  [30, 70, 95, 85, 60, 55, 50, 70, 85, 60, 30],
  [25, 65, 90, 80, 55, 50, 60, 75, 80, 55, 25],
  [35, 75, 92, 88, 65, 60, 55, 72, 88, 58, 28],
  [20, 60, 85, 78, 50, 45, 58, 68, 75, 50, 22],
  [15, 50, 75, 70, 45, 40, 35, 50, 60, 40, 15],
];
const typicalHeatmap = [
  [25, 60, 82, 78, 55, 50, 48, 65, 78, 55, 28],
  [22, 58, 80, 75, 50, 48, 55, 68, 75, 50, 22],
  [28, 65, 85, 80, 58, 55, 50, 68, 82, 52, 25],
  [18, 55, 78, 72, 48, 42, 52, 62, 70, 48, 20],
  [12, 45, 68, 65, 40, 38, 32, 48, 55, 38, 12],
];

function getHeatColor(v: number) {
  if (v < 40) return "#22C55E";
  if (v < 70) return "#F59E0B";
  return "#EF4444";
}

export default function Forecast() {
  const [scrubber, setScrubber] = useState(4);
  const [weekMode, setWeekMode] = useState<"this" | "typical">("this");
  const c = useColors();

  const occData = weekMode === "this" ? thisWeekOccupancy : typicalOccupancy;
  const heatData = weekMode === "this" ? thisWeekHeatmap : typicalHeatmap;
  const occ = occData[scrubber];

  const r = 60, stroke = 12;
  const circ = 2 * Math.PI * r;
  const offset = circ - (occ / 100) * circ;

  return (
    <div className="flex flex-col px-4 lg:px-8 pt-4 lg:pt-8 pb-4">
      <h2 style={{ color: c.text, fontSize: 20, fontWeight: 700 }} className="mb-1">
        {weekMode === "this" ? "Today's Parking Forecast" : "Typical Week Average"}
      </h2>
      <p style={{ color: c.textMuted }} className="text-[12px] mb-4">Drag the timeline to see predicted occupancy</p>

      <div className="flex justify-center mb-4">
        <div className="relative">
          <svg width={160} height={160}>
            <circle cx={80} cy={80} r={r} fill="none" stroke={c.cardBorder} strokeWidth={stroke} />
            <motion.circle cx={80} cy={80} r={r} fill="none" stroke={occ > 80 ? c.red : occ > 50 ? c.amber : c.green}
              strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
              transform="rotate(-90 80 80)" animate={{ strokeDashoffset: offset }} transition={{ duration: 0.4 }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span style={{ color: c.text, fontSize: 32, fontWeight: 700 }} key={`${weekMode}-${occ}`} initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              {occ}%
            </motion.span>
            <span style={{ color: c.textMuted }} className="text-[11px]">occupied</span>
          </div>
        </div>
      </div>

      <div className="text-center mb-2">
        <span className="px-3 py-1 rounded-full text-[12px]" style={{ background: c.accentBg, color: c.accent }}>{timeSlots[scrubber]}</span>
      </div>

      <div className="mb-5 px-1">
        <input type="range" min={0} max={16} value={scrubber} onChange={(e) => setScrubber(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, #2D7EFF ${(scrubber / 16) * 100}%, ${c.cardBorder} ${(scrubber / 16) * 100}%)`, accentColor: "#2D7EFF" }} />
        <div className="flex justify-between mt-1">
          <span style={{ color: c.textFaint }} className="text-[10px]">6AM</span>
          <span style={{ color: c.textFaint }} className="text-[10px]">10PM</span>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        {peakTimes.map((p) => (
          <div key={p.time} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
            <span className="text-[16px]">{p.emoji}</span>
            <div className="flex-1">
              <div style={{ color: c.textSecondary }} className="text-[13px]">{p.time} — {p.label}</div>
              <div style={{ color: c.textFaint }} className="text-[11px]">{p.note}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        {(["this", "typical"] as const).map((m) => (
          <button key={m} onClick={() => setWeekMode(m)}
            className="flex-1 py-2 rounded-xl text-[12px] transition-colors"
            style={{ background: weekMode === m ? c.accentBg : c.card, color: weekMode === m ? c.accent : c.textMuted,
              border: `1px solid ${weekMode === m ? c.accentBorder : c.cardBorder}` }}>
            {m === "this" ? "This Week" : "Typical Week"}
          </button>
        ))}
      </div>

      <div className="mb-6 p-3 rounded-xl" style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
        <div className="flex gap-0.5 mb-1 ml-8">
          {["7", "8", "9", "10", "11", "12", "1", "2", "3", "4", "5"].map((t) => (
            <div key={t} className="flex-1 text-center text-[8px]" style={{ color: c.textSubtle }}>{t}</div>
          ))}
        </div>
        {days.map((day, di) => (
          <div key={day} className="flex items-center gap-0.5 mb-0.5">
            <span className="w-8 text-[10px]" style={{ color: c.textFaint }}>{day}</span>
            {heatData[di].map((v, ti) => (
              <div key={ti} className="flex-1 h-5 rounded-sm" style={{ background: getHeatColor(v), opacity: 0.15 + (v / 100) * 0.7 }} />
            ))}
          </div>
        ))}
        {weekMode === "typical" && (
          <p style={{ color: c.textFaint }} className="text-[9px] text-center mt-2">Based on average data from the last 8 weeks</p>
        )}
      </div>
    </div>
  );
}