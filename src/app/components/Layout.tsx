import { Outlet, useNavigate, useLocation } from "react-router";
import { useEffect, useRef, useState } from "react";
import {
  Map, BarChart3, Bell, User, Sparkles, Cloud, TrendingUp, Menu, X,
} from "lucide-react";
import { useColors, useAccessibility } from "./ThemeContext";

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
  const { textSize, font, colorFilter } = useAccessibility();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (drawerOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [drawerOpen]);

  const fontFamily = font === "opendyslexic" ? "OpenDyslexic, sans-serif" : "Inter, sans-serif";
  const filterVal  = colorFilter !== "none" ? `url(#a11y-${colorFilter})` : undefined;

  return (
    <div
      className="flex w-full min-h-screen"
      style={{ background: c.bg, fontFamily, zoom: textSize, filter: filterVal }}
    >
      {/* Hidden SVG: color vision correction filter definitions */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
        <defs>
          <filter id="a11y-protanopia">
            <feColorMatrix type="matrix" values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0" />
          </filter>
          <filter id="a11y-deuteranopia">
            <feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" />
          </filter>
          <filter id="a11y-tritanopia">
            <feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0" />
          </filter>
          <filter id="a11y-achromatopsia">
            <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" />
          </filter>
        </defs>
      </svg>
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
        <h1
          className="tracking-tight cursor-pointer"
          style={{ fontSize: 20, fontWeight: 700, color: c.text }}
          onClick={() => navigate("/app")}
        >
          Sky<span style={{ color: "#2D7EFF" }}>Spot</span>
        </h1>
        <button
          onClick={() => setDrawerOpen(true)}
          className="ml-auto flex items-center justify-center rounded-lg p-1.5"
          style={{ color: c.text }}
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile side drawer */}
      <dialog
        ref={dialogRef}
        onClose={() => setDrawerOpen(false)}
        onClick={(e) => { if (e.target === dialogRef.current) setDrawerOpen(false); }}
        className="lg:hidden fixed inset-0 m-0 p-0 w-full h-full max-w-full max-h-full bg-transparent z-[100000]"
        style={{ outline: "none" }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setDrawerOpen(false)}
        />
        {/* Panel */}
        <div
          className="absolute top-0 right-0 h-full overflow-y-auto shadow-2xl"
          style={{
            width: "min(80vw, 300px)",
            background: c.dark ? "rgba(18,18,22,0.98)" : "#fff",
            borderLeft: `1px solid ${c.cardBorder}`,
          }}
        >
          <div className="flex items-center justify-end px-4 py-3 border-b" style={{ borderColor: c.navBorder }}>
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-center rounded-lg p-1.5"
              style={{ color: c.text }}
              aria-label="Close navigation"
            >
              <X size={22} />
            </button>
          </div>
          <SidebarContent onNavigate={() => setDrawerOpen(false)} />
        </div>
      </dialog>

      <main
        className="flex-1 min-h-screen overflow-y-auto pt-[56px] lg:pt-0"
      >
        <div className="w-full max-w-[860px] mx-auto h-full min-h-[calc(100vh-56px)] lg:min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
