import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Bell, RefreshCw, Satellite, Map as MapIcon,
  Loader2, AlertCircle, LocateFixed, Plus, Minus, Sun, Moon,
} from "lucide-react";
import { useColors, useTheme } from "./ThemeContext";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import fullGeoJson from "../../imports/full_carpark.json";

// ── Tile definitions ──────────────────────────────────────────────────────────
const CARTO_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const TILES = {
  light: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  // Default dark theme — CartoDB Dark Matter (street labels visible)
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: CARTO_ATTR,
  },
  // AMOLED — same provider, no labels for a cleaner true-black look
  amoled: {
    url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    attribution: CARTO_ATTR,
  },
  aerial: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri, DigitalGlobe, GeoEye, USDA FSA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface SpaceStatus {
  space_id: string;
  status: "occupied" | "vacant" | "unknown";
  confidence: number | null;
  observed_at: string | null;
  data_source: "real" | "generated" | "unknown";
}

interface SpacesResponse {
  spaces: SpaceStatus[];
  total: number;
  occupied: number;
  vacant: number;
  unknown: number;
  last_updated: string | null;
  data_source: string;
}

interface GeoFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { space_id: string; section: string; row_label: string; space_type: string };
}

interface MergedSpace extends GeoFeature {
  dbStatus: SpaceStatus | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getUserFirstName(): string {
  try {
    const raw = localStorage.getItem("skyspot_user");
    if (raw) {
      const user = JSON.parse(raw);
      return user.isGuest ? "" : (user.firstName ?? "");
    }
  } catch {}
  return "";
}

function formatLastSeen(ts: string | null | undefined): string {
  if (!ts) return "No data";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function markerColor(status: SpaceStatus["status"]): string {
  if (status === "vacant")   return "#22c55e";
  if (status === "occupied") return "#ef4444";
  return "#94a3b8";
}

// ── Map centre ────────────────────────────────────────────────────────────────
const MAP_CENTER: [number, number] = [51.882747, -8.534587];
const MAP_ZOOM = 18;

// Captures the Leaflet map instance into a ref (must render inside MapContainer)
function MapRefCapture({ onMap }: { onMap: (m: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => { onMap(map); }, [map, onMap]);
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LiveMap() {
  const navigate  = useNavigate();
  const c         = useColors();
  const { theme } = useTheme();
  const mapRef    = useRef<LeafletMap | null>(null);
  const [tileStyle, setTileStyle] = useState<"dark" | "light">("dark");

  const [dbData,     setDbData]     = useState<SpacesResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mapStyle,   setMapStyle]   = useState<"street" | "aerial">("street");

  const statusMap: Record<string, SpaceStatus> = {};
  dbData?.spaces.forEach((s) => { statusMap[s.space_id] = s; });

  const mergedSpaces: MergedSpace[] = (fullGeoJson as any).features.map(
    (f: GeoFeature) => ({ ...f, dbStatus: statusMap[f.properties.space_id] ?? null })
  );

  const fetchSpaces = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/spaces");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDbData(await res.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSpaces();
    const t = setInterval(() => fetchSpaces(), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [fetchSpaces]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const total    = dbData?.total    ?? mergedSpaces.length;
  const vacant   = dbData?.vacant   ?? 0;
  const occupied = dbData?.occupied ?? 0;
  const pct      = total > 0 ? vacant / total : 0;
  const statusColor = pct > 0.2 ? c.green : pct > 0 ? c.amber : c.red;
  const statusLabel = !dbData ? "Loading…" : pct > 0.2 ? "Available" : pct > 0 ? "Limited" : "Full";
  const firstName   = getUserFirstName();

  const baseTile = mapStyle === "aerial"
    ? TILES.aerial
    : theme === "light"
      ? TILES.light
      : theme === "amoled"
        ? TILES.amoled
        : tileStyle === "light" ? TILES.light : TILES.dark; // default: user-selected light or dark
  const isDark     = theme === "default" || theme === "amoled";
  const pillBg     = isDark ? "rgba(10,14,26,0.82)" : "rgba(255,255,255,0.92)";
  const pillText   = isDark ? "#e2e8f0" : "#1e293b";
  const pillBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-8 pt-4 lg:pt-6 pb-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: c.text }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p style={{ color: c.textMuted }} className="text-[13px] mt-0.5">
            MTU Bishopstown · All Car Parks
          </p>
        </div>
        <button
          className="relative p-2 rounded-lg"
          onClick={() => navigate("/app/alerts")}
          style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
        >
          <Bell size={18} color={c.text} />
          <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EF4444]" />
        </button>
      </div>

      {/*
        ── Map container ──────────────────────────────────────────────────────
        KEY FIX: position:relative + zIndex:0 + isolation:isolate together
        create a new stacking context that fully contains Leaflet's internal
        pane z-indices. Without this, Leaflet's tile/marker panes escape to
        the top of the page stacking context and render above the sidebar
        overlay on mobile browsers.
      */}
      <div
        className="mx-4 rounded-2xl overflow-hidden relative flex-shrink-0 isolate"
        style={{
          height: 360,
          border: `1px solid ${c.accentBorder}`,
          position: "relative",
          zIndex: 0,
        }}
      >
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ background: c.mapBg }}>
            <Loader2 size={28} color={c.accent} className="animate-spin" />
            <span style={{ color: c.textMuted }} className="text-[12px]">Loading spaces…</span>
          </div>
        ) : error ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ background: c.mapBg }}>
            <AlertCircle size={28} color="#ef4444" />
            <span style={{ color: c.textMuted }} className="text-[12px] text-center px-8">
              Could not reach database.
            </span>
            <button
              onClick={() => fetchSpaces(true)}
              className="px-3 py-1.5 rounded-lg text-[11px]"
              style={{ background: c.card, border: `1px solid ${c.cardBorder}`, color: c.text }}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <MapContainer
              center={MAP_CENTER}
              zoom={MAP_ZOOM}
              style={{ width: "100%", height: "100%" }}
              zoomControl={false}
              scrollWheelZoom
              maxZoom={21}
            >
              <MapRefCapture onMap={(m) => { mapRef.current = m; }} />

              <TileLayer
                key={`${theme}-${mapStyle}`}
                url={baseTile.url}
                attribution={baseTile.attribution}
                maxZoom={21}
                maxNativeZoom={19}
              />

              {mergedSpaces.map(({ properties: p, geometry: g, dbStatus: d }) => {
                const [lon, lat] = g.coordinates;
                const status = d?.status ?? "unknown";
                const fill   = markerColor(status);
                return (
                  <CircleMarker
                    key={p.space_id}
                    center={[lat, lon]}
                    radius={5}
                    pathOptions={{
                      color: "rgba(255,255,255,0.3)",
                      weight: 1,
                      fillColor: fill,
                      fillOpacity: 0.92,
                    }}
                  >
                    <Popup closeButton={false}>
                      <div style={{ minWidth: 120 }}>
                        <p className="font-semibold text-sm">{p.space_id}</p>
                        <p className="text-[10px] text-gray-500 mb-1">{p.section}</p>
                        <p className="text-xs font-medium capitalize" style={{ color: fill }}>{status}</p>
                        {d?.confidence != null && (
                          <p className="text-[10px] text-gray-400">{Math.round(d.confidence * 100)}% confidence</p>
                        )}
                        {d?.observed_at && (
                          <p className="text-[10px] text-gray-400">{formatLastSeen(d.observed_at)} · {d.data_source}</p>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {/* Map style controls — top right */}
            <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1.5">
              {/* Map / Aerial toggle */}
              <button
                onClick={() => setMapStyle((s) => s === "street" ? "aerial" : "street")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shadow-md transition-all active:scale-95"
                style={{ background: pillBg, color: pillText, border: `1px solid ${pillBorder}`, backdropFilter: "blur(6px)" }}
              >
                {mapStyle === "street" ? <Satellite size={11} /> : <MapIcon size={11} />}
                {mapStyle === "street" ? "Aerial" : "Map"}
              </button>

              {/* Light / Dark tile toggle — only for default theme in street mode */}
              {theme === "default" && mapStyle === "street" && (
                <button
                  onClick={() => setTileStyle((s) => s === "dark" ? "light" : "dark")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shadow-md transition-all active:scale-95"
                  style={{ background: pillBg, color: pillText, border: `1px solid ${pillBorder}`, backdropFilter: "blur(6px)" }}
                >
                  {tileStyle === "dark" ? <Sun size={11} /> : <Moon size={11} />}
                  {tileStyle === "dark" ? "Light" : "Dark"}
                </button>
              )}
            </div>

            {/* Legend */}
            <div className="absolute top-2 left-2 z-[1000] flex flex-col gap-1">
              {[
                { col: "#22c55e", l: "Vacant" },
                { col: "#ef4444", l: "Occupied" },
              ].map((i) => (
                <div
                  key={i.l}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full shadow-sm"
                  style={{ background: pillBg, backdropFilter: "blur(4px)" }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: i.col }} />
                  <span className="text-[9px] font-medium" style={{ color: pillText }}>{i.l}</span>
                </div>
              ))}
            </div>

            {/* Zoom + Recenter controls (bottom-right, above attribution) */}
            <div className="absolute bottom-7 right-2 z-[1000] flex flex-col gap-1">
              {[
                { icon: <Plus size={14} />,         label: "Zoom in",  action: () => mapRef.current?.zoomIn()  },
                { icon: <Minus size={14} />,        label: "Zoom out", action: () => mapRef.current?.zoomOut() },
                { icon: <LocateFixed size={14} />,  label: "Recenter", action: () => mapRef.current?.setView(MAP_CENTER, MAP_ZOOM) },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  aria-label={btn.label}
                  className="flex items-center justify-center w-7 h-7 rounded-lg shadow-md active:scale-95 transition-transform"
                  style={{ background: pillBg, color: pillText, border: `1px solid ${pillBorder}`, backdropFilter: "blur(6px)" }}
                >
                  {btn.icon}
                </button>
              ))}
            </div>

            {/* Last updated */}
            <div
              className="absolute bottom-2 left-2 z-[1000] px-2 py-0.5 rounded-full shadow-sm"
              style={{ background: pillBg, backdropFilter: "blur(4px)" }}
            >
              <span className="text-[9px]" style={{ color: pillText }}>
                Updated: {formatLastSeen(dbData?.last_updated)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Stats card */}
      <div
        className="mx-4 mt-3 p-4 rounded-2xl"
        style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: statusColor }} />
            <span style={{ color: c.textSecondary }} className="text-[13px] font-medium">{statusLabel}</span>
          </div>
          <span style={{ color: c.textFaint }} className="text-[10px]">
            {dbData?.data_source === "real" ? "📡 Drone scan" : "⚡ Simulated"}
          </span>
        </div>

        <div className="flex justify-between mb-3">
          {[
            { n: total,    l: "Total",    col: c.text    },
            { n: vacant,   l: "Vacant",   col: "#22c55e" },
            { n: occupied, l: "Occupied", col: "#ef4444" },
          ].map((s) => (
            <div key={s.l} className="text-center flex-1">
              <div style={{ color: s.col, fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{s.n}</div>
              <div style={{ color: c.textMuted }} className="text-[11px] mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        {total > 0 && (
          <div className="rounded-full overflow-hidden" style={{ height: 4, background: "rgba(148,163,184,0.2)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(occupied / total) * 100}%`, background: statusColor }}
            />
          </div>
        )}
      </div>

      {/* Refresh */}
      <div className="mx-4 mt-3 mb-3">
        <button
          onClick={() => fetchSpaces(true)}
          disabled={refreshing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-60"
          style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
        >
          <RefreshCw size={15} color={c.textMuted} className={refreshing ? "animate-spin" : ""} />
          <span className="text-[13px]" style={{ color: c.textMuted }}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </span>
        </button>
      </div>

      <div className="mb-6" />
    </div>
  );
}
