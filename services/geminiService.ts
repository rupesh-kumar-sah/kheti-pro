import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { MarketItem, HistoricalPrice } from "../types";

// Safer access to process.env to prevent "white screen" crashes in browser/Vite
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || '';
    }
    // Fallback if window.process is polyfilled
    if (typeof window !== 'undefined' && (window as any).process?.env) {
      return (window as any).process.env.API_KEY || '';
    }
    return '';
  } catch (e) {
    return '';
  }
};

const API_KEY = getApiKey();
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Using Gemini 2.5 Flash for maximum speed and responsiveness
const MODEL_FAST = 'gemini-2.5-flash';

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
  GUIDE: 7 * 24 * 60 * 60 * 1000, // 7 Days (farming guides rarely change)
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

// Helper for safe JSON parsing
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

// Helper to encode image file to base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const getFarmingAdvice = async (prompt: string): Promise<string> => {
  // Cache by prompt hash for instant repeat queries
  const cacheKey = `${CACHE_KEYS.ADVICE_PREFIX}${hashString(prompt.trim().toLowerCase())}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = safeJsonParse<{ timestamp: number; data: string } | null>(cached, null);
      if (parsed && Date.now() - parsed.timestamp < CACHE_DURATION.ADVICE) {
        return parsed.data;
      }
    }
  } catch { /* ignore cache read errors */ }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert agricultural consultant for Nepal named 'KhetiSmart Assistant'. Provide concise, practical advice for farmers in the Kathmandu Valley region. Use simple language.",
      }
    });
    const text = response.text || "Sorry, I couldn't generate advice at this moment.";
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: text }));
    } catch { /* storage full — ignore */ }
    return text;
  } catch (error) {
    console.error("Error fetching advice:", error);
    return "An error occurred while connecting to the farming database.";
  }
};

export const getFarmingGuide = async (cropName: string): Promise<string> => {
  // Cache guides by crop name (1 week) — they rarely change
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
  } catch { /* ignore cache read errors */ }

  try {
    const prompt = `
      Provide a detailed, step-by-step farming guide for "${cropName}" specifically for Nepal.
      
      You MUST write the response in **Nepali language** (Devanagari script).
      
      Include the following sections clearly:
      1. Suitable Season (उपयुक्त मौसम) & Time (समय)
      2. Weather & Climate Requirements (हावापानी)
      3. Soil Preparation (जमिनको तयारी)
      4. Sowing Method (रोप्ने तरिका)
      5. Irrigation & Fertilizer (सिँचाइ र मलखाद)
      6. Harvesting (बाली भित्र्याउने)
      
      Format using Markdown with bold headings. Keep it practical and easy for a farmer to understand.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
    });

    const text = response.text || "माफ गर्नुहोस्, जानकारी उपलब्ध हुन सकेन।";
    if (response.text) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: text }));
      } catch { /* storage full — ignore */ }
    }
    return text;
  } catch (error) {
    console.error("Error generating farming guide:", error);
    return "प्राविधिक समस्याको कारण जानकारी लोड गर्न सकिएन। कृपया पुनः प्रयास गर्नुहोस्।";
  }
};

export const analyzeCropHealth = async (imageFile: File): Promise<string> => {
  try {
    const imagePart = await fileToGenerativePart(imageFile);

    const prompt = `
यो बिरुवाको तस्बिर हेरेर नेपाली भाषामा (देवनागरी लिपिमा) चरणबद्ध रिपोर्ट बनाउनुहोस्।

तल दिइएको ढाँचामा Markdown प्रयोग गरी जवाफ दिनुहोस् — अरू केही नलेख्नुहोस्:

## बिरुवा पहिचान
(बिरुवाको नाम — नेपाली र अंग्रेजी दुवैमा)

## स्वास्थ्य अवस्था
(स्वस्थ छ कि छैन, रोग वा कमीको नाम छोटोमा)

## लक्षणहरू
- (देखिएका मुख्य लक्षण १)
- (लक्षण २)
- (लक्षण ३)

## सम्भावित कारण
- (कारण १)
- (कारण २)

## चरणबद्ध समाधान
1. (पहिलो चरण — आज नै गर्नुपर्ने काम)
2. (दोस्रो चरण)
3. (तेस्रो चरण)
4. (चौथो चरण)
5. (पाँचौँ चरण — फलोअप)

## जैविक/अर्गानिक उपचार
- (नेपालमा सजिलै पाइने सामग्रीबाट बनाउन सकिने उपचार)
- (अर्को विकल्प)

## रोकथाम (अर्को पटकका लागि)
- (रोकथामको उपाय)
- (रोकथामको उपाय)

नियमहरू:
- सरल नेपाली शब्द प्रयोग गर्नुहोस्।
- स्थानीय किसानले बुझ्ने उदाहरण दिनुहोस्।
- संख्याहरू र समय (जस्तै "७ दिन", "हप्तामा २ पटक") स्पष्ट लेख्नुहोस्।
- कुनै पनि शीर्षक खाली नछोड्नुहोस्।
`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: {
        parts: [
          imagePart,
          { text: prompt }
        ]
      }
    });

    return response.text || "माफ गर्नुहोस्, तस्बिर विश्लेषण गर्न सकिएन।";
  } catch (error) {
    console.error("Error analyzing crop:", error);
    return "तस्बिर विश्लेषण गर्न समस्या भयो। कृपया फेरि प्रयास गर्नुहोस्।";
  }
};

export const getMarketPrediction = async (cropName: string): Promise<string> => {
  // Check Cache
  const cacheKey = `${CACHE_KEYS.PREDICTION_PREFIX}${cropName}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    const parsed = safeJsonParse(cached, null) as { timestamp: number; data: string } | null;
    if (parsed && Date.now() - parsed.timestamp < CACHE_DURATION.PREDICTION) {
      return parsed.data;
    }
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Predict the market trend for ${cropName} in Kathmandu over the next week based on typical seasonal trends. Brief (max 50 words).`,
    });
    const prediction = response.text || "Prediction unavailable.";
    
    // Save to Cache
    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: prediction
    }));

    return prediction;
  } catch (error) {
    console.error("Error fetching prediction:", error);
    return "Could not fetch market prediction.";
  }
};

export const getRealMarketPrices = async (forceRefresh = false): Promise<{ items: MarketItem[], sources: {title: string, uri: string}[] }> => {
  // Check Cache if not forced
  if (!forceRefresh) {
    const cached = localStorage.getItem(CACHE_KEYS.MARKET_PRICES);
    if (cached) {
      const parsed = safeJsonParse(cached, null) as { timestamp: number; data: { items: MarketItem[], sources: any[] } } | null;
      if (parsed && Date.now() - parsed.timestamp < CACHE_DURATION.MARKET) {
        return parsed.data;
      }
    }
  }

  try {
    // Optimized prompt for speed and comprehensive coverage with Nepali names + staples
    const prompt = `
      Get current Nepal retail/wholesale prices. Use the "Daily Price List" from the
      "Kalimati Fruits and Vegetable Market Development Board" for vegetables, fruits and spices,
      and use Nepal grocery / Sajha / cooperative / agri-market data for staple grains and pulses.

      Return a COMPREHENSIVE list covering EVERY category below. Do NOT skip a category — if
      Kalimati does not list it, use the latest typical Nepal market retail price:

      1. Vegetables — potato, onion, tomato, cauliflower, cabbage, carrot, radish, brinjal,
         pumpkin, bottle gourd, bitter gourd, ladyfinger, beans, peas, spinach, mustard greens,
         broccoli, cucumber, capsicum, mushroom, etc. (ALL items on the Kalimati daily list)
      2. Fruits — apple, banana, orange, mango, papaya, guava, pineapple, grapes, watermelon,
         pomegranate, lime, lemon, pear, kiwi, litchi, etc.
      3. Grains/Cereals (STAPLES — always include these):
         - Rice varieties: Basmati rice, Jeera Masino rice, Sona Mansuli rice, Mansuli rice,
           Sun-dried rice (Usina chamal), Beaten rice (Chiura), Puffed rice (Bhuja)
         - Wheat (Gahun), Wheat flour (Atta / Pithho), Maida (refined flour), Sooji (semolina)
         - Maize (Makai), Maize flour, Millet (Kodo), Buckwheat (Phapar), Barley (Jau)
      4. Pulses/Dal (STAPLES — always include these):
         - Masoor dal (red lentil), Mung dal (green gram split), Mung whole, Chana dal,
           Chickpea (whole chana), Black gram (Kalo Maas), Toor/Arhar dal, Rajma (kidney beans),
           Soyabean, Bhatmas (white soybean), Black-eyed peas (Bodi)
      5. Spices — ginger, garlic, green chili, dry chili, turmeric (besar), cumin (jeera),
         coriander seed (dhania), fenugreek (methi), black pepper, cardamom (alaichi),
         cloves (lwang), cinnamon (dalchini), mustard seed, fennel seed.
      6. Cooking oils & basics (category "Other"): mustard oil, sunflower oil, soyabean oil,
         sugar, salt, jaggery (sakkhar/chaku), iodized salt — use typical Nepal retail price.

      Return a STRICT JSON Array. Schema:
      [{
        "id": "kebab-case-english-name",
        "name": "Item name in English",
        "nameNepali": "नेपाली नाम (item name in Devanagari/Nepali script)",
        "price": number (price in NPR — wholesale for Kalimati items, retail otherwise),
        "unit": "kg" | "litre" | "piece" | "dozen",
        "trend": "up" | "down" | "stable",
        "category": "Vegetable" | "Fruit" | "Grain" | "Pulse" | "Spice" | "Other"
      }]

      Instructions:
      1. Return at least 70-90 items. Cover EVERY category above. Pulses go in "Pulse" category, not "Grain".
      2. nameNepali is REQUIRED for every item, written in Devanagari script (e.g. आलु, चामल, मसुर दाल).
      3. For price use the "Average" Kalimati price for veg/fruit/spice; use typical Nepal market
         retail price (Bhatbhateni / Sajha / local cooperative range, midpoint) for staples and oils.
      4. For "trend": compare today's price with yesterday's / last week's. Use "up" if >2% higher,
         "down" if >2% lower, otherwise "stable". Do NOT default everything to "stable" — pick
         a realistic trend based on the data you find.
      5. Output RAW JSON ONLY. No markdown fences, no commentary.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let items: MarketItem[] = [];
    const text = response.text || "";
    
    // Attempt to extract JSON from the response robustly
    try {
      // Find the first '[' and last ']' to handle extra text
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      
      if (start !== -1 && end !== -1) {
        const jsonStr = text.substring(start, end + 1);
        items = JSON.parse(jsonStr);
      } else {
         // Fallback cleaning if brackets aren't clear
         const cleanText = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
         items = JSON.parse(cleanText);
      }
    } catch (e) {
      console.error("JSON Parse error:", e);
    }

    // Extract sources
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web)
      .filter((web: any) => web)
      .map((web: any) => ({ title: web.title, uri: web.uri })) || [];

    const result = { items, sources };

    // Cache the result if we got items
    if (items.length > 0) {
      localStorage.setItem(CACHE_KEYS.MARKET_PRICES, JSON.stringify({
        timestamp: Date.now(),
        data: result
      }));
    }

    return result;

  } catch (error) {
    console.error("Error fetching real market prices:", error);
    return { items: [], sources: [] };
  }
};

export const getHistoricalPrices = async (cropName: string): Promise<HistoricalPrice[]> => {
  // Check Cache
  const cacheKey = `${CACHE_KEYS.HISTORY_PREFIX}${cropName}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    const parsed = safeJsonParse(cached, null) as { timestamp: number; data: HistoricalPrice[] } | null;
    if (parsed && Date.now() - parsed.timestamp < CACHE_DURATION.HISTORY) {
      return parsed.data;
    }
  }

  try {
    const prompt = `
      Find wholesale prices for ${cropName} in Kathmandu (Kalimati) for the last 7 days.
      Output strictly a JSON array sorted by date:
      [{ "date": "MMM DD", "price": number }]
      
      No markdown.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "";
    let history: HistoricalPrice[] = [];

    try {
       const start = text.indexOf('[');
       const end = text.lastIndexOf(']');
       if (start !== -1 && end !== -1) {
          const jsonStr = text.substring(start, end + 1);
          history = JSON.parse(jsonStr);
       }
    } catch (e) {
      console.error("JSON Parse error (History):", e);
    }
    
    // Cache if we got data
    if (history.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: history
      }));
    }
    
    return history;
  } catch (error) {
    console.error("Error fetching historical prices:", error);
    return [];
  }
};

export const createChatSession = (): Chat => {
  return ai.chats.create({
    model: MODEL_FAST,
    config: {
      systemInstruction: `तपाईं नेपाली किसानहरूका लागि सहयोगी कृषि सल्लाहकार "KhetiSmart Assistant" हुनुहुन्छ।

नियमहरू:
- सधैं नेपाली भाषामा (देवनागरी लिपिमा) जवाफ दिनुहोस्।
- जवाफ Markdown ढाँचामा दिनुहोस्: छोटो परिचय, त्यसपछि "## चरणबद्ध समाधान" शीर्षक, त्यसपछि क्रमबद्ध (numbered) सूची ("1.", "2.", "3.") मा कदमहरू।
- आवश्यक भएमा "## सुझाव" वा "## सावधानी" जस्ता थप शीर्षक पनि राख्न सक्नुहुन्छ।
- नेपालको मौसम (मनसुन, हिउँद), बाली (धान, मकै, गहुँ, आलु, गोलभेँडा आदि) र स्थानीय अभ्यास ध्यानमा राख्नुहोस्।
- सरल, स्पष्ट र छोटो वाक्य प्रयोग गर्नुहोस्। हरेक चरणमा "के गर्ने" र "किन गर्ने" समावेश गर्नुहोस्।
- अनिश्चित जानकारी अनुमान नगर्नुहोस्; "स्थानीय कृषि कार्यालयलाई सोध्न" सुझाव दिन सक्नुहुन्छ।`,
    }
  });
};
