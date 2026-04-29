
import React, { useState, useEffect } from 'react';
import { Sprout, Phone, Lock, User, ArrowRight, Fingerprint, Loader2, Eye, EyeOff } from 'lucide-react';
import { UserProfile } from '../types';
import { login as apiLogin, signup as apiSignup } from '../services/authService';

interface LoginViewProps {
  onLogin: (profile: UserProfile, phone: string) => void;
}

type UserMap = Record<string, { profile: UserProfile & { biometricLogin?: boolean; biometricId?: string } }>;

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  
  // Biometric State
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  useEffect(() => {
    try {
      // Check if a previous user has enabled biometric login WITH a valid ID
      const lastUserPhone = localStorage.getItem('khetismart_last_user');
      if (lastUserPhone) {
        const users: UserMap = JSON.parse(localStorage.getItem('khetismart_users') || '{}');
        const user = users[lastUserPhone];
        
        const deviceBioId = localStorage.getItem('khetismart_device_biometric_id');

        // STRICT check: User must have biometricLogin=true AND a stored biometricId that matches device
        if (user && user.profile.biometricLogin && user.profile.biometricId && user.profile.biometricId === deviceBioId) {
          setCanUseBiometric(true);
          // Pre-fill phone for convenience
          setPhone(lastUserPhone);
        }
      }
    } catch (e) {
      console.error("Error initializing login view:", e);
      // Fallback safe state
      setCanUseBiometric(false);
    }
  }, []);

  const handleBiometricLogin = () => {
    setIsBiometricLoading(true);
    setError('');
    // Simulate biometric scan delay & ID verification
    setTimeout(() => {
      try {
        const lastUserPhone = localStorage.getItem('khetismart_last_user');
        if (lastUserPhone) {
          const users: UserMap = JSON.parse(localStorage.getItem('khetismart_users') || '{}');
          const user = users[lastUserPhone];
          const deviceBioId = localStorage.getItem('khetismart_device_biometric_id');
          
          // Verify the ID still exists in the user record (simulating secure enclave check)
          if (user && user.profile.biometricId && user.profile.biometricId === deviceBioId) {
            // Success: The biometric ID matches the user account
            onLogin(user.profile, lastUserPhone);
          } else {
              setError("Biometric verification failed. ID mismatch.");
              setIsBiometricLoading(false);
          }
        } else {
          setError("No biometric data found.");
          setIsBiometricLoading(false);
        }
      } catch (e) {
        setError("Login data corrupted. Please log in manually.");
        setIsBiometricLoading(false);
      }
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedPhone = phone.trim();
    const trimmedName = name.trim();

    if (!trimmedPhone || !password || (!isLogin && !trimmedName)) {
      setError('Please fill in all fields');
      return;
    }

    if (!/^\d{10}$/.test(trimmedPhone)) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    if (!isLogin) {
      if (password.length !== 8) {
        setError('Password must be exactly 8 characters');
        return;
      }
      if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        setError('Password must contain both letters and numbers');
        return;
      }
    }

    setLoading(true);
    try {
      const result = isLogin
        ? await apiLogin({ phone: trimmedPhone, password })
        : await apiSignup({
            phone: trimmedPhone,
            password,
            name: trimmedName,
            location: location.trim(),
          });

      localStorage.setItem('khetismart_last_user', result.phone);
      onLogin(result.profile, result.phone);
    } catch (err: any) {
      console.error('Auth error', err);
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-6 transition-colors duration-300">
      
      {/* Logo Section */}
      <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200 dark:shadow-none">
          <Sprout size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">KhetiSmart</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Your Smart Farming Companion</p>
      </div>

      {/* Auth Card */}
      <div className="bg-white dark:bg-gray-800 w-full max-w-md p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-500">
        <div className="flex justify-between items-center mb-8">
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
             {isLogin ? 'Welcome Back' : 'Create Account'}
           </h2>
           {isLogin && canUseBiometric && (
             <button 
                onClick={handleBiometricLogin}
                disabled={isBiometricLoading}
                className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-primary dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition border border-emerald-100 dark:border-emerald-800 relative overflow-hidden group"
                title="Login with Biometrics"
             >
                {isBiometricLoading ? (
                    <Loader2 size={24} className="animate-spin" />
                ) : (
                    <Fingerprint size={24} className="group-hover:scale-110 transition-transform" />
                )}
             </button>
           )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Sign Up: Name Field */}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase ml-1">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ram Bahadur"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900 dark:text-white"
                  required
                />
                <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
              </div>
            </div>
          )}

           {/* Sign Up: Location Field */}
           {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase ml-1">Location</label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Kathmandu, Nepal"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900 dark:text-white"
                />
                <div className="absolute left-4 top-3.5 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
              </div>
            </div>
          )}

          {/* Phone Field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase ml-1">Phone Number</label>
            <div className="relative">
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9800000000"
                autoComplete="tel"
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900 dark:text-white"
                required
              />
              <Phone className="absolute left-4 top-3.5 text-gray-400" size={20} />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase ml-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value.slice(0, 8))}
                maxLength={8}
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="w-full pl-11 pr-12 py-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900 dark:text-white"
                required
              />
              {!isLogin && (
                <p className="mt-1.5 ml-1 text-xs text-gray-500 dark:text-gray-400">
                  Must be exactly 8 characters with letters and numbers
                </p>
              )}
              <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg text-center animate-in fade-in slide-in-from-top-1">
                {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isBiometricLoading}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-600 hover:shadow-emerald-200 dark:hover:shadow-none transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? (
                <Loader2 size={24} className="animate-spin" />
            ) : (
                <>
                 {isLogin ? 'Login' : 'Create Account'}
                 <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
            )}
          </button>

          {/* Social Login Divider */}
          <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-semibold">Or continue with</span>
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={async () => {
              const { authClient } = await import('../services/neonAuth');
              await authClient.signIn.social({
                provider: "google",
                callbackURL: window.location.origin,
              });
            }}
            className="w-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3.5 rounded-xl font-bold text-sm shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button 
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="ml-2 font-bold text-primary hover:text-emerald-600 transition"
                >
                    {isLogin ? 'Sign Up' : 'Log In'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
