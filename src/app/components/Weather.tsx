import { useState, useEffect } from "react";
import {
  Loader2, Droplets, Wind, Thermometer,
  Cloud, CloudRain, Sun, CloudSnow, Zap, Eye,
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

// ── Types ─────────────────────────────────────────────────────────────────────
interface CurrentWeather {
  temp: number;
  feelsLike?: number;
  windSpeed: number;
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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Data fetching ─────────────────────────────────────────────────────────────
/**
 * Try the backend API (Postgres) first, fall back to direct Open-Meteo call.
 */
async function fetchWeatherData(): Promise<{ current: CurrentWeather; forecast: ForecastDay[] }> {
  // --- Attempt 1: backend API (Postgres via n8n-synced data) ---
  try {
    const [curRes, fcRes] = await Promise.all([
      fetch("/api/weather/current"),
      fetch("/api/weather/forecast"),
    ]);

    if (curRes.ok && fcRes.ok) {
      const cur  = await curRes.json();
      const fcDays = await fcRes.json();

      const current: CurrentWeather = {
        temp:        Math.round(cur.temperature_c ?? 0),
        feelsLike:   cur.feels_like_c != null ? Math.round(cur.feels_like_c) : undefined,
        windSpeed:   Math.round((cur.wind_speed_ms ?? 0) * 3.6), // m/s → km/h
        humidity:    Math.round(cur.humidity_pct ?? 0),
        weatherCode: cur.weather_code ?? 0,
        description: cur.description ?? getWeatherInfo(cur.weather_code).description,
        precipMm:    cur.precipitation_mm ?? 0,
      };

      const forecast: ForecastDay[] = fcDays.map((d: any) => {
        const date = new Date(d.forecast_date + "T00:00:00");
        return {
          day:        DAYS[date.getDay()],
          date:       d.forecast_date,
          temp:       Math.round(d.temp_max_c ?? 0),
          tempMin:    d.temp_min_c != null ? Math.round(d.temp_min_c) : undefined,
          rain:       Math.round(d.precipitation_prob_max ?? 0),
          weatherCode: d.weather_code ?? 0,
        };
      });

      return { current, forecast };
    }
  } catch {
    // fall through to Open-Meteo
  }

  // --- Fallback: direct Open-Meteo request ---
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=51.8826&longitude=-8.5356" +
    "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,precipitation" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=Europe%2FDublin&forecast_days=7";

  const res  = await fetch(url);
  const data = await res.json();
  const cur  = data.current;

  const current: CurrentWeather = {
    temp:        Math.round(cur.temperature_2m),
    feelsLike:   cur.apparent_temperature != null ? Math.round(cur.apparent_temperature) : undefined,
    windSpeed:   Math.round(cur.wind_speed_10m),
    humidity:    cur.relative_humidity_2m,
    weatherCode: cur.weather_code,
    description: getWeatherInfo(cur.weather_code).description,
    precipMm:    cur.precipitation ?? 0,
  };

  const forecast: ForecastDay[] = data.daily.time.map((t: string, i: number) => {
    const date = new Date(t + "T00:00:00");
    return {
      day:         DAYS[date.getDay()],
      date:        t,
      temp:        Math.round(data.daily.temperature_2m_max[i]),
      tempMin:     Math.round(data.daily.temperature_2m_min[i]),
      rain:        data.daily.precipitation_probability_max[i],
      weatherCode: data.daily.weather_code[i],
    };
  });

  return { current, forecast };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Weather() {
  const c = useColors();

  const [current,  setCurrent]  = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [source,   setSource]   = useState<"db" | "live" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Quick check: did we get data from the DB API?
        const curRes = await fetch("/api/weather/current").catch(() => null);
        const fromDb = curRes?.ok ?? false;

        const data = await fetchWeatherData();
        setCurrent(data.current);
        setForecast(data.forecast);
        setSource(fromDb ? "db" : "live");
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const curInfo = current ? getWeatherInfo(current.weatherCode) : null;
  const CurIcon = curInfo?.icon ?? Cloud;

  const rainyDay = forecast.find((d, i) => i > 0 && d.rain >= 50);
  const alertMsg = rainyDay
    ? `Rain forecast on ${rainyDay.day} (${rainyDay.rain}% chance) — expect the car park to be ~30% busier. Arrive before 8:45 AM.`
    : forecast.length > 0
    ? "No significant rain expected this week — parking demand should be normal."
    : "";

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
                { icon: Wind,     label: "Wind",     value: `${current.windSpeed} km/h` },
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

          {/* Smart alert */}
          {alertMsg && (
            <div
              className="p-4 rounded-2xl mb-4 flex items-start gap-3"
              style={{
                background: rainyDay ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                border: `1px solid ${rainyDay ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
              }}
            >
              <span className="text-lg">{rainyDay ? "🌧️" : "☀️"}</span>
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
