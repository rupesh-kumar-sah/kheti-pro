
import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Wind, Droplets, AlertTriangle, Cloud, CloudSun, Loader2, Zap, CloudSnow } from 'lucide-react';

interface WeatherState {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  uvIndex: string;
  isRaining: boolean;
  isSevere: boolean;
  alertTitle?: string;
  alertMessage?: string;
  wmoCode: number;
}

const WeatherCard: React.FC = () => {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Kathmandu Coordinates
        const lat = 27.7172;
        const long = 85.3240;
        
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=uv_index_max&timezone=auto`
        );
        
        if (!response.ok) throw new Error('Weather data fetch failed');
        
        const data = await response.json();
        
        const current = data.current;
        const daily = data.daily;
        
        // Map WMO codes
        const code = current.weather_code;
        let condition = 'Clear Sky';
        let isRaining = false;
        let isSevere = false;
        let alertTitle = '';
        let alertMessage = '';
        
        // Simple WMO code mapping
        if (code === 0) condition = 'Clear Sky';
        else if (code >= 1 && code <= 3) condition = 'Partly Cloudy';
        else if (code >= 45 && code <= 48) condition = 'Foggy';
        else if (code >= 51 && code <= 67) { condition = 'Rainy'; isRaining = true; }
        else if (code >= 71 && code <= 77) { 
            condition = 'Snow'; 
            isRaining = true;
            isSevere = true;
            alertTitle = 'Snow Alert';
            alertMessage = 'Protect sensitive crops from frost/snow.';
        }
        else if (code >= 80 && code <= 82) { 
            condition = 'Heavy Rain'; 
            isRaining = true;
            isSevere = true;
            alertTitle = 'Heavy Rain Warning';
            alertMessage = 'Risk of flooding. Clear drainage channels immediately.';
        }
        else if (code >= 95) { 
            condition = 'Thunderstorm'; 
            isRaining = true;
            isSevere = true;
            alertTitle = 'Severe Thunderstorm';
            alertMessage = 'Seek shelter. Secure livestock and equipment.';
        }
        else condition = 'Cloudy';

        // UV Index formatting
        const maxUv = daily.uv_index_max && daily.uv_index_max.length > 0 ? daily.uv_index_max[0] : 0;
        let uvLabel = 'Low';
        if (maxUv >= 3 && maxUv < 6) uvLabel = 'Mod';
        if (maxUv >= 6 && maxUv < 8) uvLabel = 'High';
        if (maxUv >= 8) uvLabel = 'Very High';

        setWeather({
          temp: Math.round(current.temperature_2m),
          condition,
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
          uvIndex: uvLabel,
          isRaining,
          isSevere,
          alertTitle,
          alertMessage,
          wmoCode: code
        });
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(true);
        setLoading(false);
      }
    };

    fetchWeather();
    
    // Refresh every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="text-accent" size={24} />;
    if (code >= 1 && code <= 3) return <CloudSun className="text-gray-500 dark:text-gray-400" size={24} />;
    if (code >= 51 && code <= 67) return <CloudRain className="text-blue-500" size={24} />;
    if (code >= 71 && code <= 77) return <CloudSnow className="text-blue-300" size={24} />;
    if (code >= 80) return <CloudRain className="text-blue-600" size={24} />;
    if (code >= 95) return <Zap className="text-amber-500" size={24} />;
    return <Cloud className="text-gray-400" size={24} />;
  };

  if (loading) {
     return (
        <div className="mx-6 -mt-8 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative z-20 flex justify-center items-center h-48 transition-colors duration-300">
             <Loader2 className="animate-spin text-primary" size={32} />
        </div>
     );
  }

  if (error || !weather) {
      return (
        <div className="mx-6 -mt-8 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 relative z-20 transition-colors duration-300">
             <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                 <p>Weather unavailable</p>
                 <button onClick={() => window.location.reload()} className="text-primary text-sm mt-2 font-medium">Retry</button>
             </div>
        </div>
      );
  }

  return (
    <div className="mx-6 -mt-8 relative z-20 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Prominent Severe Weather Banner */}
      {weather.isSevere && (
        <div className="bg-red-500 dark:bg-red-600 rounded-2xl p-4 shadow-lg mb-2 flex items-start gap-3 text-white relative overflow-hidden">
            <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-xl animate-pulse"></div>
            <div className="bg-white/20 p-2 rounded-full shrink-0 animate-bounce">
                <AlertTriangle size={24} className="text-white" />
            </div>
            <div className="relative z-10">
                <h3 className="font-bold text-base uppercase tracking-wide leading-tight">{weather.alertTitle}</h3>
                <p className="text-xs opacity-90 mt-1 font-medium">{weather.alertMessage}</p>
            </div>
        </div>
      )}

      {/* Standard Weather Card */}
      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 transition-colors duration-300 ${weather.isSevere ? 'border-t-0 rounded-t-none mt-[-8px]' : ''}`}>
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Weather & Alerts</p>
            <div className="flex items-center mt-1">
              <span className="text-3xl font-bold text-gray-800 dark:text-white">{weather.temp}°C</span>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">{weather.condition}</span>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-gray-700 p-3 rounded-full">
            {getWeatherIcon(weather.wmoCode)}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 flex flex-col items-center">
            <Droplets size={16} className="text-blue-500 mb-1" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Humidity</span>
            <span className="text-sm font-semibold dark:text-gray-200">{weather.humidity}%</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 flex flex-col items-center">
            <Wind size={16} className="text-gray-500 dark:text-gray-400 mb-1" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Wind</span>
            <span className="text-sm font-semibold dark:text-gray-200">{weather.windSpeed} km/h</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 flex flex-col items-center">
            <Sun size={16} className="text-accent mb-1" />
            <span className="text-xs text-gray-500 dark:text-gray-400">UV Index</span>
            <span className="text-sm font-semibold dark:text-gray-200">{weather.uvIndex}</span>
          </div>
        </div>

        {/* Regular Status Message (hidden if severe banner is shown to avoid clutter) */}
        {!weather.isSevere && (
          <div className={`p-3 rounded-lg flex items-start gap-3 transition-colors duration-300 ${
              weather.isRaining 
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50' 
                : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50'
            }`}>
            <div className={`p-1.5 rounded-full shrink-0 ${
                weather.isRaining 
                    ? 'bg-amber-100 dark:bg-amber-800' 
                    : 'bg-emerald-100 dark:bg-emerald-800'
                }`}>
              <AlertTriangle size={14} className={weather.isRaining ? 'text-amber-600 dark:text-amber-200' : 'text-emerald-600 dark:text-emerald-200'} />
            </div>
            <p className={`text-xs leading-snug ${weather.isRaining ? 'text-amber-900 dark:text-amber-100' : 'text-emerald-900 dark:text-emerald-100'}`}>
              {weather.isRaining 
                ? <span><strong>Notice:</strong> Rain detected. Ensure drainage channels are clear in low-lying fields.</span> 
                : <span><strong>Update:</strong> Weather is favorable. Good time for fertilizer application if soil moisture is right.</span> 
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherCard;
