import { useState, useEffect } from "react";
import { ArrowLeft, CloudRain, Wind, Droplets, Sun, Cloud, CloudDrizzle, CloudSnow, CloudLightning, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useColors } from "./ThemeContext";

// MTU Cork Bishopstown coordinates
const LAT = 51.8853;
const LNG = -8.5331;

interface CurrentWeather {
  temp: number;
  windSpeed: number;
  humidity: number;
  weatherCode: number;
  description: string;
}

interface DayForecast {
  day: string;
  temp: number;
  rain: number;
  weatherCode: number;
}

function getWeatherInfo(code: number): { icon: any; description: string } {
  if (code === 0) return { icon: Sun, description: "Clear sky" };
  if (code <= 3) return { icon: Cloud, description: "Partly cloudy" };
  if (code <= 48) return { icon: Cloud, description: "Foggy" };
  if (code <= 55) return { icon: CloudDrizzle, description: "Light drizzle" };
  if (code <= 57) return { icon: CloudDrizzle, description: "Freezing drizzle" };
  if (code <= 65) return { icon: CloudRain, description: "Rain" };
  if (code <= 67) return { icon: CloudRain, description: "Freezing rain" };
  if (code <= 75) return { icon: CloudSnow, description: "Snow" };
  if (code <= 77) return { icon: CloudSnow, description: "Snow grains" };
  if (code <= 82) return { icon: CloudRain, description: "Rain showers" };
  if (code <= 86) return { icon: CloudSnow, description: "Snow showers" };
  if (code <= 99) return { icon: CloudLightning, description: "Thunderstorm" };
  return { icon: Cloud, description: "Cloudy" };
}

function getParkingColor(rain: number): string {
  if (rain >= 60) return "#EF4444";
  if (rain >= 30) return "#F59E0B";
  return "#22C55E";
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Weather() {
  const navigate = useNavigate();
  const c = useColors();
  const [rainAlert, setRainAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<DayForecast[]>([]);

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=Europe%2FDublin&forecast_days=5`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const cur = data.current;
        const info = getWeatherInfo(cur.weather_code);
        setCurrent({
          temp: Math.round(cur.temperature_2m),
          windSpeed: Math.round(cur.wind_speed_10m),
          humidity: cur.relative_humidity_2m,
          weatherCode: cur.weather_code,
          description: info.description,
        });

        const days: DayForecast[] = data.daily.time.map((t: string, i: number) => {
          const date = new Date(t + "T00:00:00");
          return {
            day: DAYS[date.getDay()],
            temp: Math.round(data.daily.temperature_2m_max[i]),
            rain: data.daily.precipitation_probability_max[i],
            weatherCode: data.daily.weather_code[i],
          };
        });
        setForecast(days);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const curInfo = current ? getWeatherInfo(current.weatherCode) : null;
  const CurIcon = curInfo?.icon || Cloud;

  // Generate smart alert based on forecast
  const rainyDay = forecast.find((d, i) => i > 0 && d.rain >= 50);
  const alertMsg = rainyDay
    ? `Rain forecast on ${rainyDay.day} (${rainyDay.rain}% chance) — expect the car park to be 30% busier than usual. Arrive before 8:45 AM.`
    : forecast.length > 0
    ? "No significant rain expected this week — parking demand should be normal."
    : "";

  return (
    <div className="flex flex-col px-4 lg:px-8 pt-4 lg:pt-8 pb-4">
      <button onClick={() => navigate("/app")} className="flex items-center gap-2 mb-4">
        <ArrowLeft size={18} color={c.text} />
        <span style={{ color: c.textMuted }} className="text-[13px]">Back to Map</span>
      </button>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} color={c.accent} className="animate-spin" />
          <span style={{ color: c.textMuted }} className="text-[13px]">Fetching live weather...</span>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl mb-4 text-center" style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
          <span style={{ color: c.textMuted }} className="text-[13px]">Unable to fetch weather data. Please try again later.</span>
        </div>
      ) : (
        <>
          {/* Current weather */}
          <div className="p-5 rounded-2xl mb-4" style={{ background: c.accentBg, border: `1px solid ${c.accentBorder}` }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div style={{ color: c.textMuted }} className="text-[11px] mb-1">Cork, Ireland · Live</div>
                <div style={{ color: c.text, fontSize: 40, fontWeight: 700 }}>{current?.temp}°C</div>
                <div style={{ color: c.textMuted }} className="text-[13px]">{current?.description}</div>
              </div>
              <CurIcon size={48} color="#2D7EFF" strokeWidth={1.5} />
            </div>
            <div className="flex gap-4">
              {[
                { icon: Wind, label: `${current?.windSpeed} km/h`, sub: "Wind" },
                { icon: Droplets, label: `${current?.humidity}%`, sub: "Humidity" },
              ].map((w) => (
                <div key={w.sub} className="flex items-center gap-2">
                  <w.icon size={14} color={c.textMuted} />
                  <div>
                    <div style={{ color: c.textSecondary }} className="text-[12px]">{w.label}</div>
                    <div style={{ color: c.textFaint }} className="text-[10px]">{w.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weather impact alert */}
          <div className="p-4 rounded-xl mb-4" style={{ background: rainyDay ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${rainyDay ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)"}` }}>
            <div className="flex items-start gap-2">
              <span className="text-[18px]">{rainyDay ? "☔" : "☀️"}</span>
              <div className="flex-1">
                <div className="text-[13px] mb-1" style={{ fontWeight: 600, color: rainyDay ? "#F59E0B" : "#22C55E" }}>Weather Impact Alert</div>
                <p style={{ color: c.textMuted }} className="text-[12px] leading-relaxed">{alertMsg}</p>
              </div>
            </div>
          </div>

          {/* 5-day forecast */}
          <h3 style={{ color: c.text, fontSize: 15, fontWeight: 600 }} className="mb-3">5-Day Forecast</h3>
          <div className="flex gap-2 mb-5">
            {forecast.map((d) => {
              const info = getWeatherInfo(d.weatherCode);
              const DayIcon = info.icon;
              const parkCol = getParkingColor(d.rain);
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center p-3 rounded-xl"
                  style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
                  <span style={{ color: c.textMuted }} className="text-[10px] mb-2">{d.day}</span>
                  <DayIcon size={18} color={c.textMuted} />
                  <span style={{ color: c.text, fontWeight: 600 }} className="text-[13px] my-1">{d.temp}°</span>
                  <span style={{ color: c.textFaint }} className="text-[9px]">{d.rain}% rain</span>
                  <div className="w-full h-1 rounded-full mt-2" style={{ background: parkCol + "40" }}>
                    <div className="h-full rounded-full" style={{ background: parkCol, width: `${d.rain}%` }} />
                  </div>
                  <div className="w-3 h-3 rounded-full mt-1.5" style={{ background: parkCol }} />
                </div>
              );
            })}
          </div>

          {/* Rain alert toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl mb-6"
            style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
            <div>
              <div style={{ color: c.textSecondary }} className="text-[13px]">Set Rain Alert</div>
              <div style={{ color: c.textFaint }} className="text-[11px]">Get notified when rain impacts parking</div>
            </div>
            <button onClick={() => setRainAlert(!rainAlert)}
              className="w-11 h-6 rounded-full relative transition-colors"
              style={{ background: rainAlert ? "#2D7EFF" : c.inputBorder }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ left: rainAlert ? 22 : 2 }} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}