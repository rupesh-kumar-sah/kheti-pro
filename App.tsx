
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import Navigation from './components/Navigation';
import HomeView from './components/HomeView';
import LoginView from './components/LoginView';
import InstallPrompt from './components/InstallPrompt';

const MarketView = lazy(() => import('./components/MarketView'));
const FarmAndDoctorView = lazy(() => import('./components/FarmAndDoctorView'));
const GuideView = lazy(() => import('./components/GuideView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const CommunityView = lazy(() => import('./components/CommunityView'));
import { ViewState, UserProfile } from './types';
import {
  fetchMe,
  saveProfile,
  clearSession,
  getStoredToken,
  getStoredPhone,
} from './services/authService';
import {
  detectLocation,
  ensureLocation,
  getLocation,
} from './services/locationService';
import {
  syncPermissionWithPreferences,
  maybeShowDailyTip,
  maybeShowSchemeUpdate,
} from './services/notificationService';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Farmer',
  location: 'Nepal',
  experienceYears: 0,
  crops: [],
  tasks: [],
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
  const locationInitRef = useRef(false);

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

  // Initialise location once authenticated.
  useEffect(() => {
    if (!isAuthenticated || locationInitRef.current) return;
    locationInitRef.current = true;
    (async () => {
      // First seed from profile (geocode the textual location) so weather isn't stuck on Kathmandu.
      try {
        await ensureLocation(userProfile.location);
      } catch (err) {
        console.warn('ensureLocation failed', err);
      }
      // Then quietly try GPS for the most accurate coordinates.
      try {
        await detectLocation();
      } catch {
        // user may have denied — current cached/profile location is fine.
      }
    })();
  }, [isAuthenticated, userProfile.location]);

  // React to notification preference changes: ask for permission and fire pending notifications.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      const perm = await syncPermissionWithPreferences(userProfile.preferences);
      if (cancelled || perm !== 'granted') return;
      maybeShowDailyTip(userProfile.preferences);
      maybeShowSchemeUpdate(userProfile.preferences);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    userProfile.preferences.weatherAlerts,
    userProfile.preferences.marketPrices,
    userProfile.preferences.schemeUpdates,
    userProfile.preferences.dailyTips,
  ]);

  const profileSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Persist profile updates to the database with 1s debouncing
  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    // 1. Update UI state immediately (Optimistic UI)
    setUserProfile(updatedProfile);

    // 2. Clear pending save
    if (profileSaveTimeoutRef.current) {
      clearTimeout(profileSaveTimeoutRef.current);
    }

    // 3. Schedule save after 1 second of inactivity
    profileSaveTimeoutRef.current = setTimeout(() => {
      saveProfile(updatedProfile).catch((err) => {
        console.error('Background profile save failed:', err);
      });
    }, 1000);
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
    locationInitRef.current = false;
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
        return (
          <HomeView
            setView={setCurrentView}
            onOpenChat={() => setIsChatOpen(true)}
            userName={userProfile.name}
            notificationPrefs={userProfile.preferences}
          />
        );
      case 'farming':
        return <FarmAndDoctorView userId={currentUserId} />;
      case 'market':
        return <MarketView notificationPrefs={userProfile.preferences} />;
      case 'community':
        return <CommunityView userId={currentUserId} />;
      case 'profile':
        return <ProfileView profile={userProfile} onUpdate={handleProfileUpdate} onLogout={handleLogout} />;
      default:
        return (
          <HomeView
            setView={setCurrentView}
            onOpenChat={() => setIsChatOpen(true)}
            userName={userProfile.name}
            notificationPrefs={userProfile.preferences}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Suspense fallback={<div className="flex items-center justify-center min-h-[80vh]"><div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-primary animate-spin" /></div>}>
        {renderView()}
      </Suspense>
      
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
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-primary animate-spin" /></div>}>
                  <GuideView userId={currentUserId} onClose={() => setIsChatOpen(false)} />
                </Suspense>
            </div>
        </div>
      )}

      <Navigation currentView={currentView} setView={setCurrentView} />

      {/* PWA install prompt — hides itself on desktop and when already installed */}
      <InstallPrompt />
    </div>
  );
}

export default App;
