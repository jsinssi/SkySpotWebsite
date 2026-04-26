import { Outlet, useNavigate, useLocation } from "react-router";
import {
  Map, BarChart3, Bell, User, Sparkles, Menu, X,
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning,
  Wind, Droplets, Trophy,
} from "lucide-react";
import { useState, useEffect, createContext } from "react";
import { createPortal } from "react-dom";

export const MobileDrawerContext = createContext(false);
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useColors } from "./ThemeContext";

const navItems = [
  { path: "/app", icon: Map, label: "Map" },
  { path: "/app/forecast", icon: BarChart3, label: "Forecast" },
  { path: "/app/assistant", icon: Sparkles, label: "Ask" },
  { path: "/app/alerts", icon: Bell, label: "Alerts" },
  { path: "/app/profile", icon: User, label: "Profile" },
];

const chartData = [
  { time: "Mon", occupancy: 65 },
  { time: "Tue", occupancy: 72 },
  { time: "Wed", occupancy: 58 },
  { time: "Thu", occupancy: 78 },
  { time: "Fri", occupancy: 45 },
];

const campusStats = [
  { label: "Busiest Day", value: "Wednesday", color: "#ef4444" },
  { label: "Peak Hour", value: "9:15 AM", color: "#2D7EFF" },
  { label: "Avg Occupancy", value: "68%", color: "#f59e0b" },
  { label: "Quietest", value: "Fri 4 PM", color: "#22c55e" },
];

function getWeatherIcon(code: number) {
  if (code === 0 || code === 1) return Sun;
  if (code <= 3) return Cloud;
  if (code >= 95) return CloudLightning;
  if (code >= 71) return CloudSnow;
  if (code >= 51) return CloudRain;
  return Cloud;
}

function getWeatherDesc(code: number) {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showers";
  return "Stormy";
}

interface WeatherData {
  temp: number;
  windSpeed: number;
  humidity: number;
  code: number;
}

function SidebarWeatherWidget({ c }: { c: ReturnType<typeof useColors> }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=51.8969&longitude=-8.4863" +
      "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m" +
      "&timezone=Europe%2FDublin";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const cur = data.current;
        setWeather({
          temp: Math.round(cur.temperature_2m),
          windSpeed: Math.round(cur.wind_speed_10m),
          humidity: cur.relative_humidity_2m,
          code: cur.weather_code,
        });
      })
      .catch(() => {});
  }, []);

  const WeatherIcon = weather ? getWeatherIcon(weather.code) : Cloud;

  return (
    <div
      className="mx-3 mb-3 p-3 rounded-xl"
      style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ color: c.textFaint, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>
          ☁️ WEATHER · MTU CORK
        </span>
      </div>

      {weather ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <WeatherIcon size={22} color="#2D7EFF" strokeWidth={1.8} />
            <span style={{ color: c.text, fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
              {weather.temp}°C
            </span>
            <span style={{ color: c.textMuted, fontSize: 11 }} className="ml-1">
              {getWeatherDesc(weather.code)}
            </span>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <Wind size={10} color={c.textFaint} />
              <span style={{ color: c.textFaint, fontSize: 10 }}>{weather.windSpeed} km/h</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplets size={10} color={c.textFaint} />
              <span style={{ color: c.textFaint, fontSize: 10 }}>{weather.humidity}%</span>
            </div>
          </div>
          <div
            className="mt-2 px-2 py-1.5 rounded-lg"
            style={{
              background: weather.code >= 51 ? "rgba(45,126,255,0.08)" : "rgba(34,197,94,0.07)",
            }}
          >
            <span style={{ color: weather.code >= 51 ? "#2D7EFF" : "#22c55e", fontSize: 10 }}>
              {weather.code >= 51
                ? "🌧 Rain expected — car park likely 25% busier"
                : "☀️ Dry conditions — normal parking demand"}
            </span>
          </div>
        </>
      ) : (
        <div style={{ color: c.textFaint, fontSize: 11 }} className="py-2 text-center">
          Loading…
        </div>
      )}
    </div>
  );
}

function SidebarInsightsWidget({ c }: { c: ReturnType<typeof useColors> }) {
  return (
    <div
      className="mx-3 mb-3 p-3 rounded-xl"
      style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
    >
      <span style={{ color: c.textFaint, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>
        📊 INSIGHTS & HISTORY
      </span>

      <div className="mt-2 mb-1" style={{ height: 52 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="sidebarOcc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2D7EFF" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#2D7EFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fill: c.textFaint, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: c.bg,
                border: `1px solid ${c.cardBorder}`,
                borderRadius: 6,
                fontSize: 10,
                color: c.text,
              }}
              formatter={(v: number) => [`${v}%`, "Occupancy"]}
            />
            <Area
              type="monotone"
              dataKey="occupancy"
              stroke="#2D7EFF"
              fill="url(#sidebarOcc)"
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mt-2">
        {campusStats.map((s) => (
          <div
            key={s.label}
            className="px-2 py-1.5 rounded-lg"
            style={{ background: c.dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}
          >
            <div style={{ color: s.color, fontSize: 12, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: c.textFaint, fontSize: 9 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div
        className="mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
        style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)" }}
      >
        <Trophy size={11} color="#f59e0b" />
        <span style={{ color: "#f59e0b", fontSize: 10 }}>7-day smart parker streak 🏆</span>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const c = useColors();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 pt-6 pb-6 shrink-0">
        <h1
          className="tracking-tight cursor-pointer"
          style={{ fontSize: 26, fontWeight: 700, color: c.text }}
          onClick={() => { navigate("/app"); onNavigate(); }}
        >
          Sky<span style={{ color: "#2D7EFF" }}>Spot</span>
        </h1>
        <p style={{ color: c.textFaint }} className="text-[11px] mt-1">
          MTU Cork · Bishopstown
        </p>
      </div>

      <nav className="flex flex-col gap-1 px-3 shrink-0">
        {navItems.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path !== "/app" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); onNavigate(); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
              style={{
                background: active ? c.accentBg : "transparent",
                color: active ? "#2D7EFF" : c.textSecondary,
                fontWeight: active ? 600 : 400,
              }}
            >
              <item.icon size={20} />
              <span className="text-[14px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mx-4 my-4 shrink-0" style={{ height: 1, background: c.cardBorder }} />

      <SidebarWeatherWidget c={c} />
      <SidebarInsightsWidget c={c} />

      <div className="pb-4 shrink-0" />
    </div>
  );
}

export default function Layout() {
  const c = useColors();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add("drawer-open");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("drawer-open");
      document.body.style.overflow = "";
    }
    return () => {
      document.body.classList.remove("drawer-open");
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div
      className="flex w-full min-h-screen"
      style={{ background: c.bg, fontFamily: "Inter, sans-serif" }}
    >
      {/* Desktop sidebar — only visible lg+ */}
      <aside
        className="hidden lg:flex flex-col w-[240px] min-h-screen shrink-0 border-r sticky top-0 h-screen overflow-hidden"
        style={{
          background: c.dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
          borderColor: c.cardBorder,
        }}
      >
        <SidebarContent onNavigate={() => {}} />
      </aside>

      {/* Mobile top bar — z-[99999] ensures it's always on top */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-[99999] flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: c.navBg,
          backdropFilter: "blur(20px)",
          borderColor: c.navBorder,
        }}
      >
        <h1 className="tracking-tight" style={{ fontSize: 20, fontWeight: 700, color: c.text }}>
          Sky<span style={{ color: "#2D7EFF" }}>Spot</span>
        </h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg"
          style={{ color: c.text }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer — rendered as a portal into document.body so it sits
          above Leaflet's GPU-composited canvas layer regardless of z-index */}
      {mobileOpen && createPortal(
        <>
          {/* Full-screen backdrop */}
          <div
            className="fixed inset-0 bg-black/60"
            style={{ zIndex: 99997 }}
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel — transform:translateZ(0) forces a GPU layer above canvas */}
          <div
            className="fixed top-[56px] left-0 bottom-0 w-[260px] border-r overflow-y-auto"
            style={{
              zIndex: 99998,
              background: c.bg,
              borderColor: c.cardBorder,
              transform: "translateZ(0)",
            }}
          >
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </>,
        document.body
      )}

      <main
        className="flex-1 min-h-screen overflow-y-auto pt-[56px] lg:pt-0"
        style={{ pointerEvents: mobileOpen ? "none" : "auto" }}
      >
        <div className="w-full max-w-[860px] mx-auto h-full min-h-[calc(100vh-56px)] lg:min-h-screen">
          <MobileDrawerContext.Provider value={mobileOpen}>
            <Outlet />
          </MobileDrawerContext.Provider>
        </div>
      </main>
    </div>
  );
}
