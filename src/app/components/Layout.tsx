import { Outlet, useNavigate, useLocation } from "react-router";
import { Map, BarChart3, Bell, User, Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";
import { useColors } from "./ThemeContext";

const navItems = [
  { path: "/app", icon: Map, label: "Map" },
  { path: "/app/forecast", icon: BarChart3, label: "Forecast" },
  { path: "/app/assistant", icon: Sparkles, label: "Ask" },
  { path: "/app/alerts", icon: Bell, label: "Alerts" },
  { path: "/app/profile", icon: User, label: "Profile" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const c = useColors();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 pt-6 pb-8">
        <h1 className="tracking-tight cursor-pointer" style={{ fontSize: 26, fontWeight: 700, color: c.text }}
          onClick={() => navigate("/app")}>
          Sky<span style={{ color: "#2D7EFF" }}>Spot</span>
        </h1>
        <p style={{ color: c.textFaint }} className="text-[11px] mt-1">MTU Cork · Bishopstown</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const active = location.pathname === item.path ||
            (item.path !== "/app" && location.pathname.startsWith(item.path));
          return (
            <button key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
              style={{
                background: active ? c.accentBg : "transparent",
                color: active ? "#2D7EFF" : c.textSecondary,
                fontWeight: active ? 600 : 400,
              }}>
              <item.icon size={20} />
              <span className="text-[14px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom branding */}
      <div className="px-6 py-4" />
    </div>
  );

  return (
    <div className="flex w-full min-h-screen" style={{ background: c.bg, fontFamily: "Inter, sans-serif" }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[240px] min-h-screen shrink-0 border-r sticky top-0 h-screen"
        style={{ background: c.dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)", borderColor: c.cardBorder }}>
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: c.navBg, backdropFilter: "blur(20px)", borderColor: c.navBorder }}>
        <h1 className="tracking-tight" style={{ fontSize: 20, fontWeight: 700, color: c.text }}>
          Sky<span style={{ color: "#2D7EFF" }}>Spot</span>
        </h1>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 rounded-lg" style={{ color: c.text }}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute top-[56px] left-0 bottom-0 w-[260px] border-r"
            style={{ background: c.bg, borderColor: c.cardBorder }}
            onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen overflow-y-auto pt-[56px] lg:pt-0">
        <div className="w-full max-w-[860px] mx-auto h-full min-h-[calc(100vh-56px)] lg:min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
}