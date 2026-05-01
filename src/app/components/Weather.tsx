import { useState, useEffect, useRef } from "react";
import {
  Loader2, Droplets, Wind, Cloud, CloudRain, Sun, CloudSnow, Zap, Eye,
} from "lucide-react";
import { useColors } from "./ThemeContext";

// ── WMO weather code helpers ──────────────────────────────────────────────────
const WMO_MAP: Record<number, { description: string; icon: React.ElementType; isRainy: boolean }> = {
  0:  { description: "Clear sky",             icon: Sun,       isRainy: false },
  1:  { description: "Mainly clear",          icon: Sun,       isRainy: false },
  2:  { description: "Partly cloudy",         icon: Cloud,     isRainy: false },
  3:  { description: "Overcast",              icon: Cloud,     isRainy: false },
  45: { description: "Foggy",                 icon: Cloud,     isRainy: false },
  48: { description: "Rime fog",              icon: Cloud,     isRainy: false },
  51: { description: "Light drizzle",         icon: CloudRain, isRainy: true  },
  53: { description: "Moderate drizzle",      icon: CloudRain, isRainy: true  },
  55: { description: "Dense drizzle",         icon: CloudRain, isRainy: true  },
  61: { description: "Slight rain",           icon: CloudRain, isRainy: true  },
  63: { description: "Moderate rain",         icon: CloudRain, isRainy: true  },
  65: { description: "Heavy rain",            icon: CloudRain, isRainy: true  },
  71: { description: "Slight snow",           icon: CloudSnow, isRainy: false },
  73: { description: "Moderate snow",         icon: CloudSnow, isRainy: false },
  75: { description: "Heavy snow",            icon: CloudSnow, isRainy: false },
  80: { description: "Slight rain showers",   icon: CloudRain, isRainy: true  },
  81: { description: "Moderate rain showers", icon: CloudRain, isRainy: true  },
  82: { description: "Violent rain showers",  icon: CloudRain, isRainy: true  },
  95: { description: "Thunderstorm",          icon: Zap,       isRainy: true  },
  96: { description: "Thunderstorm + hail",   icon: Zap,       isRainy: true  },
  99: { description: "Thunderstorm + hail",   icon: Zap,       isRainy: true  },
};

function getWeatherInfo(code: number | null | undefined) {
  if (code == null) return { description: "Unknown", icon: Cloud, isRainy: false };
  return WMO_MAP[code] ?? { description: "Unknown", icon: Cloud, isRainy: false };
}

function windDirLabel(deg: number): string {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface CurrentWeather {
  temp: number;
  feelsLike?: number;
  windSpeed: number;
  windDir?: number;
  humidity: number;
  weatherCode: number;
  description: string;
  precipMm?: number;
}

interface ForecastDay {
  day: string;
  date: string;
  temp: number;
  tempMin?: number;
  rain: number;
  weatherCode: number;
}

interface HourlySlot {
  label: string;      // "Now" | "14:00"
  temp: number;
  weatherCode: number;
  precipMm: number;
  isNow: boolean;
  tsMs: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchWeatherData(): Promise<{
  current: CurrentWeather;
  forecast: ForecastDay[];
  hourly: HourlySlot[];
}> {
  // --- Attempt 1: backend API (Postgres via n8n-synced data) ---
  try {
    const [curRes, fcRes, hrRes] = await Promise.all([
      fetch("/api/weather/current"),
      fetch("/api/weather/forecast"),
      fetch("/api/weather/hourly"),
    ]);

    if (curRes.ok && fcRes.ok) {
      const cur    = await curRes.json();
      const fcDays = await fcRes.json();
      const hrRaw  = hrRes.ok ? await hrRes.json() : [];

      const current: CurrentWeather = {
        temp:        Math.round(cur.temperature_c ?? 0),
        feelsLike:   cur.feels_like_c != null ? Math.round(cur.feels_like_c) : undefined,
        windSpeed:   Math.round((cur.wind_speed_ms ?? 0) * 3.6),
        windDir:     cur.wind_dir_deg ?? undefined,
        humidity:    Math.round(cur.humidity_pct ?? 0),
        weatherCode: cur.weather_code ?? 0,
        description: cur.description ?? getWeatherInfo(cur.weather_code).description,
        precipMm:    cur.precipitation_mm ?? 0,
      };

      const forecast: ForecastDay[] = fcDays.map((d: any) => {
        const date = new Date(d.forecast_date + "T00:00:00");
        return {
          day:         DAYS[date.getDay()],
          date:        d.forecast_date,
          temp:        Math.round(d.temp_max_c ?? 0),
          tempMin:     d.temp_min_c != null ? Math.round(d.temp_min_c) : undefined,
          rain:        Math.round(d.precipitation_prob_max ?? 0),
          weatherCode: d.weather_code ?? 0,
        };
      });

      const nowMs = Date.now();
      const hourly: HourlySlot[] = hrRaw.map((h: any) => {
        const ts = new Date(h.recorded_at);
        const diffMin = (ts.getTime() - nowMs) / 60000;
        const isNow = Math.abs(diffMin) < 30;
        return {
          label:       isNow ? "Now" : ts.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false }),
          temp:        Math.round(h.temperature_c ?? 0),
          weatherCode: h.weather_code ?? 0,
          precipMm:    h.precipitation_mm ?? 0,
          isNow,
          tsMs:        ts.getTime(),
        };
      });

      return { current, forecast, hourly };
    }
  } catch {
    // fall through to Open-Meteo
  }

  // --- Fallback: direct Open-Meteo request ---
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=51.8826&longitude=-8.5356" +
    "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature,precipitation" +
    "&hourly=temperature_2m,weather_code,precipitation,wind_speed_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset" +
    "&timezone=Europe%2FDublin&forecast_days=2";

  const res  = await fetch(url);
  const data = await res.json();
  const cur  = data.current;

  const current: CurrentWeather = {
    temp:        Math.round(cur.temperature_2m),
    feelsLike:   cur.apparent_temperature != null ? Math.round(cur.apparent_temperature) : undefined,
    windSpeed:   Math.round(cur.wind_speed_10m),
    windDir:     cur.wind_direction_10m ?? undefined,
    humidity:    cur.relative_humidity_2m,
    weatherCode: cur.weather_code,
    description: getWeatherInfo(cur.weather_code).description,
    precipMm:    cur.precipitation ?? 0,
  };

  const nowMs = Date.now();
  const hourly: HourlySlot[] = data.hourly.time
    .map((t: string, i: number) => {
      const ts = new Date(t);
      const diffMin = (ts.getTime() - nowMs) / 60000;
      if (diffMin < -60 || diffMin > 26 * 60) return null;
      const isNow = Math.abs(diffMin) < 30;
      return {
        label:       isNow ? "Now" : ts.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false }),
        temp:        Math.round(data.hourly.temperature_2m[i]),
        weatherCode: data.hourly.weather_code[i],
        precipMm:    data.hourly.precipitation[i] ?? 0,
        isNow,
        tsMs:        ts.getTime(),
      };
    })
    .filter(Boolean) as HourlySlot[];

  // Fetch 7-day forecast separately for full range
  const fc7url =
    "https://api.open-meteo.com/v1/forecast?latitude=51.8826&longitude=-8.5356" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=Europe%2FDublin&forecast_days=7";
  const fc7res  = await fetch(fc7url);
  const fc7data = await fc7res.json();

  const forecast: ForecastDay[] = fc7data.daily.time.map((t: string, i: number) => {
    const date = new Date(t + "T00:00:00");
    return {
      day:         DAYS[date.getDay()],
      date:        t,
      temp:        Math.round(fc7data.daily.temperature_2m_max[i]),
      tempMin:     Math.round(fc7data.daily.temperature_2m_min[i]),
      rain:        fc7data.daily.precipitation_probability_max[i],
      weatherCode: fc7data.daily.weather_code[i],
    };
  });

  return { current, forecast, hourly };
}

function rainTimingMessage(tsMs: number): string {
  const minAway = Math.round((tsMs - Date.now()) / 60000);
  if (minAway <= 0)  return "shortly";
  if (minAway < 60)  return `in ~${minAway} min`;
  const hrs = Math.round(minAway / 60);
  return `in ~${hrs} hr${hrs > 1 ? "s" : ""}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Weather() {
  const c = useColors();
  const hourlyRef = useRef<HTMLDivElement>(null);

  const [current,  setCurrent]  = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [hourly,   setHourly]   = useState<HourlySlot[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [source,   setSource]   = useState<"db" | "live" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const curRes = await fetch("/api/weather/current").catch(() => null);
        const fromDb = curRes?.ok ?? false;

        const data = await fetchWeatherData();
        setCurrent(data.current);
        setForecast(data.forecast);
        setHourly(data.hourly);
        setSource(fromDb ? "db" : "live");
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Scroll hourly strip to "Now" on load
  useEffect(() => {
    if (!hourlyRef.current || hourly.length === 0) return;
    const nowIdx = hourly.findIndex(h => h.isNow);
    if (nowIdx < 0) return;
    const child = hourlyRef.current.children[nowIdx] as HTMLElement | undefined;
    if (child) child.scrollIntoView({ inline: "center", behavior: "smooth" });
  }, [hourly]);

  const curInfo = current ? getWeatherInfo(current.weatherCode) : null;
  const CurIcon = curInfo?.icon ?? Cloud;

  // First future hourly slot with meaningful rain
  const soonRainyHour = hourly.find(h => !h.isNow && h.tsMs > Date.now() && h.precipMm > 0.5);
  const rainyDay = !soonRainyHour
    ? forecast.find((d, i) => i > 0 && d.rain >= 50)
    : undefined;

  let alertMsg = "";
  let alertIsRain = false;
  if (soonRainyHour) {
    const timing = rainTimingMessage(soonRainyHour.tsMs);
    const urgency = (soonRainyHour.tsMs - Date.now()) < 30 * 60000
      ? "Head out now or you'll get wet."
      : "Bring an umbrella or plan your timing.";
    alertMsg = `Rain starts ${timing} — ${urgency}`;
    alertIsRain = true;
  } else if (rainyDay) {
    alertMsg = `Rain forecast on ${rainyDay.day} (${rainyDay.rain}% chance) — expect the car park to be ~30% busier. Arrive before 8:45 AM.`;
    alertIsRain = true;
  } else if (forecast.length > 0) {
    alertMsg = "No significant rain expected this week — parking demand should be normal.";
  }

  return (
    <div className="flex flex-col px-4 lg:px-8 pt-4 lg:pt-8 pb-4">

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} color={c.accent} className="animate-spin" />
          <span style={{ color: c.textMuted }} className="text-[13px]">Fetching weather…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          className="p-5 rounded-2xl mb-4 text-center"
          style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
        >
          <span style={{ color: c.textMuted }} className="text-[13px]">
            Unable to fetch weather data. Check your connection and try again.
          </span>
        </div>
      )}

      {/* Main content */}
      {!loading && !error && current && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: c.text }}>Weather</h1>
              <p style={{ color: c.textMuted }} className="text-[13px]">MTU Cork Bishopstown</p>
            </div>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: c.pillBg, color: c.textFaint }}
            >
              {source === "db" ? "📊 From database" : "🌐 Open-Meteo live"}
            </span>
          </div>

          {/* Current weather card */}
          <div
            className="p-5 rounded-2xl mb-4"
            style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div style={{ color: c.text, fontSize: 52, fontWeight: 700, lineHeight: 1 }}>
                  {current.temp}°
                </div>
                <div style={{ color: c.textSecondary }} className="text-[15px] mt-1">
                  {current.description}
                </div>
                {current.feelsLike !== undefined && (
                  <div style={{ color: c.textMuted }} className="text-[12px] mt-0.5">
                    Feels like {current.feelsLike}°C
                  </div>
                )}
              </div>
              <CurIcon size={56} color={c.accent} strokeWidth={1.5} />
            </div>

            {/* Stats row */}
            <div className="flex gap-4 mt-4 pt-4" style={{ borderTop: `1px solid ${c.cardBorder}` }}>
              {[
                { icon: Droplets, label: "Humidity", value: `${current.humidity}%` },
                {
                  icon: Wind,
                  label: "Wind",
                  value: `${current.windSpeed} km/h${current.windDir != null ? " " + windDirLabel(current.windDir) : ""}`,
                },
                {
                  icon: Eye,
                  label: "Rain",
                  value: current.precipMm !== undefined ? `${current.precipMm.toFixed(1)} mm` : "—",
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex-1 text-center">
                  <Icon size={16} color={c.accent} className="mx-auto mb-1" />
                  <div style={{ color: c.text }} className="text-[13px] font-medium">{value}</div>
                  <div style={{ color: c.textMuted }} className="text-[10px]">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly timeline */}
          {hourly.length > 0 && (
            <div
              className="rounded-2xl mb-4 overflow-hidden"
              style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
            >
              <div className="px-4 pt-4 pb-2">
                <h2 style={{ color: c.text }} className="text-[14px] font-semibold">Hourly</h2>
              </div>
              <div
                ref={hourlyRef}
                className="flex gap-1 overflow-x-auto px-3 pb-4"
                style={{ scrollbarWidth: "none" }}
              >
                {hourly.map((h, i) => {
                  const info = getWeatherInfo(h.weatherCode);
                  const HIcon = info.icon;
                  const hasRain = h.precipMm > 0.3;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-1.5 px-2.5 py-2.5 rounded-xl flex-shrink-0 min-w-[56px]"
                      style={{
                        background: h.isNow ? c.accent + "22" : "transparent",
                        border: h.isNow ? `1px solid ${c.accent}44` : "1px solid transparent",
                      }}
                    >
                      <span
                        style={{ color: h.isNow ? c.accent : c.textMuted }}
                        className="text-[10px] font-medium"
                      >
                        {h.label}
                      </span>
                      <HIcon size={18} color={info.isRainy ? "#60a5fa" : c.accent} strokeWidth={1.5} />
                      <span style={{ color: c.text }} className="text-[13px] font-semibold">
                        {h.temp}°
                      </span>
                      {hasRain ? (
                        <span className="text-[9px]" style={{ color: "#60a5fa" }}>
                          {h.precipMm.toFixed(1)}mm
                        </span>
                      ) : (
                        <span className="text-[9px]" style={{ color: "transparent" }}>·</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Smart alert */}
          {alertMsg && (
            <div
              className="p-4 rounded-2xl mb-4 flex items-start gap-3"
              style={{
                background: alertIsRain ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                border: `1px solid ${alertIsRain ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
              }}
            >
              <span className="text-lg">{alertIsRain ? "🌧️" : "☀️"}</span>
              <p style={{ color: c.textSecondary }} className="text-[12px] leading-relaxed">
                {alertMsg}
              </p>
            </div>
          )}

          {/* 7-day forecast */}
          <div
            className="p-4 rounded-2xl"
            style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
          >
            <h2 style={{ color: c.text }} className="text-[14px] font-semibold mb-3">
              7-Day Forecast
            </h2>
            <div className="space-y-2">
              {forecast.map((day, i) => {
                const info = getWeatherInfo(day.weatherCode);
                const DayIcon = info.icon;
                const isToday = i === 0;
                return (
                  <div
                    key={day.date}
                    className="flex items-center justify-between py-2"
                    style={{
                      borderBottom: i < forecast.length - 1 ? `1px solid ${c.cardBorder}` : "none",
                    }}
                  >
                    <span
                      style={{ color: isToday ? c.accent : c.textSecondary }}
                      className="text-[13px] font-medium w-10"
                    >
                      {isToday ? "Today" : day.day}
                    </span>

                    <DayIcon size={16} color={info.isRainy ? "#60a5fa" : c.accent} />

                    <div className="flex items-center gap-1.5">
                      <Droplets size={10} color="#60a5fa" />
                      <span style={{ color: c.textMuted }} className="text-[11px] w-8 text-right">
                        {day.rain}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1 w-16 justify-end">
                      {day.tempMin !== undefined && (
                        <span style={{ color: c.textFaint }} className="text-[11px]">
                          {day.tempMin}°
                        </span>
                      )}
                      <span style={{ color: c.text }} className="text-[13px] font-semibold">
                        {day.temp}°
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
