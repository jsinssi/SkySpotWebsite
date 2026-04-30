import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useColors } from "./ThemeContext";

const FORECAST_HOURS = Array.from({ length: 17 }, (_, i) => 6 + i);
const timeSlots = FORECAST_HOURS.map((h) => {
  if (h === 12) return "12PM";
  return h < 12 ? `${h}AM` : `${h - 12}PM`;
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HEATMAP_LABELS = ["7", "8", "9", "10", "11", "12", "1", "2", "3", "4", "5"];

// Fallback data shown while loading or on error
const FALLBACK_HOURLY = [15, 25, 45, 78, 92, 88, 75, 65, 50, 55, 70, 82, 90, 85, 60, 35, 20];
const FALLBACK_TYPICAL = [20, 30, 50, 72, 85, 82, 70, 60, 48, 52, 65, 75, 82, 78, 55, 30, 18];
const FALLBACK_HEATMAP: Record<string, number[]> = {
  Mon: [30, 70, 95, 85, 60, 55, 50, 70, 85, 60, 30],
  Tue: [25, 65, 90, 80, 55, 50, 60, 75, 80, 55, 25],
  Wed: [35, 75, 92, 88, 65, 60, 55, 72, 88, 58, 28],
  Thu: [20, 60, 85, 78, 50, 45, 58, 68, 75, 50, 22],
  Fri: [15, 50, 75, 70, 45, 40, 35, 50, 60, 40, 15],
};
const FALLBACK_PEAKS = [
  { emoji: "🔴", time: "9:00–9:30 AM", label: "Very Busy", note: "Lectures start" },
  { emoji: "🟢", time: "12:30–1:30 PM", label: "Quieter", note: "Lunch gap" },
  { emoji: "🔴", time: "2:00 PM", label: "High demand", note: "Afternoon lectures" },
];

interface HourlySlot { hour: number; label: string; occupancy: number }
interface PeakTime { time: string; label: string; occupancy: number; level: string }
interface ForecastData {
  today_hourly: HourlySlot[];
  weekly_heatmap: Record<string, number[]>;
  typical_hourly: number[];
  peak_times: PeakTime[];
  generated_at: string;
  data_source: string;
}

function getHeatColor(v: number) {
  if (v < 40) return "#22C55E";
  if (v < 70) return "#F59E0B";
  return "#EF4444";
}

function timeAgo(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
  if (diff < 2) return "just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

export default function Forecast() {
  const [scrubber, setScrubber] = useState(4);
  const [weekMode, setWeekMode] = useState<"this" | "typical">("this");
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const c = useColors();

  useEffect(() => {
    fetch("/api/forecast/occupancy")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: ForecastData) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  // Resolve display arrays — fall back gracefully
  const todayOccupancy: number[] = data
    ? data.today_hourly.map((s) => s.occupancy)
    : FALLBACK_HOURLY;
  const typicalOccupancy: number[] = data ? data.typical_hourly : FALLBACK_TYPICAL;
  const heatmap: Record<string, number[]> = data ? data.weekly_heatmap : FALLBACK_HEATMAP;

  const occData = weekMode === "this" ? todayOccupancy : typicalOccupancy;
  const occ = occData[scrubber] ?? 0;

  const peakTimes = data?.peak_times?.length
    ? data.peak_times.map((p) => ({
        emoji: p.level === "high" ? "🔴" : "🟢",
        time: p.time,
        label: p.label,
        note: p.level === "high"
          ? (p.occupancy >= 90 ? "Lectures start" : "Busy period")
          : "Lower demand",
      }))
    : FALLBACK_PEAKS;

  const r = 60, stroke = 12;
  const circ = 2 * Math.PI * r;
  const offset = circ - (occ / 100) * circ;

  return (
    <div className="flex flex-col px-4 lg:px-8 pt-4 lg:pt-8 pb-4">
      <h2 style={{ color: c.text, fontSize: 20, fontWeight: 700 }} className="mb-0.5">
        {weekMode === "this" ? "Today's Parking Forecast" : "Typical Week Average"}
      </h2>
      <div className="flex items-center gap-2 mb-4">
        <p style={{ color: c.textMuted }} className="text-[12px]">
          Drag the timeline to see predicted occupancy
        </p>
        {data && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: c.accentBg, color: c.accent }}
          >
            ML · {timeAgo(data.generated_at)}
          </span>
        )}
        {loading && (
          <span className="text-[10px]" style={{ color: c.textFaint }}>Loading…</span>
        )}
      </div>

      {/* Circular gauge */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          {loading ? (
            <div
              className="w-[160px] h-[160px] rounded-full animate-pulse"
              style={{ background: c.card }}
            />
          ) : (
            <svg width={160} height={160}>
              <circle cx={80} cy={80} r={r} fill="none" stroke={c.cardBorder} strokeWidth={stroke} />
              <motion.circle
                cx={80} cy={80} r={r} fill="none"
                stroke={occ > 80 ? c.red : occ > 50 ? c.amber : c.green}
                strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={offset}
                transform="rotate(-90 80 80)"
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.4 }}
              />
            </svg>
          )}
          {!loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                style={{ color: c.text, fontSize: 32, fontWeight: 700 }}
                key={`${weekMode}-${occ}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                {Math.round(occ)}%
              </motion.span>
              <span style={{ color: c.textMuted }} className="text-[11px]">occupied</span>
            </div>
          )}
        </div>
      </div>

      {/* Time label */}
      <div className="text-center mb-2">
        <span
          className="px-3 py-1 rounded-full text-[12px]"
          style={{ background: c.accentBg, color: c.accent }}
        >
          {timeSlots[scrubber]}
        </span>
      </div>

      {/* Scrubber */}
      <div className="mb-5 px-1">
        <input
          type="range" min={0} max={16} value={scrubber}
          onChange={(e) => setScrubber(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #2D7EFF ${(scrubber / 16) * 100}%, ${c.cardBorder} ${(scrubber / 16) * 100}%)`,
            accentColor: "#2D7EFF",
          }}
        />
        <div className="flex justify-between mt-1">
          <span style={{ color: c.textFaint }} className="text-[10px]">6AM</span>
          <span style={{ color: c.textFaint }} className="text-[10px]">10PM</span>
        </div>
      </div>

      {/* Peak times */}
      <div className="space-y-2 mb-5">
        {peakTimes.map((p) => (
          <div
            key={p.time}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
          >
            <span className="text-[16px]">{p.emoji}</span>
            <div className="flex-1">
              <div style={{ color: c.textSecondary }} className="text-[13px]">
                {p.time} — {p.label}
              </div>
              <div style={{ color: c.textFaint }} className="text-[11px]">{p.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Week toggle */}
      <div className="flex gap-2 mb-3">
        {(["this", "typical"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setWeekMode(m)}
            className="flex-1 py-2 rounded-xl text-[12px] transition-colors"
            style={{
              background: weekMode === m ? c.accentBg : c.card,
              color: weekMode === m ? c.accent : c.textMuted,
              border: `1px solid ${weekMode === m ? c.accentBorder : c.cardBorder}`,
            }}
          >
            {m === "this" ? "This Week" : "Typical Week"}
          </button>
        ))}
      </div>

      {/* Heat map */}
      <div
        className="mb-6 p-3 rounded-xl"
        style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
      >
        <div className="flex gap-0.5 mb-1 ml-8">
          {HEATMAP_LABELS.map((t) => (
            <div key={t} className="flex-1 text-center text-[8px]" style={{ color: c.textSubtle }}>
              {t}
            </div>
          ))}
        </div>
        {loading
          ? DAYS.map((day) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <span className="w-8 text-[10px]" style={{ color: c.textFaint }}>{day}</span>
                {Array.from({ length: 11 }).map((_, ti) => (
                  <div
                    key={ti}
                    className="flex-1 h-5 rounded-sm animate-pulse"
                    style={{ background: c.cardBorder }}
                  />
                ))}
              </div>
            ))
          : DAYS.map((day) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <span className="w-8 text-[10px]" style={{ color: c.textFaint }}>{day}</span>
                {(heatmap[day] ?? Array(11).fill(0)).map((v, ti) => (
                  <div
                    key={ti}
                    className="flex-1 h-5 rounded-sm"
                    style={{ background: getHeatColor(v), opacity: 0.15 + (v / 100) * 0.7 }}
                  />
                ))}
              </div>
            ))}
        {weekMode === "typical" && !loading && (
          <p style={{ color: c.textFaint }} className="text-[9px] text-center mt-2">
            Based on ML model average across Mon–Fri
          </p>
        )}
        {data?.data_source === "ml_model" && (
          <p style={{ color: c.textFaint }} className="text-[9px] text-center mt-1">
            Powered by SkySpot AutoML · MTU Cork
          </p>
        )}
      </div>
    </div>
  );
}
