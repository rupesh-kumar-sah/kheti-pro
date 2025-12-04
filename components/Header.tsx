
import React from 'react';
import { MapPin, Bell } from 'lucide-react';

const Header: React.FC = () => {
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
      
      <div className="flex items-center space-x-2 text-emerald-50 bg-secondary/30 dark:bg-black/20 w-fit px-3 py-1.5 rounded-full text-sm backdrop-blur-sm">
        <MapPin size={14} />
        <span>Kathmandu Valley</span>
      </div>
    </header>
  );
};

export default Header;