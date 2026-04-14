import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Bell, RefreshCw, ChevronRight } from "lucide-react";
import { useColors } from "./ThemeContext";
import geoData from "../../imports/pasted_text/mtuh-geojson.json";

const TOTAL_SPACES = 24;

function generateSpaceStatuses() {
  return geoData.features.map((f: any) => ({
    id: f.properties.space_id,
    coords: f.geometry.coordinates[0],
    status: Math.random() > 0.55 ? "free" : "occupied",
  }));
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getUserFirstName() {
  try {
    const raw = localStorage.getItem("skyspot_user");
    if (raw) {
      const user = JSON.parse(raw);
      if (user.isGuest) return "";
      return user.firstName;
    }
  } catch {}
  return "there";
}

export default function LiveMap() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const c = useColors();
  const [spaces, setSpaces] = useState(generateSpaceStatuses);
  const [countdown, setCountdown] = useState(840);
  const [canvasSize, setCanvasSize] = useState({ w: 700, h: 400 });

  const free = spaces.filter((s) => s.status === "free").length;
  const occupied = TOTAL_SPACES - free;
  const pct = free / TOTAL_SPACES;
  const statusColor = pct > 0.2 ? c.green : pct > 0 ? c.amber : c.red;
  const statusLabel = pct > 0.2 ? "Available" : pct > 0 ? "Limited" : "Full";

  useEffect(() => {
    const t = setInterval(() => setCountdown((v) => (v <= 0 ? 840 : v - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // Responsive canvas sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ w: Math.floor(width), h: Math.floor(Math.max(height, width * 0.55)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    geoData.features.forEach((f: any) => {
      f.geometry.coordinates[0].forEach(([lng, lat]: number[]) => {
        minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
      });
    });
    const pad = 40;
    const toLng = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng)) * (W - pad * 2);
    const toLat = (lat: number) => H - pad - ((lat - minLat) / (maxLat - minLat)) * (H - pad * 2);

    ctx.strokeStyle = c.mapGrid;
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const y = (H / 10) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      const x = (W / 10) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    spaces.forEach((space) => {
      const color = space.status === "free" ? c.green : c.red;
      ctx.beginPath();
      space.coords.forEach(([lng, lat]: number[], i: number) => {
        const x = toLng(lng), y = toLat(lat);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = color + "33";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const cx = space.coords.reduce((s: number, co: number[]) => s + toLng(co[0]), 0) / space.coords.length;
      const cy = space.coords.reduce((s: number, co: number[]) => s + toLat(co[1]), 0) / space.coords.length;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }, [spaces, c, canvasSize]);

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <div className="flex flex-col h-full p-4 lg:p-8">
      {/* Greeting + top bar */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 style={{ color: c.text, fontSize: 24, fontWeight: 700 }}>{getGreeting()}{getUserFirstName() ? `, ${getUserFirstName()}` : ""} 👋</h1>
          <p style={{ color: c.textMuted }} className="text-[13px] mt-0.5">Barrier Car Park · MTU Bishopstown</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: c.accentBg }}>
            <div className="w-1.5 h-1.5 rounded-full bg-[#2D7EFF] animate-pulse" />
            <span className="text-[11px]" style={{ color: c.accent }}>Next scan {mins}:{secs.toString().padStart(2, "0")}</span>
          </div>
          <button className="relative p-2 rounded-lg" onClick={() => navigate("/app/alerts")}
            style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
            <Bell size={18} color={c.text} />
            <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EF4444]" />
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 flex-1 min-h-0">
        {/* Map - takes 2 cols on desktop */}
        <div className="lg:col-span-2 flex flex-col" ref={containerRef}>
          <div className="relative rounded-2xl overflow-hidden flex-1" style={{ background: c.mapBg, border: `1px solid ${c.accentBorder}` }}>
            <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h} className="w-full h-full" />

            <div className="absolute top-3 left-3 flex gap-2">
              {[{ col: c.green, l: "Free" }, { col: c.red, l: "Occupied" }].map((i) => (
                <div key={i.l} className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: c.pillBg }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: i.col }} />
                  <span className="text-[9px]" style={{ color: c.textSecondary }}>{i.l}</span>
                </div>
              ))}
            </div>

            <div className="absolute bottom-3 left-3 px-2 py-1 rounded-full" style={{ background: c.pillBg }}>
              <span className="text-[10px]" style={{ color: c.textMuted }}>Drone scan: 2 mins ago</span>
            </div>
          </div>
        </div>

        {/* Right sidebar on desktop */}
        <div className="flex flex-col gap-4">
          {/* Stats card */}
          <div className="p-5 rounded-2xl" style={{ background: c.card, border: `1px solid ${c.cardBorder}`, backdropFilter: "blur(20px)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor }} />
                <span style={{ color: c.textSecondary }} className="text-[14px]">{statusLabel}</span>
              </div>
              <span style={{ color: c.textFaint }} className="text-[11px]">Barrier Car Park</span>
            </div>
            <div className="flex justify-between">
              {[{ n: TOTAL_SPACES, l: "Total", col: c.text }, { n: free, l: "Free", col: c.green }, { n: occupied, l: "Occupied", col: c.red }].map((s) => (
                <div key={s.l} className="text-center flex-1">
                  <div style={{ color: s.col, fontSize: 32, fontWeight: 700 }}>{s.n}</div>
                  <div style={{ color: c.textMuted }} className="text-[12px]">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Refresh */}
          <button onClick={() => setSpaces(generateSpaceStatuses())}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all active:scale-95"
            style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
            <RefreshCw size={16} color={c.textMuted} />
            <span className="text-[13px]" style={{ color: c.textMuted }}>Refresh</span>
          </button>

          {/* Quick links */}
          <div className="space-y-2">
            {[{ label: "Weather Impact", path: "/app/weather", emoji: "☁️" },
              { label: "Insights & History", path: "/app/insights", emoji: "📊" }].map((link) => (
              <button key={link.path} onClick={() => navigate(link.path)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl transition-all active:scale-[0.98]"
                style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
                <div className="flex items-center gap-2">
                  <span>{link.emoji}</span>
                  <span style={{ color: c.textSecondary }} className="text-[13px]">{link.label}</span>
                </div>
                <ChevronRight size={16} color={c.textFaint} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}