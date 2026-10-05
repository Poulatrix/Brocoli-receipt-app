import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { renderWidgetHtml, WidgetMealData } from "./src/lib/widgetRenderer";
import { getDishImage } from "./src/lib/dishImages";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];

async function generateGeminiContentWithFallback(ai: GoogleGenAI, requestPayload: any): Promise<any> {
  let lastError: any = null;
  for (const model of GEMINI_MODELS) {
    try {
      return await ai.models.generateContent({
        ...requestPayload,
        model,
      });
    } catch (err: any) {
      lastError = err;
      const isAuthOrLeaked = err?.message?.includes("leaked") || err?.message?.includes("PERMISSION_DENIED") || err?.status === 403;
      if (isAuthOrLeaked) {
        throw err;
      }
      console.warn(`Gemini model ${model} failed (${err?.status || err?.message?.slice(0, 80)}), trying fallback...`);
    }
  }
  throw lastError;
}

// Supabase client for reading meals directly from backend
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ========================================================
// PERSISTENT WIDGET CACHE (SURVIVES RESTARTS & MULTI-DAYS)
// ========================================================
interface WidgetCacheStore {
  users: Record<string, {
    mealsByDate: Record<string, WidgetMealData>;
    lastUpdated: number;
  }>;
  latestSchedule: Record<string, WidgetMealData>;
  latestUpdated: number;
}

const CACHE_DIR = path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(CACHE_DIR, 'widget-cache.json');

function loadWidgetCache(): WidgetCacheStore {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const content = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        users: parsed.users || {},
        latestSchedule: parsed.latestSchedule || {},
        latestUpdated: parsed.latestUpdated || 0
      };
    }
  } catch (err) {
    console.warn("Could not load widget cache from disk:", err);
  }
  return { users: {}, latestSchedule: {}, latestUpdated: 0 };
}

const widgetCache = loadWidgetCache();

function saveWidgetCache(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(widgetCache, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to save widget cache to disk:", err);
  }
}

function getParisTodayISO(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Resolves the genuine external application URL for widget action links.
 * Never outputs internal 'localhost:3000' so clicks on mobile devices work reliably.
 */
function resolveAppUrl(req: express.Request): string {
  // 1. Explicit app query param (passed from frontend widget settings)
  const appParam = typeof req.query.app === 'string' ? req.query.app : undefined;
  if (appParam && appParam.startsWith('http')) {
    return appParam.replace(/\/+$/, '');
  }

  // 2. Cloud Run deployment URL from platform environment variable
  if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }

  // 3. Forwarded headers from Cloud Run / reverse proxy
  const forwardedHost = req.get('x-forwarded-host');
  const forwardedProto = req.get('x-forwarded-proto') || 'https';
  if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '');
  }

  // 4. Referer or Origin headers
  const referer = req.get('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      if (!url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
        return url.origin;
      }
    } catch {}
  }

  // 5. Host header if not localhost
  const host = req.get('host');
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'https');
    return `${proto}://${host}`.replace(/\/+$/, '');
  }

  // 6. Safe production fallback domain for this deployment
  return 'https://ais-dev-dhjnuccowhqd3rw7og7cxv-527730955813.europe-west2.run.app';
}

async function getTodayMealData(userId?: string, dateParam?: string): Promise<WidgetMealData | null> {
  const targetDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : getParisTodayISO();

  // 1. Check user-specific stored schedule
  if (userId && widgetCache.users[userId]?.mealsByDate?.[targetDate]) {
    return widgetCache.users[userId].mealsByDate[targetDate];
  }

  // 2. Check global latestSchedule
  if (widgetCache.latestSchedule?.[targetDate]) {
    return widgetCache.latestSchedule[targetDate];
  }

  // 3. Check if any user in cache has a meal for this date
  for (const uId of Object.keys(widgetCache.users)) {
    const userMeal = widgetCache.users[uId]?.mealsByDate?.[targetDate];
    if (userMeal) {
      return userMeal;
    }
  }

  // 4. Supabase fallback query if available
  if (supabase) {
    try {
      let planningQuery = supabase.from('planning').select('*').eq('date', targetDate);
      if (userId) {
        planningQuery = planningQuery.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data: planningList, error: pErr } = await planningQuery;
      if (!pErr && planningList && planningList.length > 0) {
        const entry = planningList.find((p: any) => p.user_id === userId) || planningList[0];

        if (entry.recette_id) {
          const { data: recipe } = await supabase.from('recipes').select('*').eq('id', entry.recette_id).single();
          if (recipe) {
            const mealData: WidgetMealData = {
              nom: recipe.nom || 'Sans nom',
              categorie: recipe.categorie || 'Recette',
              image: recipe.image || recipe.image_url || getDishImage(recipe.nom),
              prepMin: Number(recipe.prepMin ?? recipe.prep_min ?? 0),
              cuissonMin: Number(recipe.cuissonMin ?? recipe.cuisson_min ?? 0),
              portions: Number(recipe.portions) || 4,
              type: 'recipe',
              dateStr: targetDate
            };
            widgetCache.latestSchedule[targetDate] = mealData;
            saveWidgetCache();
            return mealData;
          }
        }

        if (entry.suggestion_libre) {
          const mealData: WidgetMealData = {
            nom: entry.suggestion_libre,
            categorie: 'Idée libre',
            image: getDishImage(entry.suggestion_libre),
            portions: 4,
            type: 'custom',
            dateStr: targetDate
          };
          widgetCache.latestSchedule[targetDate] = mealData;
          saveWidgetCache();
          return mealData;
        }
      }
    } catch (err) {
      console.error("Error fetching widget meal data from Supabase:", err);
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', true);
  app.use(express.json({ limit: '20mb' }));

  // ========================================================
  // WIDGET WEB / JS-WIDGET ENDPOINTS (Villy21/JsWidget)
  // ========================================================

  // 1. Standalone HTML Page for WKWebView in iOS WidgetWeb App
  app.get(["/widget/today", "/widget/today.html"], async (req, res) => {
    try {
      const userId = typeof req.query.user === 'string' && req.query.user.trim() ? req.query.user.trim() : undefined;
      const dateParam = typeof req.query.date === 'string' ? req.query.date : undefined;
      const sizeParam = (typeof req.query.size === 'string' ? req.query.size : (typeof req.query.format === 'string' ? req.query.format : 'small')) as any;
      const themeParam = typeof req.query.theme === 'string' ? (req.query.theme as any) : 'auto';

      const appUrl = resolveAppUrl(req);
      const meal = await getTodayMealData(userId, dateParam);
      const targetDate = dateParam || getParisTodayISO();

      const html = renderWidgetHtml({
        meal,
        appUrl,
        dateStr: targetDate,
        size: sizeParam,
        theme: themeParam,
        title: meal ? `Au menu : ${meal.nom}` : "Au menu aujourd'hui"
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
      return res.send(html);
    } catch (err: any) {
      console.error("Widget render error:", err);
      return res.status(500).send("Erreur de génération du widget");
    }
  });

  // 2. JSON API endpoint for custom scripts or widgets
  app.get("/api/widget/today", async (req, res) => {
    try {
      const userId = typeof req.query.user === 'string' && req.query.user.trim() ? req.query.user.trim() : undefined;
      const dateParam = typeof req.query.date === 'string' ? req.query.date : undefined;
      const targetDate = dateParam || getParisTodayISO();

      const meal = await getTodayMealData(userId, dateParam);

      return res.json({
        date: targetDate,
        hasMeal: !!meal,
        meal
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 3. Client push sync to prime persistent cache with full meal schedules
  app.post("/api/widget/sync", (req, res) => {
    try {
      const { userId, mealsByDate, meal, todayMeal, date } = req.body;
      const targetDate = date || getParisTodayISO();

      const normalizedMap: Record<string, WidgetMealData> = mealsByDate && typeof mealsByDate === 'object'
        ? { ...mealsByDate }
        : {};

      const singleMeal = meal || todayMeal;
      if (singleMeal && targetDate) {
        normalizedMap[targetDate] = singleMeal;
      }

      const validUserId = typeof userId === 'string' && userId.trim() ? userId.trim() : undefined;

      if (validUserId) {
        widgetCache.users[validUserId] = {
          mealsByDate: {
            ...(widgetCache.users[validUserId]?.mealsByDate || {}),
            ...normalizedMap
          },
          lastUpdated: Date.now()
        };
      }

      // Merge into latestSchedule fallback
      widgetCache.latestSchedule = {
        ...widgetCache.latestSchedule,
        ...normalizedMap
      };
      widgetCache.latestUpdated = Date.now();

      // Persist to disk
      saveWidgetCache();

      const count = Object.keys(normalizedMap).length;
      return res.json({
        success: true,
        count,
        targetDate,
        hasMeal: !!(normalizedMap[targetDate] || widgetCache.latestSchedule[targetDate]),
        todayMeal: normalizedMap[targetDate] || widgetCache.latestSchedule[targetDate] || null
      });
    } catch (err: any) {
      console.error("Widget sync error:", err);
      return res.status(400).json({ error: err.message });
    }
  });

  // 4. Standalone JavaScript / Scriptable URL for script runners
  app.get("/widget/today.js", async (req, res) => {
    const appUrl = resolveAppUrl(req);
    const userId = typeof req.query.user === 'string' && req.query.user.trim() ? req.query.user.trim() : '';

    const scriptCode = `// Scriptable / JS-Widget pour BROCOLI - Au menu aujourd'hui
// Compatible Scriptable (iOS) et intégration Web
(async () => {
  const API_URL = "${appUrl}/api/widget/today?user=${userId}";
  const APP_URL = "${appUrl}";

  // Si exécuté dans Scriptable sur iOS :
  if (typeof ListWidget !== 'undefined') {
    const req = new Request(API_URL);
    let data;
    try {
      data = await req.loadJSON();
    } catch (e) {
      data = { hasMeal: false };
    }

    const widget = new ListWidget();
    widget.backgroundColor = new Color("#F8F6F0");
    widget.url = APP_URL;

    // Header
    const headerRow = widget.addStack();
    headerRow.layoutHorizontally();
    
    const badge = headerRow.addText("AUJOURD'HUI");
    badge.font = Font.boldSystemFont(9);
    badge.textColor = new Color("#059669");
    
    headerRow.addSpacer();
    
    const dateText = headerRow.addText(data.date || "");
    dateText.font = Font.systemFont(9);
    dateText.textColor = new Color("#78716C");

    widget.addSpacer(6);

    if (data.hasMeal && data.meal) {
      const title = widget.addText(data.meal.nom);
      title.font = Font.boldSystemFont(14);
      title.textColor = new Color("#1C1917");
      title.lineLimit = 2;

      widget.addSpacer(4);

      const cat = widget.addText(data.meal.categorie || "Recette");
      cat.font = Font.semiboldSystemFont(10);
      cat.textColor = new Color("#059669");

      if (data.meal.prepMin) {
        widget.addSpacer(2);
        const time = widget.addText("⏱ " + (data.meal.prepMin + (data.meal.cuissonMin || 0)) + " min");
        time.font = Font.systemFont(9);
        time.textColor = new Color("#78716C");
      }
    } else {
      const emptyText = widget.addText("Aucun repas prévu pour aujourd'hui");
      emptyText.font = Font.mediumSystemFont(11);
      emptyText.textColor = new Color("#78716C");
    }

    Script.setWidget(widget);
    Script.complete();
    return;
  }

  // Si exécuté dans un navigateur : redirection vers la page HTML du widget
  if (typeof window !== 'undefined') {
    window.location.href = "${appUrl}/widget/today?user=${userId}";
  }
})();
`;

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.send(scriptCode);
  });

  // API: Text parse
  app.post("/api/parse", async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText) {
        return res.json({ success: false, error: "Texte manquant" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json({ success: false, error: "GEMINI_API_KEY non configurée dans l'environnement du serveur." });
      }

      const ai = getGeminiClient();
      const responseData = await generateGeminiContentWithFallback(ai, {
        contents: [{
          role: 'user',
          parts: [{
            text: `Analyse et convertis ce texte de recette de cuisine en un objet JSON structuré en français. 
Si le texte est succinct, développe les instructions pour qu'elles soient claires.

Texte source: "${rawText}"

Retourne uniquement un objet JSON suivant ce format exact:
{
  "nom": "Nom de la recette",
  "categorie": "Viande | Poisson | Végétarien | Pâtes | Soupe | Dessert | Entrée | Autre",
  "saison": "ete | hiver | toute_annee",
  "portions": 4,
  "prepMin": 15,
  "cuissonMin": 20,
  "calories": 450,
  "ingredients": [
    { "quantite": 200, "unite": "g", "nom": "Farine" }
  ],
  "instructions": [
    { "titre": "Préparation", "texte": "Mélanger la farine..." }
  ]
}`
          }]
        }],
        config: {
          responseMimeType: "application/json",
        },
      });

      if (!responseData.text) {
        return res.json({ success: false, error: "Réponse vide de Gemini" });
      }

      const cleanJson = responseData.text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.json({ success: true, data: parsed, ...parsed });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      const isLeakedOrAuth = error?.message?.includes("leaked") || error?.message?.includes("PERMISSION_DENIED") || error?.status === 403;
      const userMessage = isLeakedOrAuth
        ? "Votre clé API Gemini doit être renouvelée dans le panneau Paramètres > Secrets d'AI Studio."
        : (error?.message || "Erreur lors de l'analyse");
      return res.json({ success: false, error: userMessage, isLeakedKey: isLeakedOrAuth });
    }
  });

  // API: Generate recipe from title / meal idea
  app.post("/api/generate-from-title", async (req, res) => {
    try {
      const { title, hint } = req.body;
      if (!title) {
        return res.json({ success: false, error: "Titre du plat manquant" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json({ success: false, error: "GEMINI_API_KEY non configurée dans l'environnement du serveur." });
      }

      const prompt = `Tu es un chef cuisinier expert.
Génère une recette de cuisine complète, délicieuse, équilibrée et facile à suivre pour le plat suivant : "${title}".
${hint ? `Consigne ou préférence spécifique : "${hint}"` : ''}

Retourne UNIQUEMENT un objet JSON suivant ce format exact en français :
{
  "nom": "${title}",
  "categorie": "Viande | Poisson | Végétarien | Pâtes | Soupe | Dessert | Entrée | Autre",
  "saison": "ete | hiver | toute_annee",
  "portions": 4,
  "prepMin": 15,
  "cuissonMin": 20,
  "calories": 450,
  "ingredients": [
    { "quantite": 200, "unite": "g", "nom": "Farine" }
  ],
  "instructions": [
    { "titre": "Étape 1", "texte": "Description claire et pédagogique..." }
  ]
}`;

      const ai = getGeminiClient();
      const responseData = await generateGeminiContentWithFallback(ai, {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        config: {
          responseMimeType: "application/json",
        },
      });

      if (!responseData.text) {
        return res.json({ success: false, error: "Réponse vide de Gemini" });
      }

      const cleanJson = responseData.text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.json({ success: true, data: parsed, ...parsed });
    } catch (error: any) {
      console.error("Gemini Generate Recipe Error:", error);
      const isLeakedOrAuth = error?.message?.includes("leaked") || error?.message?.includes("PERMISSION_DENIED") || error?.status === 403;
      const userMessage = isLeakedOrAuth
        ? "Votre clé API Gemini doit être renouvelée dans le panneau Paramètres > Secrets d'AI Studio."
        : (error?.message || "Erreur lors de la génération");
      return res.json({ success: false, error: userMessage, isLeakedKey: isLeakedOrAuth });
    }
  });

  // API: Image parse (Photo analysis)
  app.post("/api/parse-image", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg", promptText } = req.body;
      if (!imageBase64) {
        return res.json({ success: false, error: "Image manquante" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json({ success: false, error: "GEMINI_API_KEY non configurée dans l'environnement du serveur." });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

      const prompt = `Tu es un chef cuisinier expert et un numériseur de recettes.
Analyse l'image fournie qui peut être :
- La photo d'une recette (livre de cuisine, fiche manuscrite, magazine, écran).
- La photo d'un plat préparé.
- La photo d'ingrédients ou du contenu d'un frigo/placard.

${promptText ? `Information ou consigne complémentaire de l'utilisateur: "${promptText}"` : ''}

Identifie ou compose la recette correspondante de façon détaillée, exacte et appétissante.

Retourne uniquement un objet JSON suivant ce format exact:
{
  "nom": "Nom du plat",
  "categorie": "Viande | Poisson | Végétarien | Pâtes | Soupe | Dessert | Entrée | Autre",
  "saison": "ete | hiver | toute_annee",
  "portions": 4,
  "prepMin": 15,
  "cuissonMin": 20,
  "calories": 450,
  "ingredients": [
    { "quantite": 200, "unite": "g", "nom": "Ingrédient" }
  ],
  "instructions": [
    { "titre": "Étape 1", "texte": "Description claire de la préparation..." }
  ]
}`;

      const ai = getGeminiClient();
      const responseData = await generateGeminiContentWithFallback(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: cleanBase64,
              }
            },
            {
              text: prompt
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
        },
      });

      if (!responseData.text) {
        return res.json({ success: false, error: "Réponse vide de Gemini" });
      }

      const cleanJson = responseData.text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.json({ success: true, data: parsed, ...parsed });
    } catch (error: any) {
      console.error("Gemini Image API Error:", error);
      const isLeakedOrAuth = error?.message?.includes("leaked") || error?.message?.includes("PERMISSION_DENIED") || error?.status === 403;
      const userMessage = isLeakedOrAuth
        ? "Votre clé API Gemini doit être renouvelée dans le panneau Paramètres > Secrets d'AI Studio."
        : (error?.message || "Erreur lors de l'analyse de l'image");
      return res.json({ success: false, error: userMessage, isLeakedKey: isLeakedOrAuth });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
