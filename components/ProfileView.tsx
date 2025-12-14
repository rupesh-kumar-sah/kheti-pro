
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, NotificationPreferences } from '../types';
import { User, MapPin, Sprout, Clock, Edit3, Save, X, Camera, Plus, Bell, CloudRain, TrendingUp, FileText, Sun, Landmark, ChevronDown, ChevronUp, Calendar, ExternalLink, Users, Moon, Fingerprint, LogOut, HelpCircle, MessageSquare } from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  onLogout: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, onUpdate, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [newCrop, setNewCrop] = useState('');
  const [expandedSchemeId, setExpandedSchemeId] = useState<number | null>(null);
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync formData if profile changes from parent
  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleSave = () => {
    // Prevent saving with empty name
    if (!formData.name.trim()) {
      alert("Name is required!");
      return; 
    }
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(profile);
    setNewCrop('');
    setIsEditing(false);
  };

  const handleAddCrop = () => {
    if (newCrop.trim()) {
      // Prevent duplicates
      if (!formData.crops.includes(newCrop.trim())) {
         setFormData(prev => ({
           ...prev,
           crops: [...prev.crops, newCrop.trim()]
         }));
      }
      setNewCrop('');
    }
  };

  const handleRemoveCrop = (cropToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      crops: prev.crops.filter(c => c !== cropToRemove)
    }));
  };
  
  const handleTogglePreference = (key: keyof NotificationPreferences) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: !prev.preferences[key]
      }
    }));
  };

  const handleToggleDarkMode = () => {
    const updated = { ...formData, darkMode: !formData.darkMode };
    setFormData(updated);
    // If not editing, apply immediately
    if (!isEditing) {
      onUpdate(updated);
    }
  };

  const handleToggleBiometric = () => {
    if (!formData.biometricLogin) {
      // Turning ON: Show scan simulation to "save" biometrics
      setShowBiometricModal(true);
      setTimeout(() => {
        setShowBiometricModal(false);
        // Generate a unique Biometric ID for this user session (Simulating a secure token)
        const uniqueBioId = `bio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Simulating hardware secure storage on the device
        try {
          localStorage.setItem('khetismart_device_biometric_id', uniqueBioId);
        } catch (e) {
          console.error("Failed to save biometric ID to device", e);
        }

        const updated = { 
          ...formData, 
          biometricLogin: true,
          biometricId: uniqueBioId // Link this ID to the user profile
        };
        setFormData(updated);
        if (!isEditing) onUpdate(updated);
      }, 2000);
    } else {
      // Turning OFF: Remove the ID and flag
      
      // Remove credential from device
      localStorage.removeItem('khetismart_device_biometric_id');

      const updated = { 
        ...formData, 
        biometricLogin: false,
        biometricId: undefined 
      };
      setFormData(updated);
      if (!isEditing) onUpdate(updated);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profilePicture: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCrop();
    }
  };
  
  const toggleScheme = (id: number) => {
    setExpandedSchemeId(prev => prev === id ? null : id);
  };

  const toggleFaq = (id: number) => {
    setExpandedFaqId(prev => prev === id ? null : id);
  };
  
  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    setShowLogoutDialog(false);
    onLogout();
  };

  const preferenceConfig: { key: keyof NotificationPreferences; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'weatherAlerts', label: 'Weather Alerts', icon: CloudRain, color: 'text-blue-500' },
    { key: 'marketPrices', label: 'Market Price Changes', icon: TrendingUp, color: 'text-emerald-500' },
    { key: 'schemeUpdates', label: 'Govt. Scheme Updates', icon: FileText, color: 'text-purple-500' },
    { key: 'dailyTips', label: 'Daily Farming Tips', icon: Sun, color: 'text-orange-500' },
  ];

  const schemes = [
    {
      id: 1,
      title: "PM Agriculture Modernization Project",
      description: "Subsidy for zone/super-zone farming infrastructure and equipment.",
      status: "Active",
      eligibility: "Registered farmer groups, cooperatives, or private firms with at least 1 hectare for vegetables/fruits.",
      deadline: "July 15, 2025",
      link: "https://pmamp.gov.np"
    },
    {
      id: 2,
      title: "Crop Insurance Subsidy",
      description: "75% government subsidy on insurance premiums for registered crops.",
      status: "Open",
      eligibility: "All farmers with crops listed in the government gazette. Must provide land ownership certificate.",
      deadline: "Ongoing (Apply before sowing)",
      link: "https://moald.gov.np"
    },
    {
      id: 3,
      title: "Chemical Fertilizer Subsidy",
      description: "Apply for subsidized Urea and DAP via your local ward office.",
      status: "Seasonal",
      eligibility: "Farmers with verified land holdings (Lalpurja). Limit: 3 sacks per season.",
      deadline: "May 30, 2025",
      link: "https://www.krishisamagri.gov.np/"
    }
  ];

  const faqs = [
    {
      id: 1,
      question: "How are market prices updated?",
      answer: "We fetch real-time data from the Kalimati Fruits and Vegetable Market Development Board and other trusted sources every hour to ensure accuracy."
    },
    {
      id: 2,
      question: "Is the Crop Doctor 100% accurate?",
      answer: "Our AI analysis provides a high-confidence diagnosis based on visual patterns, but we always recommend consulting with a local agricultural expert for critical issues."
    },
    {
      id: 3,
      question: "How do I apply for government schemes?",
      answer: "You can view eligibility details in the 'Government Schemes' section above and follow the official links provided to apply directly through the government portals."
    }
  ];

  return (
     <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors duration-300 relative">
        {/* Header Banner */}
        <div className="bg-primary dark:bg-emerald-800 h-48 relative rounded-b-[2.5rem] shadow-md overflow-hidden transition-colors duration-300">
             <div className="absolute inset-0 bg-secondary/20 dark:bg-black/30"></div>
             {/* Decorative circles */}
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
             <div className="absolute bottom-10 left-10 w-20 h-20 bg-white/10 rounded-full"></div>
        </div>

        {/* Profile Content Container */}
        <div className="px-6 relative -mt-20">
            {/* Avatar & Edit Button */}
            <div className="flex justify-between items-end mb-4">
                <div className="relative">
                    <div className="w-28 h-28 bg-white dark:bg-gray-800 p-1 rounded-full shadow-lg transition-colors duration-300">
                        <div className="w-full h-full bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 overflow-hidden">
                             {formData.profilePicture ? (
                               <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                             ) : (
                               <User size={48} />
                             )}
                        </div>
                    </div>
                    {isEditing && (
                        <>
                          <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute bottom-0 right-0 bg-secondary text-white p-2 rounded-full shadow-md hover:bg-emerald-800 transition" 
                              aria-label="Change profile picture"
                          >
                              <Camera size={16} />
                          </button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                          />
                        </>
                    )}
                </div>
                
                {!isEditing ? (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="mb-2 flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm text-sm font-semibold text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        <Edit3 size={16} /> Edit Profile
                    </button>
                ) : (
                    <div className="flex gap-2 mb-2">
                        <button 
                             onClick={handleCancel}
                             className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm text-red-500 border border-gray-100 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                             aria-label="Cancel editing"
                        >
                            <X size={20} />
                        </button>
                        <button 
                             onClick={handleSave}
                             className="bg-primary p-2 rounded-full shadow-sm text-white hover:bg-emerald-600 transition"
                             aria-label="Save changes"
                        >
                            <Save size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Profile Details */}
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Name & Location Section (In-place Editing) */}
                <div className="text-center sm:text-left mt-2 min-h-[80px]">
                    {isEditing ? (
                        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200 max-w-xs mx-auto sm:mx-0">
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full text-center sm:text-left text-2xl font-bold bg-transparent border-b-2 border-emerald-200 dark:border-emerald-800 focus:border-primary outline-none text-gray-900 dark:text-white placeholder-gray-400 py-1 transition-all"
                                placeholder="Your Name"
                            />
                            <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-500 dark:text-gray-400">
                                <MapPin size={16} className="shrink-0" />
                                <input 
                                    type="text" 
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                    className="w-full text-sm bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-primary outline-none text-gray-600 dark:text-gray-300 placeholder-gray-400 py-0.5 transition-all"
                                    placeholder="Your Location"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-300 py-1">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{formData.name}</h1>
                            <div className="flex items-center justify-center sm:justify-start gap-1 text-gray-500 dark:text-gray-400 mt-1">
                                <MapPin size={14} />
                                <span className="text-sm">{formData.location}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center transition-colors">
                        <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded-full mb-2 text-orange-600 dark:text-orange-400">
                             <Clock size={20} />
                        </div>
                        {isEditing ? (
                             <div className="flex flex-col items-center">
                                <label className="text-[10px] text-gray-400 mb-1">Years</label>
                                <div className="flex items-center gap-1">
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={formData.experienceYears}
                                        onChange={(e) => setFormData({...formData, experienceYears: Math.max(0, parseInt(e.target.value) || 0)})}
                                        className="w-16 p-1 text-center border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Yrs</span>
                                </div>
                             </div>
                        ) : (
                             <>
                                <span className="text-xl font-bold text-gray-800 dark:text-white">{formData.experienceYears} Years</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Farming Experience</span>
                             </>
                        )}
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center transition-colors">
                         <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-full mb-2 text-emerald-600 dark:text-emerald-400">
                             <Sprout size={20} />
                        </div>
                        <span className="text-xl font-bold text-gray-800 dark:text-white">{formData.crops.length}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Crops Managed</span>
                    </div>
                </div>

                {/* Preferred Crops Section */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <Sprout size={18} className="text-primary dark:text-emerald-400" />
                        <h3 className="font-bold text-gray-800 dark:text-white">Preferred Crops</h3>
                    </div>
                    
                    {isEditing ? (
                        <div className="space-y-4">
                            {/* Chip List for Deletion */}
                             <div className="flex flex-wrap gap-2">
                                {formData.crops.map((crop, index) => (
                                    <span key={index} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-600">
                                        {crop}
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveCrop(crop)}
                                            className="bg-gray-200 dark:bg-gray-600 rounded-full p-0.5 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500 transition"
                                            aria-label={`Remove ${crop}`}
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {/* Add New Crop Input */}
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newCrop}
                                    onChange={(e) => setNewCrop(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Add new crop..."
                                    className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                                    aria-label="Add new crop"
                                />
                                <button 
                                    type="button"
                                    onClick={handleAddCrop}
                                    disabled={!newCrop.trim()}
                                    className="bg-primary text-white p-2 rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    aria-label="Add crop"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {formData.crops.length > 0 ? (
                                formData.crops.map((crop, index) => (
                                    <span key={index} className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-sm font-medium border border-emerald-100 dark:border-emerald-900/50">
                                        {crop}
                                    </span>
                                ))
                            ) : (
                                <span className="text-gray-400 text-sm italic">No crops listed yet.</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Settings & Notifications Container */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                    
                    {/* Dark Mode Toggle */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <Moon size={16} />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Dark Mode</span>
                        </div>
                        <button 
                            type="button"
                            onClick={handleToggleDarkMode}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                                formData.darkMode ? 'bg-primary' : 'bg-gray-300'
                            }`}
                            aria-label="Toggle Dark Mode"
                            aria-pressed={formData.darkMode}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                                formData.darkMode ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>

                    {/* Biometric Login Toggle */}
                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <Fingerprint size={16} />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Biometric Login</span>
                        </div>
                        <button 
                            type="button"
                            onClick={handleToggleBiometric}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                                formData.biometricLogin ? 'bg-primary' : 'bg-gray-300'
                            }`}
                            aria-label="Toggle Biometric Login"
                            aria-pressed={formData.biometricLogin}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                                formData.biometricLogin ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <Bell size={18} className="text-primary dark:text-emerald-400" />
                        <h3 className="font-bold text-gray-800 dark:text-white">Notification Settings</h3>
                    </div>
                    
                    <div className="space-y-4">
                        {preferenceConfig.map(({ key, label, icon: Icon, color }) => (
                            <div key={key} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full bg-gray-50 dark:bg-gray-700 ${color}`}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
                                </div>
                                {isEditing ? (
                                    <button 
                                        type="button"
                                        onClick={() => handleTogglePreference(key)}
                                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                                            formData.preferences[key] ? 'bg-primary' : 'bg-gray-300'
                                        }`}
                                        aria-label={`Toggle ${label}`}
                                        aria-pressed={formData.preferences[key]}
                                    >
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                                            formData.preferences[key] ? 'translate-x-5' : 'translate-x-0'
                                        }`} />
                                    </button>
                                ) : (
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                                        formData.preferences[key] 
                                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                    }`}>
                                        {formData.preferences[key] ? 'On' : 'Off'}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Government Schemes Section */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                    <div className="flex items-center gap-2 mb-4">
                        <Landmark size={18} className="text-primary dark:text-emerald-400" />
                        <h3 className="font-bold text-gray-800 dark:text-white">Government Schemes</h3>
                    </div>
                    <div className="space-y-3">
                        {schemes.map((scheme) => (
                            <div 
                                key={scheme.id} 
                                onClick={() => toggleScheme(scheme.id)}
                                className={`border border-gray-100 dark:border-gray-700 rounded-lg p-3 transition-all cursor-pointer ${
                                    expandedSchemeId === scheme.id 
                                        ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 shadow-sm' 
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{scheme.title}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{scheme.description}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ml-2 ${
                                            scheme.status === 'Active' || scheme.status === 'Open' 
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                                        }`}>
                                            {scheme.status}
                                        </span>
                                        {expandedSchemeId === scheme.id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                    </div>
                                </div>
                                
                                {expandedSchemeId === scheme.id && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 space-y-3 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex gap-2 items-start">
                                            <Users size={14} className="text-gray-400 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Eligibility</span>
                                                <p className="text-xs leading-relaxed">{scheme.eligibility}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 items-start">
                                            <Calendar size={14} className="text-gray-400 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Deadline</span>
                                                <p className="text-xs leading-relaxed">{scheme.deadline}</p>
                                            </div>
                                        </div>

                                        <a 
                                            href={scheme.link} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center justify-center w-full mt-1 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 px-3 py-2 rounded-lg text-xs font-medium hover:bg-emerald-50 dark:hover:bg-gray-600 transition"
                                        >
                                            View Official Details <ExternalLink size={12} className="ml-1.5" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Support & Help Section */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                    <div className="flex items-center gap-2 mb-4">
                        <HelpCircle size={18} className="text-primary dark:text-emerald-400" />
                        <h3 className="font-bold text-gray-800 dark:text-white">Support & Help</h3>
                    </div>
                    
                    <div className="space-y-3">
                        {faqs.map((faq) => (
                            <div 
                                key={faq.id} 
                                onClick={() => toggleFaq(faq.id)}
                                className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{faq.question}</h4>
                                    {expandedFaqId === faq.id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                </div>
                                {expandedFaqId === faq.id && (
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed animate-in fade-in slide-in-from-top-1">
                                        {faq.answer}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Still have questions?</p>
                        <a 
                            href="mailto:support@khetismart.com"
                            className="flex items-center justify-center gap-2 w-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition border border-emerald-100 dark:border-emerald-800"
                        >
                            <MessageSquare size={16} /> Contact Support
                        </a>
                    </div>
                </div>

                {/* Log Out Button */}
                <div className="mt-8 mb-4">
                    <button 
                        onClick={handleLogoutClick}
                        className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-3 rounded-xl font-semibold border border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40 transition flex items-center justify-center gap-2"
                    >
                        <LogOut size={18} /> Log Out
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-3">App Version 1.0.0</p>
                </div>

            </div>
        </div>

        {/* Custom Logout Confirmation Dialog */}
        {showLogoutDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl transform scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Log Out?</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Are you sure you want to log out of your account?</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowLogoutDialog(false)}
                            className="flex-1 py-2.5 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmLogout}
                            className="flex-1 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition shadow-lg shadow-red-500/30"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Biometric Setup Simulation Modal */}
        {showBiometricModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-gray-700">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75"></div>
                        <div className="bg-emerald-100 dark:bg-emerald-900/50 p-6 rounded-full relative z-10 text-primary dark:text-emerald-400">
                            <Fingerprint size={48} strokeWidth={1.5} />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Scanning Fingerprint</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                        Binding biometric credentials securely to your ID...
                    </p>
                </div>
            </div>
        )}
     </div>
  );
};

export default ProfileView;
