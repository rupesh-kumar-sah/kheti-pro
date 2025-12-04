
import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Wind, Droplets, AlertTriangle, Cloud, CloudSun, Loader2, Zap, CloudSnow, Calendar, X, ArrowUp, ArrowDown, History, ChevronRight } from 'lucide-react';

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

interface DailyForecast {
  date: string;
  dayName: string;
  maxTemp: number;
  minTemp: number;
  rainSum: number;
  code: number;
  isPast: boolean;
  isToday: boolean;
}

const WeatherCard: React.FC = () => {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [dailyForecast, setDailyForecast] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Kathmandu Coordinates
        const lat = 27.7172;
        const long = 85.3240;
        
        // Fetch current + daily forecast (7 days future + 3 days past)
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max&timezone=auto&past_days=3`
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
        const todayIndex = 3; // Since we requested 3 past days, index 3 is today (0,1,2 are past)
        const maxUv = daily.uv_index_max && daily.uv_index_max.length > todayIndex ? daily.uv_index_max[todayIndex] : 0;
        let uvLabel = 'Low';
        if (maxUv >= 3 && maxUv < 6) uvLabel = 'Mod';
        if (maxUv >= 6 && maxUv < 8) uvLabel = 'High';
        if (maxUv >= 8) uvLabel = 'Very High';

        // Process Daily Forecast
        const processedDaily: DailyForecast[] = daily.time.map((time: string, index: number) => {
           const dateObj = new Date(time);
           const todayObj = new Date();
           todayObj.setHours(0,0,0,0);
           // Fix timezone offset for comparison if needed, but string comparison is safer for generic dates
           const isToday = time === todayObj.toISOString().split('T')[0];
           const isPast = new Date(time) < todayObj;

           return {
               date: time,
               dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
               maxTemp: Math.round(daily.temperature_2m_max[index]),
               minTemp: Math.round(daily.temperature_2m_min[index]),
               rainSum: daily.precipitation_sum[index],
               code: daily.weather_code[index],
               isPast,
               isToday
           };
        });

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
        setDailyForecast(processedDaily);
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

  const getWeatherIcon = (code: number, size = 24) => {
    if (code === 0) return <Sun className="text-accent" size={size} />;
    if (code >= 1 && code <= 3) return <CloudSun className="text-gray-500 dark:text-gray-400" size={size} />;
    if (code >= 45 && code <= 48) return <Wind className="text-gray-400" size={size} />;
    if (code >= 51 && code <= 67) return <CloudRain className="text-blue-500" size={size} />;
    if (code >= 71 && code <= 77) return <CloudSnow className="text-blue-300" size={size} />;
    if (code >= 80) return <CloudRain className="text-blue-600" size={size} />;
    if (code >= 95) return <Zap className="text-amber-500" size={size} />;
    return <Cloud className="text-gray-400" size={size} />;
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
    <>
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

        {/* Action Button for Extended Forecast */}
        <button 
            onClick={() => setShowForecastModal(true)}
            className="w-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition border border-emerald-100 dark:border-emerald-800/50"
        >
            <Calendar size={16} />
            View 7-Day Forecast & History
        </button>

        {/* Regular Status Message (hidden if severe banner is shown to avoid clutter) */}
        {!weather.isSevere && (
          <div className={`mt-3 p-3 rounded-lg flex items-start gap-3 transition-colors duration-300 ${
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

    {/* Detailed Forecast Modal */}
    {showForecastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">Weather Insights</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Historical data & Future planning</p>
                    </div>
                    <button 
                        onClick={() => setShowForecastModal(false)}
                        className="p-2 bg-white dark:bg-gray-700 rounded-full text-gray-500 hover:text-gray-800 dark:hover:text-white transition shadow-sm"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="overflow-y-auto p-4 space-y-6">
                    {/* Past Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3 px-2">
                            <History size={16} className="text-gray-400" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Past 3 Days</h4>
                        </div>
                        <div className="space-y-2">
                            {dailyForecast.filter(d => d.isPast).map((day) => (
                                <div key={day.date} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 opacity-70">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 text-center">
                                            <span className="block text-xs font-bold text-gray-600 dark:text-gray-300">{day.dayName}</span>
                                            <span className="block text-[10px] text-gray-400">{day.date.split('-').slice(1).join('/')}</span>
                                        </div>
                                        {getWeatherIcon(day.code, 20)}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 justify-end">
                                                <ArrowUp size={10} /> {day.maxTemp}°
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 justify-end">
                                                <ArrowDown size={10} /> {day.minTemp}°
                                            </div>
                                        </div>
                                        {day.rainSum > 0 && (
                                            <div className="flex flex-col items-center w-12">
                                                <Droplets size={12} className="text-blue-400 mb-0.5" />
                                                <span className="text-xs font-medium text-blue-600 dark:text-blue-300">{day.rainSum}mm</span>
                                            </div>
                                        )}
                                        {day.rainSum === 0 && <div className="w-12 text-center text-xs text-gray-300">-</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Future Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3 px-2">
                            <Calendar size={16} className="text-primary dark:text-emerald-400" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary dark:text-emerald-400">7-Day Forecast</h4>
                        </div>
                        <div className="space-y-2">
                            {dailyForecast.filter(d => !d.isPast).map((day) => (
                                <div 
                                    key={day.date} 
                                    className={`flex items-center justify-between p-3 rounded-xl border ${
                                        day.isToday 
                                        ? 'bg-white dark:bg-gray-800 border-primary dark:border-emerald-500 shadow-md ring-1 ring-primary/20' 
                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 text-center">
                                            <span className={`block text-xs font-bold ${day.isToday ? 'text-primary dark:text-emerald-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                                {day.isToday ? 'Today' : day.dayName}
                                            </span>
                                            <span className="block text-[10px] text-gray-400">{day.date.split('-').slice(1).join('/')}</span>
                                        </div>
                                        {getWeatherIcon(day.code, 24)}
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                         {/* Temp Range */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{day.maxTemp}°</span>
                                                <span className="text-[10px] text-gray-400">Max</span>
                                            </div>
                                            <div className="w-16 h-1 bg-gray-100 dark:bg-gray-700 rounded-full relative overflow-hidden">
                                                <div className="absolute inset-y-0 bg-gradient-to-r from-blue-300 to-red-300 opacity-50 w-full"></div>
                                            </div>
                                            <div className="flex flex-col items-start">
                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{day.minTemp}°</span>
                                                <span className="text-[10px] text-gray-400">Min</span>
                                            </div>
                                        </div>

                                        {/* Rain Indicator */}
                                        <div className="w-14 text-right">
                                            {day.rainSum > 0 ? (
                                                <div className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                                                    <Droplets size={10} className="text-blue-500" />
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-300">{day.rainSum}mm</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">Dry</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl flex gap-3 items-start text-xs text-blue-800 dark:text-blue-200">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <p>
                            <strong>Farmer's Note:</strong> Check wind speed and rain forecasts before spraying pesticides. Avoid spraying if rain is expected within 6 hours.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default WeatherCard;
