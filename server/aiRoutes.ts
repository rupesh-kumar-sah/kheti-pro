import express, { Request, Response, Router } from 'express';
import Groq from 'groq-sdk';

const MODEL_PRO = 'llama-3.3-70b-versatile';
const MODEL_FAST = 'llama-3.1-8b-instant';
const MODEL_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct';

function cleanJson(text: string): string {
  // Remove markdown code blocks if present
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  // Extract content between the first [ and last ]
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start !== -1 && end !== -1) {
    return clean.substring(start, end + 1);
  }
  return clean;
}


function getGroq(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("GROQ_API_KEY is missing in process.env");
    return null;
  }
  return new Groq({ apiKey });
}

function aiUnavailable(res: Response) {
  console.error("Missing Groq API Key");
  return res.status(500).json({ error: 'AI service not configured' });
}

// Retry wrapper for robust API handling with automatic model fallback
async function completionWithRetry(
  groq: Groq,
  options: Parameters<Groq.Chat.Completions['create']>[0],
  retries = 3
): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const completion = await groq.chat.completions.create(options);
      return completion.choices[0]?.message?.content || '';
    } catch (err: any) {
      const status = err?.status;
      const errMsg = err?.error?.error?.message || err?.message || '';
      
      // If we hit a daily token limit for a large model, fallback to the fast model instantly
      if (status === 429 && errMsg.includes('tokens per day') && options.model !== MODEL_FAST) {
        console.warn(`[Fallback] Daily token limit reached for ${options.model}. Switching to ${MODEL_FAST}.`);
        options.model = MODEL_FAST;
        attempt--; // Don't count this as a failed retry since we are changing strategies
        continue;
      }

      const isRetryable = status === 429 || status === 503 || status >= 500;
      if (isRetryable && attempt < retries) {
        const delayMs = attempt * 2000; // 2s, 4s, 6s
        console.warn(`Groq API error (${status}). Retrying in ${delayMs / 1000}s... (attempt ${attempt}/${retries})`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

async function chat(
  groq: Groq,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): Promise<string> {
  return completionWithRetry(groq, {
    model: MODEL_PRO,
    messages,
    temperature: 0.7,
    max_tokens: 4096,
  });
}

export function createAiRouter(): Router {
  const router = express.Router();
  router.use(express.json({ limit: '10mb' }));

  // ── Farming Advice ───────────────────────────────────────────────
  router.post('/farming-advice', async (req: Request, res: Response) => {
    const groq = getGroq();
    if (!groq) return aiUnavailable(res);
    const prompt: string = (req.body?.prompt || '').toString().slice(0, 4000);
    if (!prompt.trim()) return res.status(400).json({ error: 'prompt required' });
    try {
      const text = await chat(groq, [
        {
          role: 'system',
          content: "You are an expert agricultural consultant for Nepal named 'KhetiSmart Assistant'. Provide concise, practical advice for farmers in the Kathmandu Valley region. Use simple language.",
        },
        { role: 'user', content: prompt },
      ]);
      return res.json({ text });
    } catch (err) {
      console.error('farming-advice error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  // ── Farming Guide ────────────────────────────────────────────────
  router.post('/farming-guide', async (req: Request, res: Response) => {
    const groq = getGroq();
    if (!groq) return aiUnavailable(res);
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

Format using Markdown with bold headings. Keep it practical and easy for a farmer to understand.`;
      const text = await chat(groq, [{ role: 'user', content: prompt }]);
      return res.json({ text });
    } catch (err) {
      console.error('farming-guide error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  // ── Analyze Crop (Vision) ─────────────────────────────────────────
  router.post('/analyze-crop', async (req: Request, res: Response) => {
    const groq = getGroq();
    if (!groq) return aiUnavailable(res);
    const imageData: string = (req.body?.imageData || '').toString();
    const mimeType: string = (req.body?.mimeType || '').toString();
    if (!imageData || !mimeType) return res.status(400).json({ error: 'imageData and mimeType required' });
    if (!/^image\//.test(mimeType)) return res.status(400).json({ error: 'mimeType must be image/*' });
    if (imageData.length > 8 * 1024 * 1024) return res.status(413).json({ error: 'Image too large' });
    try {
      const prompt = `
यो बिरुवाको तस्बिर हेरेर नेपाली भाषामा (देवनागरी लिपिमा) चरणबद्ध रिपोर्ट बनाउनुहोस्।

तल दिइएको ढाँचामा Markdown प्रयोग गरी जवाफ दिनुहोस्:

## बिरुवा पहिचान
## स्वास्थ्य अवस्था
## लक्षणहरू
## सम्भावित कारण
## चरणबद्ध समाधान
## जैविक/अर्गानिक उपचार
## रोकथाम (अर्को पटकका लागि)`;

      const text = await completionWithRetry(groq, {
        model: MODEL_VISION,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageData}` } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      });
      return res.json({ text });
    } catch (err) {
      console.error('analyze-crop error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  // ── Market Prediction ─────────────────────────────────────────────
  router.post('/market-prediction', async (req: Request, res: Response) => {
    const groq = getGroq();
    if (!groq) return aiUnavailable(res);
    const cropName: string = (req.body?.cropName || '').toString().slice(0, 80);
    if (!cropName.trim()) return res.status(400).json({ error: 'cropName required' });
    try {
      const text = await completionWithRetry(groq, {
        model: MODEL_FAST,
        messages: [{ role: 'user', content: `Predict the market trend for ${cropName} in Kathmandu over the next week based on typical seasonal trends. Brief (max 50 words).` }],
      });
      return res.json({ text });
    } catch (err) {
      console.error('market-prediction error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  // ── Market Prices ─────────────────────────────────────────────────
  router.get('/market-prices', async (_req: Request, res: Response) => {
    const groq = getGroq();
    if (!groq) return aiUnavailable(res);
    try {
      const prompt = `
Generate a comprehensive list of current typical Nepal market retail/wholesale prices for the Kathmandu region.

Return a STRICT JSON Array with at least 50 items. Schema:
[{
  "id": "kebab-case-english-name",
  "name": "Item name in English",
  "nameNepali": "नेपाली नाम",
  "price": number (in NPR),
  "unit": "kg" | "litre" | "piece" | "dozen",
  "trend": "up" | "down" | "stable",
  "category": "Vegetable" | "Fruit" | "Grain" | "Pulse" | "Spice" | "Other"
}]

Cover: Vegetables, Fruits, Grains (rice, wheat, maize, millet), Pulses (dal varieties), Spices, Oils/Sugar/Salt.
Use realistic Nepal market prices. Output RAW JSON ONLY. No markdown fences, no commentary.`;

      console.log('Fetching market prices from Groq...');
      const text = await completionWithRetry(groq, {
        model: MODEL_FAST,
        messages: [{ role: 'user', content: prompt }],
      });
      console.log('Groq response received. Length:', text.length);
      
      let items: any[] = [];
      try {
        items = JSON.parse(cleanJson(text));
        console.log('Successfully parsed', items.length, 'items');
      } catch (e) {
        console.error('market-prices JSON parse error. Raw text starts with:', text.substring(0, 200));
      }
      
      if (!items || items.length === 0) {
        console.log('Returning fallback market data');
        items = [
          { id: 'potato', name: 'Potato', nameNepali: 'आलु', price: 45, unit: 'kg', trend: 'stable', category: 'Vegetable' },
          { id: 'tomato', name: 'Tomato', nameNepali: 'गोलभेडा', price: 60, unit: 'kg', trend: 'up', category: 'Vegetable' },
          { id: 'onion', name: 'Onion', nameNepali: 'प्याज', price: 80, unit: 'kg', trend: 'down', category: 'Vegetable' },
          { id: 'cauliflower', name: 'Cauliflower', nameNepali: 'काउली', price: 70, unit: 'kg', trend: 'up', category: 'Vegetable' },
          { id: 'rice', name: 'Basmati Rice', nameNepali: 'बासमती चामल', price: 110, unit: 'kg', trend: 'stable', category: 'Grain' }
        ];
      }
      
      return res.json({ items, sources: [] });
    } catch (err) {
      console.error('market-prices error:', err);
      return res.status(500).json({ error: 'AI market request failed' });
    }
  });

  // ── Historical Prices ─────────────────────────────────────────────
  router.post('/historical-prices', async (req: Request, res: Response) => {
    const groq = getGroq();
    if (!groq) return aiUnavailable(res);
    const cropName: string = (req.body?.cropName || '').toString().slice(0, 80);
    if (!cropName.trim()) return res.status(400).json({ error: 'cropName required' });
    try {
      const prompt = `
Generate typical wholesale price history for ${cropName} in Kathmandu (Kalimati) for the last 7 days.
Output strictly a JSON array sorted by date:
[{ "date": "MMM DD", "price": number }]
No markdown.`;
      const text = await completionWithRetry(groq, {
        model: MODEL_FAST,
        messages: [{ role: 'user', content: prompt }],
      });
      let history: any[] = [];
      try {
        history = JSON.parse(cleanJson(text));
      } catch (e) {
        console.error('historical-prices JSON parse error', e);
      }
      return res.json({ items: history });
    } catch (err) {
      console.error('historical-prices error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  // ── Chat ──────────────────────────────────────────────────────────
  const CHAT_SYSTEM = `तपाईं नेपाली किसानहरूका लागि सहयोगी कृषि सल्लाहकार "KhetiSmart Assistant" हुनुहुन्छ।
नियमहरू:
- सधैं नेपाली भाषामा (देवनागरी लिपिमा) जवाफ दिनुहोस्।
- जवाफ Markdown ढाँचामा दिनुहोस्।
- नेपालको मौसम, बाली र स्थानीय अभ्यास ध्यानमा राख्नुहोस्।
- सरल, स्पष्ट र छोटो वाक्य प्रयोग गर्नुहोस्।`;

  router.post('/chat', async (req: Request, res: Response) => {
    const groq = getGroq();
    if (!groq) return aiUnavailable(res);
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const message: string = (req.body?.message || '').toString().slice(0, 4000);
    if (!message.trim()) return res.status(400).json({ error: 'message required' });
    try {
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: CHAT_SYSTEM },
        ...history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string')
          .slice(-20)
          .map((m: any) => ({
            role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
            content: m.text.slice(0, 4000),
          })),
        { role: 'user', content: message },
      ];
      const text = await chat(groq, messages);
      return res.json({ text });
    } catch (err) {
      console.error('chat error', err);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  return router;
}
