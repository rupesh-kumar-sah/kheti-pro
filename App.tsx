
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import HomeView from './components/HomeView';
import MarketView from './components/MarketView';
import DoctorView from './components/DoctorView';
import GuideView from './components/GuideView';
import ProfileView from './components/ProfileView';
import LoginView from './components/LoginView';
import FarmingView from './components/FarmingView';
import { ViewState, UserProfile } from './types';
import {
  fetchMe,
  saveProfile,
  clearSession,
  getStoredToken,
  getStoredPhone,
} from './services/authService';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Farmer',
  location: 'Nepal',
  experienceYears: 0,
  crops: [],
  darkMode: false,
  biometricLogin: false,
  preferences: {
    weatherAlerts: true,
    marketPrices: true,
    schemeUpdates: false,
    dailyTips: true
  }
};

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const hasToken = !!getStoredToken();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(hasToken);
  const [currentUserId, setCurrentUserId] = useState<string>(() => getStoredPhone() || '');
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [bootstrapping, setBootstrapping] = useState<boolean>(hasToken);

  // Restore session from server when a token exists
  useEffect(() => {
    let cancelled = false;
    if (!hasToken) {
      setBootstrapping(false);
      return;
    }
    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (me) {
          setUserProfile(me.profile);
          setCurrentUserId(me.phone);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setCurrentUserId('');
        }
      } catch (err) {
        console.error('Failed to restore session', err);
        clearSession();
        setIsAuthenticated(false);
        setCurrentUserId('');
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasToken]);

  // Effect to apply dark mode class based on state
  useEffect(() => {
    if (userProfile.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userProfile.darkMode]);

  // Persist profile updates to the database
  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    saveProfile(updatedProfile).catch((err) => {
      console.error('Failed to save profile', err);
    });
  };

  const handleLoginSuccess = (profile: UserProfile, phone: string) => {
    setUserProfile(profile);
    setCurrentUserId(phone);
    setIsAuthenticated(true);
    setCurrentView('home');
  };

  const handleLogout = () => {
    clearSession();
    setIsAuthenticated(false);
    setCurrentUserId('');
    setUserProfile(DEFAULT_PROFILE);
    document.documentElement.classList.remove('dark');
  };

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLoginSuccess} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView setView={setCurrentView} onOpenChat={() => setIsChatOpen(true)} />;
      case 'farming':
        return <FarmingView />;
      case 'market':
        return <MarketView />;
      case 'doctor':
        return <DoctorView userId={currentUserId} />;
      case 'profile':
        return <ProfileView profile={userProfile} onUpdate={handleProfileUpdate} onLogout={handleLogout} />;
      default:
        return <HomeView setView={setCurrentView} onOpenChat={() => setIsChatOpen(true)} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {renderView()}
      
      {/* Chat Overlay */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" 
                onClick={() => setIsChatOpen(false)}
            ></div>
            
            {/* Chat Box */}
            <div className="pointer-events-auto w-full sm:w-[400px] h-[85vh] sm:h-[600px] bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 z-50">
                <GuideView userId={currentUserId} onClose={() => setIsChatOpen(false)} />
            </div>
        </div>
      )}

      <Navigation currentView={currentView} setView={setCurrentView} />
    </div>
  );
}

export default App;
