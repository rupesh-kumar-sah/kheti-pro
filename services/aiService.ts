import { MarketItem, HistoricalPrice, ChatMessage } from "../types";

// Cache Configuration
const CACHE_KEYS = {
  MARKET_PRICES: 'khetismart_market_prices_v2',
  HISTORY_PREFIX: 'khetismart_history_',
  PREDICTION_PREFIX: 'khetismart_prediction_',
  GUIDE_PREFIX: 'khetismart_guide_',
  ADVICE_PREFIX: 'khetismart_advice_'
};

const CACHE_DURATION = {
  MARKET: 60 * 60 * 1000,       // 1 Hour
  HISTORY: 24 * 60 * 60 * 1000, // 24 Hours
  PREDICTION: 6 * 60 * 60 * 1000, // 6 Hours
  GUIDE: 7 * 24 * 60 * 60 * 1000, // 7 Days
  ADVICE: 60 * 60 * 1000         // 1 Hour
};

// Simple FNV-1a hash for compact cache keys from prompts
const hashString = (s: string): string => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

const safeJsonParse = <T>(jsonString: string | null, fallback: T): T => {
  if (!jsonString) return fallback;
  try {
    const res = JSON.parse(jsonString);
    return res === null ? fallback : res;
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return fallback;
  }
};

async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) errMsg = data.error;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }
  return res.json() as Promise<T>;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) errMsg = data.error;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }
  return res.json() as Promise<T>;
}

// Helper to encode image file to base64 (without data: prefix)
export const fileToBase64 = async (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({ data: base64Data, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Backwards-compatible alias used elsewhere in the codebase
export const fileToGenerativePart = async (file: File) => {
  const { data, mimeType } = await fileToBase64(file);
  return { inlineData: { data, mimeType } };
};

export const getFarmingAdvice = async (prompt: string): Promise<string> => {
  const cacheKey = `${CACHE_KEYS.ADVICE_PREFIX}${hashString(prompt.trim().toLowerCase())}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = safeJsonParse<{ timestamp: number; data: string } | null>(cached, null);
      if (parsed && Date.now() - parsed.timestamp < CACHE_DURATION.ADVICE) {
        return parsed.data;
      }
    }
  } catch { /* ignore */ }

  try {
    const { text } = await postJson<{ text: string }>('/api/ai/farming-advice', { prompt });
    const result = text || "Sorry, I couldn't generate advice at this moment.";
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
    } catch { /* ignore */ }
    return result;
  } catch (error) {
    console.error("Error fetching advice:", error);
    return "An error occurred while connecting to the farming database.";
  }
};

export const getFarmingGuide = async (cropName: string): Promise<string> => {
  const normalized = cropName.trim().toLowerCase();
  const cacheKey = `${CACHE_KEYS.GUIDE_PREFIX}${hashString(normalized)}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = safeJsonParse<{ timestamp: number; data: string } | null>(cached, null);
      if (parsed && Date.now() - parsed.timestamp < CACHE_DURATION.GUIDE) {
        return parsed.data;
      }
    }
  } catch { /* ignore */ }

  try {
    const { text } = await postJson<{ text: string }>('/api/ai/farming-guide', { cropName });
    const result = text || "माफ गर्नुहोस्, जानकारी उपलब्ध हुन सकेन।";
    if (text) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
      } catch { /* ignore */ }
    }
    return result;
  } catch (error) {
    console.error("Error generating farming guide:", error);
    return "प्राविधिक समस्याको कारण जानकारी लोड गर्न सकिएन। कृपया पुनः प्रयास गर्नुहोस्।";
  }
};

export const analyzeCropHealth = async (imageFile: File): Promise<string> => {
  try {
    const { data, mimeType } = await fileToBase64(imageFile);
    const { text } = await postJson<{ text: string }>('/api/ai/analyze-crop', {
      imageData: data,
      mimeType,
    });
    return text || "माफ गर्नुहोस्, तस्बिर विश्लेषण गर्न सकिएन।";
  } catch (error) {
    console.error("Error analyzing crop:", error);
    return "तस्बिर विश्लेषण गर्न समस्या भयो। कृपया फेरि प्रयास गर्नुहोस्।";
  }
};

export const getMarketPrediction = async (cropName: string): Promise<string> => {
  const cacheKey = `${CACHE_KEYS.PREDICTION_PREFIX}${cropName}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const parsed = safeJsonParse(cached, null) as { timestamp: number; data: string } | null;
    if (parsed && Date.now() - parsed.timestamp < CACHE_DURATION.PREDICTION) {
      return parsed.data;
    }
  }

  try {
    const { text } = await postJson<{ text: string }>('/api/ai/market-prediction', { cropName });
    const prediction = text || "Prediction unavailable.";
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: prediction }));
    } catch { /* ignore */ }
    return prediction;
  } catch (error) {
    console.error("Error fetching prediction:", error);
    return "Could not fetch market prediction.";
  }
};

export const getRealMarketPrices = async (
  forceRefresh = false
): Promise<{ items: MarketItem[]; sources: { title: string; uri: string }[] }> => {
  if (!forceRefresh) {
    const cached = localStorage.getItem(CACHE_KEYS.MARKET_PRICES);
    if (cached) {
      const parsed = safeJsonParse(cached, null) as
        | { timestamp: number; data: { items: MarketItem[]; sources: any[] } }
        | null;
      if (parsed && Date.now() - parsed.timestamp < CACHE_DURATION.MARKET) {
        return parsed.data;
      }
    }
  }

  try {
    const result = await getJson<{ items: MarketItem[]; sources: { title: string; uri: string }[] }>(
      '/api/ai/market-prices'
    );
    if (result.items?.length > 0) {
      try {
        localStorage.setItem(
          CACHE_KEYS.MARKET_PRICES,
          JSON.stringify({ timestamp: Date.now(), data: result })
        );
      } catch { /* ignore */ }
    }
    return result;
  } catch (error) {
    console.error("Error fetching real market prices:", error);
    return { items: [], sources: [] };
  }
};

export const getHistoricalPrices = async (cropName: string): Promise<HistoricalPrice[]> => {
  const cacheKey = `${CACHE_KEYS.HISTORY_PREFIX}${cropName}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const parsed = safeJsonParse(cached, null) as { timestamp: number; data: HistoricalPrice[] } | null;
    if (parsed && Date.now() - parsed.timestamp < CACHE_DURATION.HISTORY) {
      return parsed.data;
    }
  }

  try {
    const { items } = await postJson<{ items: HistoricalPrice[] }>('/api/ai/historical-prices', { cropName });
    const history = items || [];
    if (history.length > 0) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: history }));
      } catch { /* ignore */ }
    }
    return history;
  } catch (error) {
    console.error("Error fetching historical prices:", error);
    return [];
  }
};

// Lightweight chat session that mimics the previous Chat API surface used in components.
export interface ChatSession {
  sendMessage: (args: { message: string }) => Promise<{ text: string }>;
}

export const createChatSession = (): ChatSession => {
  const history: Array<{ role: 'user' | 'model'; text: string }> = [];
  return {
    async sendMessage({ message }) {
      const { text } = await postJson<{ text: string }>('/api/ai/chat', {
        history: [...history],
        message,
      });
      const reply = text || '';
      history.push({ role: 'user', text: message });
      history.push({ role: 'model', text: reply });
      return { text: reply };
    },
  };
};
