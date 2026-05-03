import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Moon, Sun, Bell, Car, Bike, Truck, Zap, LogOut, LogIn, Pencil } from "lucide-react";
import { useColors, useTheme, useAccessibility } from "./ThemeContext";
import type { FontChoice, ColorFilter } from "./ThemeContext";

const colorFilterOptions: { id: ColorFilter; label: string; sub: string }[] = [
  { id: "none",          label: "None",          sub: "No filter" },
  { id: "protanopia",    label: "Protanopia",    sub: "Red-Blind" },
  { id: "deuteranopia",  label: "Deuteranopia",  sub: "Green-Blind" },
  { id: "tritanopia",    label: "Tritanopia",    sub: "Blue-Blind" },
  { id: "achromatopsia", label: "Achromatopsia", sub: "Complete Color Blindness" },
];

const vehicles = [
  { id: "car", icon: Car, label: "Car" },
  { id: "motorbike", icon: Bike, label: "Motorbike" },
  { id: "van", icon: Truck, label: "Van" },
];

const timeOptions = [
  "7:00 AM", "7:15 AM", "7:30 AM", "7:45 AM",
  "8:00 AM", "8:15 AM", "8:30 AM", "8:45 AM",
  "9:00 AM", "9:15 AM", "9:30 AM", "9:45 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM",
];

interface UserData {
  firstName: string;
  lastName: string;
  initials: string;
  course: string;
  vehicle: string;
  arrivalTime: string;
  arrivalIdx: number;
  photo: string;
  isGuest?: boolean;
}

function getUser(): UserData {
  try {
    const raw = localStorage.getItem("skyspot_user");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { firstName: "User", lastName: "", initials: "U", course: "", vehicle: "car", arrivalTime: "8:30 AM", arrivalIdx: 6, photo: "" };
}

export default function Profile() {
  const navigate = useNavigate();
  const c = useColors();
  const { theme, setMode } = useTheme();
  const { textSize, font, colorFilter, setTextSize, setFont, setColorFilter } = useAccessibility();
  const [user] = useState<UserData>(getUser);
  const isGuest = !!(user as any).isGuest;
  const [vehicle, setVehicle] = useState(user.vehicle);
  const [arrivalIdx, setArrivalIdx] = useState(user.arrivalIdx);

  // Persist changes
  useEffect(() => {
    const updated = { ...user, vehicle, arrivalIdx, arrivalTime: timeOptions[arrivalIdx] };
    localStorage.setItem("skyspot_user", JSON.stringify(updated));
  }, [vehicle, arrivalIdx]);

  const handleLogout = () => {
    localStorage.removeItem("skyspot_user");
    localStorage.removeItem("skyspot_username");
    localStorage.removeItem("skyspot_logged_in");
    navigate(isGuest ? "/auth" : "/");
  };

  const fullName = `${user.firstName}${user.lastName ? " " + user.lastName : ""}`;

  return (
    <div className="flex flex-col px-4 lg:px-8 pt-4 lg:pt-8 pb-4">
      {/* User info */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
          style={{ background: user.photo ? "transparent" : "linear-gradient(135deg, #2D7EFF, #1B5FCC)" }}>
          {user.photo ? (
            <img src={user.photo} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white" style={{ fontSize: 24, fontWeight: 700 }}>{user.initials}</span>
          )}
        </div>
        <div className="flex-1">
          <div style={{ color: c.text, fontSize: 18, fontWeight: 600 }}>{fullName}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: c.accentBg, color: c.accent }}>
              MTU Student
            </span>
            <span style={{ color: c.textFaint }} className="text-[11px]">{user.course}</span>
          </div>
        </div>
      </div>

      {/* Vehicle type */}
      <div className="mb-5">
        <label style={{ color: c.textMuted }} className="text-[12px] mb-2 block">Vehicle Type</label>
        <div className="flex gap-2">
          {vehicles.map((v) => (
            <button key={v.id} onClick={() => setVehicle(v.id)}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors"
              style={{ background: vehicle === v.id ? c.accentBg : c.card,
                border: `1px solid ${vehicle === v.id ? c.accentBorder : c.cardBorder}` }}>
              <v.icon size={18} color={vehicle === v.id ? c.accent : c.textFaint} />
              <span className="text-[10px]" style={{ color: vehicle === v.id ? c.accent : c.textMuted }}>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preferred arrival - slider */}
      <div className="mb-5">
        <label style={{ color: c.textMuted }} className="text-[12px] mb-2 block">Preferred Arrival Time</label>
        <div className="p-4 rounded-xl" style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
          <div className="text-center mb-3">
            <span style={{ color: c.accent, fontSize: 22, fontWeight: 700 }}>{timeOptions[arrivalIdx]}</span>
          </div>
          <input type="range" min={0} max={timeOptions.length - 1} value={arrivalIdx}
            onChange={(e) => setArrivalIdx(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #2D7EFF ${(arrivalIdx / (timeOptions.length - 1)) * 100}%, ${c.cardBorder} ${(arrivalIdx / (timeOptions.length - 1)) * 100}%)`, accentColor: "#2D7EFF" }} />
          <div className="flex justify-between mt-1">
            <span style={{ color: c.textFaint }} className="text-[10px]">7:00 AM</span>
            <span style={{ color: c.textFaint }} className="text-[10px]">5:00 PM</span>
          </div>
        </div>
      </div>

      {/* Settings */}
      <h3 style={{ color: c.textMuted }} className="text-[12px] mb-3 uppercase tracking-wider">Appearance</h3>
      <div className="space-y-2 mb-5">
        <div className="p-3 rounded-xl" style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
          <div className="flex gap-1.5">
            {([
              { id: "light" as const, icon: Sun, label: "Light", iconColor: "#F59E0B" },
              { id: "default" as const, icon: Moon, label: "Default", iconColor: "#2D7EFF" },
              { id: "amoled" as const, icon: Zap, label: "AMOLED", iconColor: "#A855F7" },
            ]).map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg transition-colors"
                style={{
                  background: theme === m.id ? (m.id === "amoled" ? "rgba(168,85,247,0.12)" : m.id === "default" ? c.accentBg : "rgba(245,158,11,0.08)") : "transparent",
                  border: `1px solid ${theme === m.id ? (m.id === "amoled" ? "rgba(168,85,247,0.25)" : m.id === "default" ? c.accentBorder : "rgba(245,158,11,0.15)") : "transparent"}`,
                }}>
                <m.icon size={16} color={theme === m.id ? m.iconColor : c.textFaint} />
                <span className="text-[10px]" style={{ color: theme === m.id ? m.iconColor : c.textMuted }}>{m.label}</span>
              </button>
            ))}
          </div>
          {theme === "amoled" && (
            <p style={{ color: c.textFaint }} className="text-[10px] text-center mt-2">True black for OLED displays — saves battery</p>
          )}
        </div>
      </div>

      {/* Accessibility */}
      <h3 style={{ color: c.textMuted }} className="text-[12px] mb-3 uppercase tracking-wider">Accessibility</h3>
      <div className="space-y-2 mb-5">

        {/* Text Size */}
        <div className="p-4 rounded-xl" style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
          <div className="flex justify-between items-center mb-3">
            <label style={{ color: c.textMuted }} className="text-[12px]">Text Size</label>
            <span style={{ color: c.accent, fontSize: 12, fontWeight: 600 }}>{Math.round(textSize * 100)}%</span>
          </div>
          <input
            type="range" min={85} max={130} step={5} value={Math.round(textSize * 100)}
            onChange={(e) => setTextSize(Number(e.target.value) / 100)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #2D7EFF ${((textSize * 100 - 85) / (130 - 85)) * 100}%, ${c.cardBorder} ${((textSize * 100 - 85) / (130 - 85)) * 100}%)`,
              accentColor: "#2D7EFF",
            }}
          />
          <div className="flex justify-between mt-1">
            <span style={{ color: c.textFaint }} className="text-[10px]">Small</span>
            <span style={{ color: c.textFaint }} className="text-[10px]">Large</span>
          </div>
        </div>

        {/* Font */}
        <div className="p-4 rounded-xl" style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
          <label style={{ color: c.textMuted }} className="text-[12px] mb-2 block">Font</label>
          <div className="flex gap-2">
            {(["inter", "opendyslexic"] as FontChoice[]).map((f) => {
              const active = font === f;
              return (
                <button
                  key={f}
                  onClick={() => setFont(f)}
                  className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-colors"
                  style={{
                    background: active ? c.accentBg : "transparent",
                    border: `1px solid ${active ? c.accentBorder : c.cardBorder}`,
                  }}
                >
                  <span style={{
                    fontFamily: f === "opendyslexic" ? "OpenDyslexic, sans-serif" : "Inter, sans-serif",
                    fontSize: 20,
                    fontWeight: 700,
                    color: active ? c.accent : c.textSecondary,
                    lineHeight: 1,
                  }}>
                    Aa
                  </span>
                  <span style={{ color: active ? c.accent : c.textMuted }} className="text-[10px]">
                    {f === "opendyslexic" ? "OpenDyslexic" : "Inter"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Vision Filter */}
        <div className="p-4 rounded-xl" style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
          <label style={{ color: c.textMuted }} className="text-[12px] mb-2 block">Color Vision Filter</label>
          <div className="flex flex-col gap-1.5">
            {colorFilterOptions.map((opt) => {
              const active = colorFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setColorFilter(opt.id)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left"
                  style={{
                    background: active ? c.accentBg : "transparent",
                    border: `1px solid ${active ? c.accentBorder : "transparent"}`,
                  }}
                >
                  <div>
                    <span style={{ color: active ? c.accent : c.textSecondary, fontSize: 13 }}>{opt.label}</span>
                    <span style={{ color: c.textFaint, fontSize: 11, marginLeft: 6 }}>{opt.sub}</span>
                  </div>
                  {active && (
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.accent }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <h3 style={{ color: c.textMuted }} className="text-[12px] mb-3 uppercase tracking-wider">Settings</h3>
      <div className="space-y-2 mb-6">
        {!isGuest && (
          <button onClick={() => navigate("/onboarding")}
            className="w-full flex items-center justify-between p-4 rounded-xl"
            style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
            <div className="flex items-center gap-3">
              <Pencil size={16} color={c.textMuted} />
              <span style={{ color: c.textSecondary }} className="text-[13px]">Edit Profile</span>
            </div>
            <ChevronRight size={16} color={c.textFaint} />
          </button>
        )}

        <button onClick={() => navigate("/app/alerts")}
          className="w-full flex items-center justify-between p-4 rounded-xl"
          style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
          <div className="flex items-center gap-3">
            <Bell size={16} color={c.textMuted} />
            <span style={{ color: c.textSecondary }} className="text-[13px]">Notification Preferences</span>
          </div>
          <ChevronRight size={16} color={c.textFaint} />
        </button>

        <button onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 rounded-xl"
          style={{ background: isGuest ? c.accentBg : "rgba(239,68,68,0.06)", border: `1px solid ${isGuest ? c.accentBorder : "rgba(239,68,68,0.12)"}` }}>
          <div className="flex items-center gap-3">
            {isGuest ? <LogIn size={16} color={c.accent} /> : <LogOut size={16} color="#EF4444" />}
            <span style={{ color: isGuest ? c.accent : "#EF4444" }} className="text-[13px]">{isGuest ? "Log In" : "Log Out"}</span>
          </div>
          <ChevronRight size={16} color={isGuest ? c.accent + "66" : "rgba(239,68,68,0.4)"} />
        </button>
      </div>
    </div>
  );
}