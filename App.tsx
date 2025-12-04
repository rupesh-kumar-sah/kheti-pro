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

// Helper for safe JSON parsing
function safeJsonParse<T>(jsonString: string | null, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("JSON Parse Error in App:", e);
    return fallback;
  }
}

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

  // Lazy initialization to synchronously read storage before render
  // This prevents the "flash" of light mode if dark mode is saved.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const session = localStorage.getItem('khetismart_session');
      if (session) {
        const parsedSession = safeJsonParse(session, null) as { phone: string } | null;
        if (parsedSession && parsedSession.phone) return true;
      }
    } catch (e) { console.error(e); }
    return false;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
     try {
      const session = localStorage.getItem('khetismart_session');
      if (session) {
        const parsedSession = safeJsonParse(session, null) as { phone: string } | null;
        return parsedSession?.phone || '';
      }
    } catch (e) { console.error(e); }
    return '';
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const session = localStorage.getItem('khetismart_session');
      if (session) {
        const parsedSession = safeJsonParse(session, null) as { phone: string } | null;
        if (parsedSession && parsedSession.phone) {
          const users = safeJsonParse(localStorage.getItem('khetismart_users'), {});
          if (users[parsedSession.phone]) {
            return users[parsedSession.phone].profile;
          }
        }
      }
    } catch (e) { console.error(e); }
    return DEFAULT_PROFILE;
  });

  // Effect to apply dark mode class based on state
  useEffect(() => {
    if (userProfile.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userProfile.darkMode]);

  // Persist profile updates to localStorage if authenticated
  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    
    // Update the record in localStorage using currentUserId
    if (currentUserId) {
      const users = safeJsonParse(localStorage.getItem('khetismart_users'), {});
      if (users[currentUserId]) {
        users[currentUserId].profile = updatedProfile;
        localStorage.setItem('khetismart_users', JSON.stringify(users));
      }
    }
  };

  const handleLoginSuccess = (profile: UserProfile, phone: string) => {
    localStorage.setItem('khetismart_session', JSON.stringify({ phone }));
    
    setUserProfile(profile);
    setCurrentUserId(phone);
    setIsAuthenticated(true);
    setCurrentView('home'); // Reset to home on login
  };

  const handleLogout = () => {
    localStorage.removeItem('khetismart_session');
    setIsAuthenticated(false);
    setCurrentUserId('');
    setUserProfile(DEFAULT_PROFILE);
    document.documentElement.classList.remove('dark');
  };

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