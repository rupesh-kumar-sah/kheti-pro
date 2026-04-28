import express, { Request, Response, Router } from 'express';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

const MODEL_FAST = 'gemini-1.5-flash';

function getAi(): GoogleGenerativeAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

function aiUnavailable(res: Response) {
  console.error("Missing Gemini API Key");
  return res
    .status(500)
    .json({ error: 'AI service not configured' });
}

export function createAiRouter(): Router {
  const router = express.Router();

  router.use(express.json({ limit: '10mb' }));

  router.post('/farming-advice', async (req: Request, res: Response) => {
    const ai = getAi();
    if (!ai) return aiUnavailable(res);
    const prompt: string = (req.body?.prompt || '').toString().slice(0, 4000);
    if (!prompt.trim()) return res.status(400).json({ error: 'prompt required' });
    try {
      const model = ai.getGenerativeModel({
        model: MODEL_FAST,
        systemInstruction: "You are an expert agricultural consultant for Nepal named 'KhetiSmart Assistant'. Provide concise, practical advice for farmers in the Kathmandu Valley region. Use simple language.",
      });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return res.json({ text: response.text() || '' });
    } catch (err) {
      console.error('farming-advice error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  router.post('/farming-guide', async (req: Request, res: Response) => {
    const ai = getAi();
    if (!ai) return aiUnavailable(res);
    const cropName: string = (req.body?.cropName || '').toString().slice(0, 80);
    if (!cropName.trim()) return res.status(400).json({ error: 'cropName required' });
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
      const model = ai.getGenerativeModel({ model: MODEL_FAST });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return res.json({ text: response.text() || '' });
    } catch (err) {
      console.error('farming-guide error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  router.post('/analyze-crop', async (req: Request, res: Response) => {
    const ai = getAi();
    if (!ai) return aiUnavailable(res);
    const imageData: string = (req.body?.imageData || '').toString();
    const mimeType: string = (req.body?.mimeType || '').toString();
    if (!imageData || !mimeType) {
      return res.status(400).json({ error: 'imageData and mimeType required' });
    }
    if (!/^image\//.test(mimeType)) {
      return res.status(400).json({ error: 'mimeType must be image/*' });
    }
    if (imageData.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image too large' });
    }
    try {
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
      const model = ai.getGenerativeModel({ model: MODEL_FAST });
      const result = await model.generateContent([
        { inlineData: { data: imageData, mimeType } },
        { text: prompt },
      ]);
      const response = await result.response;
      return res.json({ text: response.text() || '' });
    } catch (err) {
      console.error('analyze-crop error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  router.post('/market-prediction', async (req: Request, res: Response) => {
    const ai = getAi();
    if (!ai) return aiUnavailable(res);
    const cropName: string = (req.body?.cropName || '').toString().slice(0, 80);
    if (!cropName.trim()) return res.status(400).json({ error: 'cropName required' });
    try {
      const model = ai.getGenerativeModel({ model: MODEL_FAST });
      const result = await model.generateContent(`Predict the market trend for ${cropName} in Kathmandu over the next week based on typical seasonal trends. Brief (max 50 words).`);
      const response = await result.response;
      return res.json({ text: response.text() || '' });
    } catch (err) {
      console.error('market-prediction error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  router.get('/market-prices', async (_req: Request, res: Response) => {
    const ai = getAi();
    if (!ai) return aiUnavailable(res);
    try {
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
      const model = ai.getGenerativeModel({
        model: MODEL_FAST,
        tools: [{ googleSearchRetrieval: {} } as any],
      });
      const result = await model.generateContent(prompt);
      const response = await result.response;

      const text = response.text() || '';
      let items: any[] = [];
      try {
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
          items = JSON.parse(text.substring(start, end + 1));
        } else {
          const cleanText = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
          items = JSON.parse(cleanText);
        }
      } catch (e) {
        console.error('market-prices JSON parse error', e);
      }

      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter((web: any) => web)
        .map((web: any) => ({ title: web.title, uri: web.uri })) || [];

      return res.json({ items, sources });
    } catch (err) {
      console.error('market-prices error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  router.post('/historical-prices', async (req: Request, res: Response) => {
    const ai = getAi();
    if (!ai) return aiUnavailable(res);
    const cropName: string = (req.body?.cropName || '').toString().slice(0, 80);
    if (!cropName.trim()) return res.status(400).json({ error: 'cropName required' });
    try {
      const prompt = `
Find wholesale prices for ${cropName} in Kathmandu (Kalimati) for the last 7 days.
Output strictly a JSON array sorted by date:
[{ "date": "MMM DD", "price": number }]

No markdown.
      `;
      const model = ai.getGenerativeModel({
        model: MODEL_FAST,
        tools: [{ googleSearchRetrieval: {} } as any],
      });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text() || '';
      let history: any[] = [];
      try {
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
          history = JSON.parse(text.substring(start, end + 1));
        }
      } catch (e) {
        console.error('historical-prices JSON parse error', e);
      }
      return res.json({ items: history });
    } catch (err) {
      console.error('historical-prices error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  const CHAT_SYSTEM_INSTRUCTION = `तपाईं नेपाली किसानहरूका लागि सहयोगी कृषि सल्लाहकार "KhetiSmart Assistant" हुनुहुन्छ।

नियमहरू:
- सधैं नेपाली भाषामा (देवनागरी लिपिमा) जवाफ दिनुहोस्।
- जवाफ Markdown ढाँचामा दिनुहोस्: छोटो परिचय, त्यसपछि "## चरणबद्ध समाधान" शीर्षक, त्यसपछि क्रमबद्ध (numbered) सूची ("1.", "2.", "3.") मा कदमहरू।
- आवश्यक भएमा "## सुझाव" वा "## सावधानी" जस्ता थप शीर्षक पनि राख्न सक्नुहुन्छ।
- नेपालको मौसम (मनसुन, हिउँद), बाली (धान, मकै, गहुँ, आलु, गोलभेँडा आदि) र स्थानीय अभ्यास ध्यानमा राख्नुहोस्।
- सरल, स्पष्ट र छोटो वाक्य प्रयोग गर्नुहोस्। हरेक चरणमा "के गर्ने" र "किन गर्ने" समावेश गर्नुहोस्।
- अनिश्चित जानकारी अनुमान नगर्नुहोस्; "स्थानीय कृषि कार्यालयलाई सोध्न" सुझाव दिन सक्नुहुन्छ।`;

  router.post('/chat', async (req: Request, res: Response) => {
    const ai = getAi();
    if (!ai) return aiUnavailable(res);
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const message: string = (req.body?.message || '').toString().slice(0, 4000);
    if (!message.trim()) return res.status(400).json({ error: 'message required' });

    try {
      const chat = ai.getGenerativeModel({
        model: MODEL_FAST,
        systemInstruction: CHAT_SYSTEM_INSTRUCTION,
      }).startChat({
        history: history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string')
          .slice(-30)
          .map((m: any) => ({ role: m.role, parts: [{ text: m.text.slice(0, 4000) }] })),
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return res.json({ text: response.text() || '' });
    } catch (err) {
      console.error('chat error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  return router;
}
