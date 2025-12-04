import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import HomeView from './components/HomeView';
import MarketView from './components/MarketView';
import DoctorView from './components/DoctorView';
import GuideView from './components/GuideView';
import ProfileView from './components/ProfileView';
import LoginView from './components/LoginView';
import { ViewState, UserProfile } from './types';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [currentUserId, setCurrentUserId] = useState<string>(''); // Phone number serves as ID
  const [userProfile, setUserProfile] = useState<UserProfile>({
    // Default placeholder state
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
  });

  // Check for active session on load
  useEffect(() => {
    const session = localStorage.getItem('khetismart_session');
    if (session) {
      const { phone } = JSON.parse(session);
      const users = JSON.parse(localStorage.getItem('khetismart_users') || '{}');
      const user = users[phone];
      if (user) {
        setUserProfile(user.profile);
        setCurrentUserId(phone);
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Handle Dark Mode changes when profile updates
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
      const users = JSON.parse(localStorage.getItem('khetismart_users') || '{}');
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
    // Clear user profile to defaults to ensure no data leakage in state
    setUserProfile({
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
    });
    // Remove dark mode class if default is false (optional, but cleaner)
    document.documentElement.classList.remove('dark');
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLoginSuccess} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView setView={setCurrentView} />;
      case 'market':
        return <MarketView />;
      case 'doctor':
        return <DoctorView userId={currentUserId} />;
      case 'guide':
        return <GuideView userId={currentUserId} />;
      case 'profile':
        return <ProfileView profile={userProfile} onUpdate={handleProfileUpdate} onLogout={handleLogout} />;
      default:
        return <HomeView setView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {renderView()}
      <Navigation currentView={currentView} setView={setCurrentView} />
    </div>
  );
}

export default App;