import React, { useState } from 'react';
import FarmingView from './FarmingView';
import DoctorView from './DoctorView';
import { BookOpen, Stethoscope } from 'lucide-react';

const FarmAndDoctorView: React.FC<{ userId: string }> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<'farming' | 'doctor'>('farming');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 pt-4 transition-colors duration-300">
      <div className="px-4 mb-2">
          <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('farming')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition ${
                activeTab === 'farming' ? 'bg-primary text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <BookOpen size={18} /> Guide
            </button>
            <button
              onClick={() => setActiveTab('doctor')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition ${
                activeTab === 'doctor' ? 'bg-primary text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Stethoscope size={18} /> Doctor
            </button>
          </div>
      </div>

      <div className="-mt-4">
        {/* We use negative margin to counteract the inner padding of FarmingView and DoctorView, 
            or they will look naturally integrated since they have transparent bg mostly */}
        <div className={activeTab === 'farming' ? 'block' : 'hidden'}>
            <FarmingView />
        </div>
        <div className={activeTab === 'doctor' ? 'block' : 'hidden'}>
            <DoctorView userId={userId} />
        </div>
      </div>
    </div>
  );
};

export default FarmAndDoctorView;
