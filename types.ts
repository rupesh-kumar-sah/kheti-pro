
export type ViewState = 'home' | 'farming' | 'market' | 'community' | 'guide' | 'profile';

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  alert?: string;
}

export interface MarketItem {
  id: string;
  name: string;
  nameNepali?: string;
  price: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  category: 'Vegetable' | 'Fruit' | 'Grain' | 'Pulse' | 'Spice' | 'Other';
}

export interface HistoricalPrice {
  date: string;
  price: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface NotificationPreferences {
  weatherAlerts: boolean;
  marketPrices: boolean;
  schemeUpdates: boolean;
  dailyTips: boolean;
}

export interface UserProfile {
  name: string;
  location: string;
  experienceYears: number;
  crops: string[];
  tasks: string[];
  darkMode: boolean;
  biometricLogin: boolean;
  biometricId?: string; // Unique ID for specific biometric credential
  preferences: NotificationPreferences;
  profilePicture?: string;
}

export interface DiagnosisRecord {
  id: string;
  imageUrl: string;
  analysis: string;
  timestamp: number;
}

export interface UserAccount {
  password?: string;
  profile: UserProfile;
}

export interface UserMap {
  [phone: string]: UserAccount;
}

export interface Post {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
  is_draft: boolean;
  updated_at?: string;
  likes_count?: number;
  is_liked?: boolean;
}
