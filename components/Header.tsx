
import React, { useState } from 'react';
import { MapPin, Bell, Loader2, Navigation } from 'lucide-react';

const Header: React.FC = () => {
  const [locationName, setLocationName] = useState('Kathmandu Valley');
  const [loading, setLoading] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocoding using OpenStreetMap Nominatim (Free, no key required for client-side demo)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          // Robust address extraction
          const address = data.address;
          const newLocation = 
            address.city || 
            address.town || 
            address.village || 
            address.municipality ||
            address.county || 
            address.district ||
            address.state || 
            "Unknown Location";
          
          setLocationName(newLocation);
        } catch (error) {
          console.error("Failed to fetch address", error);
          // Fallback to coordinates if reverse geocoding fails
          setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error getting location", error);
        let msg = "Unable to retrieve location.";
        if (error.code === 1) msg = "Location permission denied. Please enable it in settings.";
        if (error.code === 2) msg = "Location unavailable.";
        if (error.code === 3) msg = "Location request timed out.";
        alert(msg);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <header className="bg-primary dark:bg-emerald-700 text-white p-6 pb-12 rounded-b-[2rem] shadow-md dark:shadow-gray-900 relative z-10 transition-colors duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-emerald-100 text-sm font-medium mb-1">Namaste 🙏</h2>
          <h1 className="text-2xl font-bold">Good Morning, Farmer!</h1>
        </div>
        <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
          <Bell size={20} className="text-white" />
        </button>
      </div>
      
      <button 
        onClick={handleGetLocation}
        disabled={loading}
        className="flex items-center space-x-2 text-emerald-50 bg-secondary/30 dark:bg-black/20 w-fit px-3 py-1.5 rounded-full text-sm backdrop-blur-sm hover:bg-secondary/40 active:bg-secondary/50 transition cursor-pointer border border-transparent hover:border-white/10"
        title="Update Location"
      >
        {loading ? (
           <Loader2 size={14} className="animate-spin" />
        ) : (
           <MapPin size={14} />
        )}
        <span className="font-medium">{locationName}</span>
        {!loading && <Navigation size={12} className="ml-1 opacity-75" />}
      </button>
    </header>
  );
};

export default Header;
