import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { MarketItem, HistoricalPrice } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using Gemini 2.5 Flash for maximum speed and responsiveness
const MODEL_FAST = 'gemini-2.5-flash';

// Cache Configuration
const CACHE_KEYS = {
  MARKET_PRICES: 'khetismart_market_prices',
  HISTORY_PREFIX: 'khetismart_history_',
  PREDICTION_PREFIX: 'khetismart_prediction_'
};

const CACHE_DURATION = {
  MARKET: 60 * 60 * 1000,       // 1 Hour
  HISTORY: 24 * 60 * 60 * 1000, // 24 Hours
  PREDICTION: 6 * 60 * 60 * 1000 // 6 Hours
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
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert agricultural consultant for Nepal named 'KhetiSmart Assistant'. Provide concise, practical advice for farmers in the Kathmandu Valley region. Use simple language.",
      }
    });
    return response.text || "Sorry, I couldn't generate advice at this moment.";
  } catch (error) {
    console.error("Error fetching advice:", error);
    return "An error occurred while connecting to the farming database.";
  }
};

export const getFarmingGuide = async (cropName: string): Promise<string> => {
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

    return response.text || "माफ गर्नुहोस्, जानकारी उपलब्ध हुन सकेन।";
  } catch (error) {
    console.error("Error generating farming guide:", error);
    return "प्राविधिक समस्याको कारण जानकारी लोड गर्न सकिएन। कृपया पुनः प्रयास गर्नुहोस्।";
  }
};

export const analyzeCropHealth = async (imageFile: File): Promise<string> => {
  try {
    const imagePart = await fileToGenerativePart(imageFile);
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: {
        parts: [
          imagePart,
          { text: "Analyze this image of a crop. Identify the plant, any potential diseases or nutrient deficiencies, and suggest organic remedies suitable for Nepal. Format the output with clear headings." }
        ]
      }
    });

    return response.text || "Could not analyze the image.";
  } catch (error) {
    console.error("Error analyzing crop:", error);
    return "Failed to analyze the image. Please try again.";
  }
};

export const getMarketPrediction = async (cropName: string): Promise<string> => {
  // Check Cache
  const cacheKey = `${CACHE_KEYS.PREDICTION_PREFIX}${cropName}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION.PREDICTION) {
      return data;
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
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION.MARKET) {
        return data;
      }
    }
  }

  try {
    // Optimized prompt for speed and comprehensive coverage with categorization
    const prompt = `
      Access the current "Daily Price List" from the "Kalimati Fruits and Vegetable Market Development Board" website and other Nepal retail market sources if needed.
      
      Extract ALL available items. I need a comprehensive list including:
      1. Vegetables (Potato, Onion, Cauliflower, etc.)
      2. Fruits (Apple, Banana, Lime, etc.)
      3. Grains/Cereals (Rice, Lentils/Pulse, Wheat - if listed in daily reports)
      4. Spices (Ginger, Garlic, Chili)
      
      Return a STRICT JSON Array. Schema:
      [{ 
        "id": "kebab-case-name", 
        "name": "Item Name (English)", 
        "price": number (Average Wholesale Price in NPR), 
        "unit": "kg", 
        "trend": "stable",
        "category": "Vegetable" | "Fruit" | "Grain" | "Spice" | "Other"
      }]

      Instructions:
      1. Extract at least 50-70 items.
      2. Use the "Average" price.
      3. Classify each item into the correct category.
      4. Output raw JSON only.
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
    
    // Attempt to extract JSON from the response
    try {
      // Remove any markdown code blocks if present
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const start = cleanText.indexOf('[');
      const end = cleanText.lastIndexOf(']');
      
      if (start !== -1 && end !== -1) {
        const jsonStr = cleanText.substring(start, end + 1);
        items = JSON.parse(jsonStr);
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
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION.HISTORY) {
      return data;
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
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const start = cleanText.indexOf('[');
      const end = cleanText.lastIndexOf(']');
      
      if (start !== -1 && end !== -1) {
        const jsonStr = cleanText.substring(start, end + 1);
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
      systemInstruction: "You are a helpful farming assistant for Nepali farmers. You speak English but understand Nepali context (crops, seasons like Monsoon, Dashain). Keep answers helpful, short, and encouraging.",
      tools: [{ googleSearch: {} }],
    }
  });
};
