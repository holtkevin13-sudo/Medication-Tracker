// Weather snapshot via Open-Meteo. No API key needed.
// Auto-grabs location only when needed (i.e. when logging a migraine).

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

const getLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error('No geolocation'));
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
    (err) => reject(err),
    { timeout: 8000, maximumAge: 60 * 60 * 1000 } // 1h cache is fine
  );
});

export const fetchWeatherSnapshot = async () => {
  try {
    const { lat, lon } = await getLocation();
    // Round coords slightly for privacy — accurate enough for weather
    const rLat = Math.round(lat * 100) / 100;
    const rLon = Math.round(lon * 100) / 100;
    const url = `${OPEN_METEO}?latitude=${rLat}&longitude=${rLon}` +
      `&current=temperature_2m,relative_humidity_2m,pressure_msl,weather_code` +
      `&past_hours=24&hourly=pressure_msl` +
      `&temperature_unit=fahrenheit&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();
    const cur = data.current || {};
    // Compute pressure change over last 24h
    let pressureChange = null;
    const hourly = data.hourly?.pressure_msl;
    if (hourly && hourly.length >= 2) {
      const start = hourly.find((v) => v != null);
      const end = [...hourly].reverse().find((v) => v != null);
      if (start != null && end != null) pressureChange = Math.round((end - start) * 10) / 10;
    }
    return {
      pressure_mb: cur.pressure_msl != null ? Math.round(cur.pressure_msl) : null,
      pressure_change_24h: pressureChange,
      temp_f: cur.temperature_2m != null ? Math.round(cur.temperature_2m) : null,
      humidity: cur.relative_humidity_2m,
      conditions: weatherCodeToText(cur.weather_code),
      fetched_at: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('Weather snapshot failed:', err.message);
    return null;
  }
};

// WMO weather code → human label (minimal set)
function weatherCodeToText(code) {
  if (code == null) return null;
  const map = {
    0: 'Clear',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy', 48: 'Foggy',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Showers', 81: 'Heavy showers', 82: 'Violent showers',
    95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Severe thunderstorm',
  };
  return map[code] || `Code ${code}`;
}
