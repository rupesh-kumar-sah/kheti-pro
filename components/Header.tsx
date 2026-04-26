
import React, { useEffect, useState } from 'react';
import { MapPin, Bell, Loader2, Navigation } from 'lucide-react';
import {
  detectLocation,
  getLocation,
  subscribeLocation,
  LocationInfo,
} from '../services/locationService';

interface HeaderProps {
  userName?: string;
}

const greetingFor = (date = new Date()): string => {
  const h = date.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const Header: React.FC<HeaderProps> = ({ userName }) => {
  const [location, setLocationState] = useState<LocationInfo>(getLocation());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeLocation((loc) => setLocationState(loc));
    return () => unsub();
  }, []);

  const handleGetLocation = async () => {
    setError(null);
    setLoading(true);
    try {
      await detectLocation();
    } catch (err: any) {
      setError(err?.message || 'Unable to retrieve location.');
    } finally {
      setLoading(false);
    }
  };

  const greeting = greetingFor();
  const displayName = userName?.trim() || 'Farmer';

  return (
    <header className="bg-primary dark:bg-emerald-700 text-white p-6 pb-12 rounded-b-[2rem] shadow-md dark:shadow-gray-900 relative z-10 transition-colors duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-emerald-100 text-sm font-medium mb-1">Namaste 🙏</h2>
          <h1 className="text-2xl font-bold">{greeting}, {displayName}!</h1>
        </div>
        <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition" aria-label="Notifications">
          <Bell size={20} className="text-white" />
        </button>
      </div>

      <button
        onClick={handleGetLocation}
        disabled={loading}
        className="flex items-center space-x-2 text-emerald-50 bg-secondary/30 dark:bg-black/20 w-fit px-3 py-1.5 rounded-full text-sm backdrop-blur-sm hover:bg-secondary/40 active:bg-secondary/50 transition cursor-pointer border border-transparent hover:border-white/10"
        title="Update Location"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
        <span className="font-medium truncate max-w-[200px]">{location.name}</span>
        {!loading && <Navigation size={12} className="ml-1 opacity-75" />}
      </button>

      {error && (
        <p className="mt-2 text-xs text-amber-100 bg-amber-500/30 px-3 py-1 rounded-full w-fit">{error}</p>
      )}
    </header>
  );
};

export default Header;
