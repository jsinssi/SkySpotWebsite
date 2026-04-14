import { useState } from "react";
import { useColors } from "./ThemeContext";

const alertTypes = [
  { id: "space", emoji: "🅿️", title: "A space is now free", sub: "Real-time push when a bay opens up" },
  { id: "leave", emoji: "⏰", title: "Leave reminder", sub: "Set departure time, get parking arrival nudge" },
  { id: "weather", emoji: "☔", title: "Bad weather warning", sub: "Arrive early when rain is forecast" },
  { id: "event", emoji: "📅", title: "Exam/event day alert", sub: "Car park will be full — plan ahead" },
];

export default function Alerts() {
  const c = useColors();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ space: true, weather: true });
  const toggle = (id: string) => setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex flex-col px-4 lg:px-8 pt-4 lg:pt-8 pb-4">
      <h2 style={{ color: c.text, fontSize: 20, fontWeight: 700 }} className="mb-1">Smart Alerts</h2>
      <p style={{ color: c.textMuted }} className="text-[12px] mb-5">Choose which notifications to receive</p>

      <div className="space-y-3">
        {alertTypes.map((a) => (
          <div key={a.id} className="flex items-center gap-3 p-4 rounded-xl transition-colors"
            style={{ background: enabled[a.id] ? c.accentBg : c.card,
              border: `1px solid ${enabled[a.id] ? c.accentBorder : c.cardBorder}` }}>
            <span className="text-[22px]">{a.emoji}</span>
            <div className="flex-1">
              <div style={{ color: c.textSecondary, fontWeight: 500 }} className="text-[13px]">{a.title}</div>
              <div style={{ color: c.textFaint }} className="text-[11px]">{a.sub}</div>
            </div>
            <button onClick={() => toggle(a.id)}
              className="w-11 h-6 rounded-full relative transition-colors shrink-0"
              style={{ background: enabled[a.id] ? "#2D7EFF" : c.inputBorder }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ left: enabled[a.id] ? 22 : 2 }} />
            </button>
          </div>
        ))}
      </div>

      <h3 style={{ color: c.text, fontSize: 15, fontWeight: 600 }} className="mt-6 mb-3">Recent</h3>
      <div className="space-y-2 mb-6">
        {[{ t: "Space B12 is now free", time: "2 mins ago", dot: "#22C55E" },
          { t: "Rain expected — arrive early tomorrow", time: "1 hour ago", dot: "#F59E0B" },
          { t: "Exam day tomorrow — car park busy", time: "5 hours ago", dot: "#EF4444" }].map((n) => (
          <div key={n.t} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: c.card }}>
            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.dot }} />
            <div className="flex-1">
              <div style={{ color: c.textSecondary }} className="text-[12px]">{n.t}</div>
              <div style={{ color: c.textSubtle }} className="text-[10px]">{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}