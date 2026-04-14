import { ArrowLeft, Trophy, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useColors } from "./ThemeContext";

const chartData = [
  { time: "Mon", arrival: 8.5, occupancy: 65 },
  { time: "Tue", arrival: 8.3, occupancy: 72 },
  { time: "Wed", arrival: 8.7, occupancy: 58 },
  { time: "Thu", arrival: 8.2, occupancy: 78 },
  { time: "Fri", arrival: 9.0, occupancy: 45 },
];

export default function Insights() {
  const navigate = useNavigate();
  const c = useColors();

  return (
    <div className="flex flex-col px-4 lg:px-8 pt-4 lg:pt-8 pb-4">
      <button onClick={() => navigate("/app")} className="flex items-center gap-2 mb-4">
        <ArrowLeft size={18} color={c.text} />
        <span style={{ color: c.textMuted }} className="text-[13px]">Back to Map</span>
      </button>

      <h2 style={{ color: c.text, fontSize: 20, fontWeight: 700 }} className="mb-4">Insights & History</h2>

      <div className="p-5 rounded-2xl mb-4" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
        <div className="flex items-center gap-3 mb-2">
          <Clock size={18} color={c.green} />
          <span style={{ color: c.textMuted }} className="text-[12px]">Time saved this month</span>
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: c.green }}>42 mins</div>
        <div style={{ color: c.textFaint }} className="text-[11px]">Using SkySpot predictions</div>
      </div>

      <div className="p-4 rounded-xl mb-4 flex items-center gap-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
        <Trophy size={24} color={c.amber} />
        <div>
          <div style={{ color: c.textSecondary, fontWeight: 600 }} className="text-[14px]">7-day smart parker 🏆</div>
          <div style={{ color: c.textFaint }} className="text-[11px]">Arrived at optimal time every day this week</div>
        </div>
      </div>

      <h3 style={{ color: c.text, fontSize: 15, fontWeight: 600 }} className="mb-3">Arrival vs. Occupancy</h3>
      <div className="rounded-xl p-3 mb-4" style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="occ" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2D7EFF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2D7EFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fill: c.textFaint, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: c.bg, border: `1px solid ${c.cardBorder}`, borderRadius: 8, fontSize: 11, color: c.text }} />
            <Area type="monotone" dataKey="occupancy" stroke="#2D7EFF" fill="url(#occ)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <h3 style={{ color: c.text, fontSize: 15, fontWeight: 600 }} className="mb-3">Campus Stats</h3>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[{ label: "Busiest Day", value: "Wednesday", icon: TrendingUp, color: c.red },
          { label: "Avg Occupancy", value: "68%", icon: TrendingUp, color: c.amber },
          { label: "Peak Hour", value: "9:15 AM", icon: Clock, color: c.accent },
          { label: "Quietest", value: "Friday 4PM", icon: Clock, color: c.green }].map((s) => (
          <div key={s.label} className="p-3 rounded-xl" style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
            <s.icon size={14} color={s.color} />
            <div style={{ color: c.text, fontSize: 16, fontWeight: 600 }} className="mt-2">{s.value}</div>
            <div style={{ color: c.textFaint }} className="text-[10px]">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}