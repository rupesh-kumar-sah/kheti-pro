
export type ViewState = 'home' | 'market' | 'doctor' | 'guide' | 'profile';

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  alert?: string;
}

export interface MarketItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  category: 'Vegetable' | 'Fruit' | 'Grain' | 'Spice' | 'Other';
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
  darkMode: boolean;
  biometricLogin: boolean;
  preferences: NotificationPreferences;
}

export interface DiagnosisRecord {
  id: string;
  imageUrl: string;
  analysis: string;
  timestamp: number;
}