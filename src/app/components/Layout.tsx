import { Outlet, useNavigate, useLocation } from "react-router";
import {
  Map, BarChart3, Bell, User, Sparkles, Cloud, TrendingUp,
} from "lucide-react";
import { useColors } from "./ThemeContext";

const navItems = [
  { path: "/app",           icon: Map,        label: "Map"      },
  { path: "/app/forecast",  icon: BarChart3,   label: "Forecast" },
  { path: "/app/weather",   icon: Cloud,       label: "Weather"  },
  { path: "/app/insights",  icon: TrendingUp,  label: "Insights" },
  { path: "/app/assistant", icon: Sparkles,    label: "Ask"      },
  { path: "/app/alerts",    icon: Bell,        label: "Alerts"   },
  { path: "/app/profile",   icon: User,        label: "Profile"  },
];

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

      <div className="pb-4 shrink-0" />
    </div>
  );
}

export default function Layout() {
  const c = useColors();
  const navigate = useNavigate();
  const location = useLocation();

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

      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-[99999] flex items-center px-4 py-3 border-b"
        style={{
          background: c.navBg,
          backdropFilter: "blur(20px)",
          borderColor: c.navBorder,
        }}
      >
        <h1 className="tracking-tight" style={{ fontSize: 20, fontWeight: 700, color: c.text }}>
          Sky<span style={{ color: "#2D7EFF" }}>Spot</span>
        </h1>
      </div>

      {/* Mobile bottom nav bar — sits below the map, no overlap possible */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[999] flex items-center justify-around border-t px-1"
        style={{
          background: c.navBg,
          borderColor: c.navBorder,
          backdropFilter: "blur(20px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          height: 60,
        }}
      >
        {navItems.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path !== "/app" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              style={{ color: active ? "#2D7EFF" : c.navInactive }}
            >
              <item.icon size={20} />
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <main
        className="flex-1 min-h-screen overflow-y-auto pt-[56px] pb-[60px] lg:pt-0 lg:pb-0"
      >
        <div className="w-full max-w-[860px] mx-auto h-full min-h-[calc(100vh-56px)] lg:min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
