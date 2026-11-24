import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { randomBytes, createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { renderWidgetHtml, WidgetMealData } from "./src/lib/widgetRenderer";
import { getDishImage } from "./src/lib/dishImages";
import { createBrocoliMcpServer, HouseholdMirrorData } from "./src/lib/mcpService";
import { 
  Household, 
  HouseholdMember, 
  HouseholdRole, 
  HouseholdCompetenceKey,
  HouseholdCompetences,
  HouseholdMcpConfig,
  McpPendingMutation,
  DEFAULT_ROLE_COMPETENCES 
} from "./src/types";

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

// Supabase client for reading/writing meals directly from backend
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';
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

// ========================================================
// PERSISTENT HOUSEHOLD / FAMILLE CACHE & COMPETENCE MATRIX
// ========================================================
const HOUSEHOLDS_FILE = path.join(CACHE_DIR, 'households.json');

function loadHouseholds(): Record<string, Household> {
  try {
    if (fs.existsSync(HOUSEHOLDS_FILE)) {
      const content = fs.readFileSync(HOUSEHOLDS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return parsed.households || {};
    }
  } catch (err) {
    console.warn("Could not load households from disk:", err);
  }
  return {};
}

let householdCache = loadHouseholds();

function saveHouseholds(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(HOUSEHOLDS_FILE, JSON.stringify({ households: householdCache }, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to save households to disk:", err);
  }
}

function generateHouseholdCode(existing: Record<string, Household>): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 30; i++) {
    let rand = '';
    for (let c = 0; c < 4; c++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `MAISON-${rand}`;
    const taken = Object.values(existing).some(h => h.codeInvitation.toUpperCase() === code.toUpperCase());
    if (!taken) return code;
  }
  return `FAM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// ========================================================
// PERSISTENT MCP SECRETS (HASHED TOKENS) & HOUSEHOLD MIRROR
// ========================================================
interface McpSecretRecord {
  tokenHash: string;
  tokenPreview: string;
  enabled: boolean;
  boundUserId: string;
  createdAt: string;
  updatedAt: string;
}

const MCP_SECRETS_FILE = path.join(CACHE_DIR, 'mcp-secrets.json');
const MCP_MIRROR_FILE = path.join(CACHE_DIR, 'mcp-mirror.json');

function loadMcpSecrets(): Record<string, McpSecretRecord> {
  try {
    if (fs.existsSync(MCP_SECRETS_FILE)) {
      const content = fs.readFileSync(MCP_SECRETS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return parsed.secrets || {};
    }
  } catch (err) {
    console.warn("Could not load MCP secrets from disk:", err);
  }
  return {};
}

let mcpSecrets: Record<string, McpSecretRecord> = loadMcpSecrets();

function saveMcpSecrets(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(MCP_SECRETS_FILE, JSON.stringify({ secrets: mcpSecrets }, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to save MCP secrets to disk:", err);
  }
}

function loadMcpMirror(): Record<string, HouseholdMirrorData> {
  try {
    if (fs.existsSync(MCP_MIRROR_FILE)) {
      const content = fs.readFileSync(MCP_MIRROR_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return parsed.mirrors || {};
    }
  } catch (err) {
    console.warn("Could not load MCP mirror from disk:", err);
  }
  return {};
}

let mcpMirror: Record<string, HouseholdMirrorData> = loadMcpMirror();

function saveMcpMirror(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(MCP_MIRROR_FILE, JSON.stringify({ mirrors: mcpMirror }, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to save MCP mirror to disk:", err);
  }
}

function getMirrorData(householdId: string): HouseholdMirrorData {
  if (!mcpMirror[householdId]) {
    mcpMirror[householdId] = {
      recettes: [],
      planning: [],
      courses: [],
      pendingMutations: [],
      lastSyncedAt: 0,
    };
  }
  return mcpMirror[householdId];
}

function updateMirrorData(householdId: string, updater: (data: HouseholdMirrorData) => void): void {
  const data = getMirrorData(householdId);
  updater(data);
  data.lastSyncedAt = Date.now();
  saveMcpMirror();
}

function enqueuePendingMutation(householdId: string, mutation: McpPendingMutation): void {
  const data = getMirrorData(householdId);
  data.pendingMutations.push(mutation);
  saveMcpMirror();
}

function hashMcpToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function generateMcpToken(): { rawToken: string; tokenHash: string; tokenPreview: string } {
  const rawToken = `brc_mcp_${randomBytes(24).toString('hex')}`;
  const tokenHash = hashMcpToken(rawToken);
  const tokenPreview = `${rawToken.slice(0, 12)}...${rawToken.slice(-4)}`;
  return { rawToken, tokenHash, tokenPreview };
}

function attachSanitizedMcpConfig(household: Household): Household {
  const secret = mcpSecrets[household.id];
  const fallbackBoundUserId = household.createurUserId || household.membres[0]?.userId || '';
  const mcpConfig: HouseholdMcpConfig = secret
    ? {
        enabled: Boolean(secret.enabled),
        boundUserId: secret.boundUserId || fallbackBoundUserId,
        tokenPreview: secret.tokenPreview || null,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
      }
    : {
        enabled: false,
        boundUserId: fallbackBoundUserId,
        tokenPreview: null,
      };
  return {
    ...household,
    mcpConfig,
  };
}

function hasMemberCompetence(member: HouseholdMember, key: HouseholdCompetenceKey): boolean {
  if (member.estCreateur || member.role === 'chef') return true;
  if (member.competences && member.competences[key] !== undefined) {
    return Boolean(member.competences[key]);
  }
  const role = member.role || 'cuisinier';
  const roleDefaults = DEFAULT_ROLE_COMPETENCES[role] || DEFAULT_ROLE_COMPETENCES.cuisinier;
  return Boolean(roleDefaults[key] ?? true);
}

async function verifyCallerIdentity(req: express.Request, expectedUserId: string): Promise<boolean> {
  if (!expectedUserId) return false;
  const authHeader = req.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ') && supabase) {
    const jwt = authHeader.slice(7).trim();
    if (!jwt) return false;
    try {
      const { data, error } = await supabase.auth.getUser(jwt);
      if (error || !data?.user || data.user.id !== expectedUserId) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

function authenticateMcpToken(req: express.Request): { household: Household; secret: McpSecretRecord } | null {
  const authHeader = req.get('authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) return null;

  const incomingBuf = Buffer.from(hashMcpToken(rawToken), 'hex');

  for (const [householdId, secret] of Object.entries(mcpSecrets)) {
    if (!secret.enabled || !secret.tokenHash) continue;
    try {
      const storedBuf = Buffer.from(secret.tokenHash, 'hex');
      if (storedBuf.length === incomingBuf.length && timingSafeEqual(storedBuf, incomingBuf)) {
        const household = householdCache[householdId];
        if (!household) return null;
        return { household, secret };
      }
    } catch {
      continue;
    }
  }
  return null;
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

  // Empêcher la mise en cache HTTP de /sw.js (indispensable sur iOS Safari)
  app.use('/sw.js', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Service-Worker-Allowed', '/');
    next();
  });

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

  // ========================================================
  // MAISON FAMILIALE & MATRICE DE COMPÉTENCES ENDPOINTS
  // ========================================================

  // 1. Get current household for user (or create default one)
  app.get("/api/households/my", (req, res) => {
    try {
      const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
      const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
      if (!userId) {
        return res.status(400).json({ success: false, error: "Identifiant utilisateur requis." });
      }

      // Check if user is already in a household
      let userHousehold = Object.values(householdCache).find(h => 
        h.membres.some(m => m.userId === userId)
      );

      if (!userHousehold) {
        // Create initial household for this user as Chef de maison
        const userName = email ? email.split('@')[0] : 'Famille';
        const householdId = `house_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        userHousehold = {
          id: householdId,
          nom: `Maison ${userName}`,
          codeInvitation: generateHouseholdCode(householdCache),
          createurUserId: userId,
          dateCreation: new Date().toISOString(),
          roleCompetencesPreset: { ...DEFAULT_ROLE_COMPETENCES },
          membres: [
            {
              id: `mem_${Date.now()}`,
              userId,
              nom: userName,
              email: email || '',
              avatar: '👑',
              role: 'chef',
              competences: { ...DEFAULT_ROLE_COMPETENCES.chef },
              dateRejoint: new Date().toISOString(),
              estCreateur: true,
            }
          ]
        };
        householdCache[householdId] = userHousehold;
        saveHouseholds();
      } else {
        // Ensure defaults if missing or if new competence key was introduced
        let needsSave = false;
        if (!userHousehold.roleCompetencesPreset) {
          userHousehold.roleCompetencesPreset = { ...DEFAULT_ROLE_COMPETENCES };
          needsSave = true;
        } else {
          // Check if any role lacks suggerer_repas
          for (const roleKey of Object.keys(DEFAULT_ROLE_COMPETENCES) as HouseholdRole[]) {
            if (userHousehold.roleCompetencesPreset[roleKey] && userHousehold.roleCompetencesPreset[roleKey].suggerer_repas === undefined) {
              userHousehold.roleCompetencesPreset[roleKey].suggerer_repas = DEFAULT_ROLE_COMPETENCES[roleKey].suggerer_repas;
              needsSave = true;
            }
          }
        }

        // Check members
        if (userHousehold.membres) {
          for (const m of userHousehold.membres) {
            if (m.competences && m.competences.suggerer_repas === undefined) {
              const roleDef = DEFAULT_ROLE_COMPETENCES[m.role] || DEFAULT_ROLE_COMPETENCES.cuisinier;
              m.competences.suggerer_repas = roleDef.suggerer_repas;
              needsSave = true;
            }
          }
        }

        if (needsSave) {
          saveHouseholds();
        }
      }

      return res.json({ success: true, household: attachSanitizedMcpConfig(userHousehold) });
    } catch (err: any) {
      console.error("Error fetching household:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Join a household with invitation code
  app.post("/api/households/join", (req, res) => {
    try {
      const { code, userId, email, nom, role } = req.body;
      if (!code || !userId) {
        return res.status(400).json({ success: false, error: "Code d'invitation et identifiant utilisateur requis." });
      }

      const cleanCode = String(code).trim().toUpperCase();
      const targetHousehold = Object.values(householdCache).find(
        h => h.codeInvitation.trim().toUpperCase() === cleanCode
      );

      if (!targetHousehold) {
        return res.status(404).json({ 
          success: false, 
          error: `Le code d'invitation "${cleanCode}" est invalide ou a expiré. Demandez un nouveau code au Chef de maison.` 
        });
      }

      // Check if already a member
      const existingMember = targetHousehold.membres.find(m => m.userId === userId);
      if (existingMember) {
        return res.json({ success: true, household: attachSanitizedMcpConfig(targetHousehold), message: "Vous faites déjà partie de cette Maison !" });
      }

      // Leave / cleanup any other solo household
      for (const hId of Object.keys(householdCache)) {
        const h = householdCache[hId];
        if (h.id !== targetHousehold.id) {
          h.membres = h.membres.filter(m => m.userId !== userId);
          if (h.membres.length === 0) {
            delete householdCache[hId];
          }
        }
      }

      const assignedRole: HouseholdRole = (role as HouseholdRole) || 'cuisinier';
      const preset = targetHousehold.roleCompetencesPreset?.[assignedRole] || DEFAULT_ROLE_COMPETENCES[assignedRole];
      const memberName = nom || (email ? email.split('@')[0] : 'Nouveau membre');
      
      const newMember: HouseholdMember = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        nom: memberName,
        email: email || '',
        avatar: assignedRole === 'cuisinier' ? '🍳' : assignedRole === 'commis' ? '🧑‍🍳' : assignedRole === 'enfant' ? '👶' : '👤',
        role: assignedRole,
        competences: { ...preset },
        dateRejoint: new Date().toISOString(),
        estCreateur: false,
      };

      targetHousehold.membres.push(newMember);
      saveHouseholds();

      return res.json({ success: true, household: attachSanitizedMcpConfig(targetHousehold), message: `Bienvenue dans la ${targetHousehold.nom} !` });
    } catch (err: any) {
      console.error("Error joining household:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Update household settings & role competencies matrix
  app.post("/api/households/update", (req, res) => {
    try {
      const { householdId, userId, nom, roleCompetencesPreset } = req.body;
      const household = householdCache[householdId];
      if (!household) {
        return res.status(404).json({ success: false, error: "Maison introuvable." });
      }

      const caller = household.membres.find(m => m.userId === userId);
      if (!caller || (!caller.estCreateur && !caller.competences.gerer_maison)) {
        return res.status(403).json({ success: false, error: "Vous n'avez pas l'autorisation d'administrer cette Maison." });
      }

      if (nom && typeof nom === 'string' && nom.trim()) {
        household.nom = nom.trim();
      }

      if (roleCompetencesPreset && typeof roleCompetencesPreset === 'object') {
        household.roleCompetencesPreset = {
          ...household.roleCompetencesPreset,
          ...roleCompetencesPreset
        };

        // Propagate changes to members who have a standard non-custom role
        household.membres.forEach(m => {
          if (m.role !== 'custom' && !m.estCreateur && household.roleCompetencesPreset?.[m.role]) {
            m.competences = { ...household.roleCompetencesPreset[m.role] };
          }
        });
      }

      saveHouseholds();
      return res.json({ success: true, household: attachSanitizedMcpConfig(household) });
    } catch (err: any) {
      console.error("Error updating household:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Update individual member role, custom competences, or profile
  app.post("/api/households/member/update", (req, res) => {
    try {
      const { householdId, userId, targetMemberId, role, competences, nom, avatar } = req.body;
      const household = householdCache[householdId];
      if (!household) {
        return res.status(404).json({ success: false, error: "Maison introuvable." });
      }

      const caller = household.membres.find(m => m.userId === userId);
      const target = household.membres.find(m => m.id === targetMemberId);

      if (!target) {
        return res.status(404).json({ success: false, error: "Membre introuvable." });
      }

      const isSelf = target.userId === userId;
      const canManage = caller && (caller.estCreateur || caller.competences.gerer_maison);

      // If updating roles or permissions, must have permission
      if ((role !== undefined || competences !== undefined) && !canManage) {
        return res.status(403).json({ success: false, error: "Seul le Chef de maison peut modifier les rôles et permissions." });
      }

      // If user is just changing their own name or avatar
      if (nom && typeof nom === 'string') {
        if (isSelf || canManage) target.nom = nom.trim();
      }
      if (avatar && typeof avatar === 'string') {
        if (isSelf || canManage) target.avatar = avatar;
      }

      // Update role
      if (role && canManage) {
        target.role = role;
        if (role !== 'custom') {
          const preset = household.roleCompetencesPreset?.[role] || DEFAULT_ROLE_COMPETENCES[role];
          target.competences = { ...preset };
        }
      }

      // Update individual granular competences matrix for this member
      if (competences && canManage) {
        target.competences = {
          ...target.competences,
          ...competences
        };
      }

      saveHouseholds();
      return res.json({ success: true, household: attachSanitizedMcpConfig(household), targetMember: target });
    } catch (err: any) {
      console.error("Error updating member:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Remove a member from the household
  app.post("/api/households/member/remove", (req, res) => {
    try {
      const { householdId, userId, targetMemberId } = req.body;
      const household = householdCache[householdId];
      if (!household) {
        return res.status(404).json({ success: false, error: "Maison introuvable." });
      }

      const caller = household.membres.find(m => m.userId === userId);
      const target = household.membres.find(m => m.id === targetMemberId);

      if (!target) {
        return res.status(404).json({ success: false, error: "Membre introuvable." });
      }

      const isSelf = target.userId === userId;
      const canManage = caller && (caller.estCreateur || caller.competences.gerer_maison);

      if (!isSelf && !canManage) {
        return res.status(403).json({ success: false, error: "Action non autorisée." });
      }

      if (target.estCreateur && household.membres.length > 1) {
        return res.status(400).json({ success: false, error: "Le créateur ne peut pas quitter la maison tant qu'il y a d'autres membres." });
      }

      household.membres = household.membres.filter(m => m.id !== targetMemberId);
      if (household.membres.length === 0) {
        delete householdCache[householdId];
      }

      saveHouseholds();
      return res.json({ success: true, household: attachSanitizedMcpConfig(household) });
    } catch (err: any) {
      console.error("Error removing member:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5b. Leave a household
  app.post("/api/households/leave", (req, res) => {
    try {
      const { householdId, userId } = req.body;
      const household = householdCache[householdId];
      if (!household) {
        return res.status(404).json({ success: false, error: "Maison introuvable." });
      }

      const target = household.membres.find(m => m.userId === userId);
      if (!target) {
        return res.json({ success: true });
      }
      if (target.estCreateur && household.membres.length > 1) {
        return res.status(400).json({ success: false, error: "Le créateur ne peut pas quitter la maison tant qu'il y a d'autres membres." });
      }

      household.membres = household.membres.filter(m => m.userId !== userId);
      if (household.membres.length === 0) {
        delete householdCache[householdId];
      }
      saveHouseholds();
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Error leaving household:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Regenerate household invitation code
  app.post("/api/households/regenerate-code", (req, res) => {
    try {
      const { householdId, userId } = req.body;
      const household = householdCache[householdId];
      if (!household) {
        return res.status(404).json({ success: false, error: "Maison introuvable." });
      }

      const caller = household.membres.find(m => m.userId === userId);
      if (!caller || (!caller.estCreateur && !caller.competences.inviter_membres && !caller.competences.gerer_maison)) {
        return res.status(403).json({ success: false, error: "Vous n'avez pas l'autorisation de renouveler le code d'invitation." });
      }

      household.codeInvitation = generateHouseholdCode(householdCache);
      saveHouseholds();
      return res.json({ success: true, codeInvitation: household.codeInvitation, household: attachSanitizedMcpConfig(household) });
    } catch (err: any) {
      console.error("Error regenerating code:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================
  // SERVEUR MCP (STREAMABLE HTTP + SSE + AUTH PAR MAISON)
  // ========================================================
  const streamableSessions = new Map<string, {
    transport: StreamableHTTPServerTransport;
    server: McpServer;
    householdId: string;
  }>();

  const sseSessions = new Map<string, {
    transport: SSEServerTransport;
    server: McpServer;
    householdId: string;
  }>();

  async function closeHouseholdMcpSessions(householdId: string) {
    for (const [sid, session] of streamableSessions.entries()) {
      if (session.householdId === householdId) {
        try {
          await session.transport.close();
          await session.server.close();
        } catch {}
        streamableSessions.delete(sid);
      }
    }
    for (const [sid, session] of sseSessions.entries()) {
      if (session.householdId === householdId) {
        try {
          await session.transport.close();
          await session.server.close();
        } catch {}
        sseSessions.delete(sid);
      }
    }
  }

  function buildMcpServerForHousehold(householdId: string): McpServer {
    return createBrocoliMcpServer({
      householdId,
      getHousehold: () => householdCache[householdId],
      getBoundMember: () => {
        const h = householdCache[householdId];
        if (!h) return undefined;
        const secret = mcpSecrets[householdId];
        const boundId = secret?.boundUserId || h.createurUserId;
        return h.membres.find(m => m.userId === boundId) || h.membres.find(m => m.estCreateur) || h.membres[0];
      },
      hasMemberCompetence,
      getParisTodayISO,
      supabase,
      getMirrorData,
      updateMirrorData,
      enqueuePendingMutation,
      getWidgetMealsForMembers: (memberIds: string[]) => {
        const merged: Record<string, WidgetMealData> = {};
        for (const uid of memberIds) {
          const userMeals = widgetCache.users[uid]?.mealsByDate;
          if (userMeals) {
            Object.assign(merged, userMeals);
          }
        }
        return merged;
      },
    });
  }

  function applyMcpHeaders(req: express.Request, res: express.Response) {
    const reqOrigin = req.get('origin');
    const appOrigin = resolveAppUrl(req);
    const localOrigin = `http://localhost:${PORT}`;
    if (reqOrigin && (reqOrigin === appOrigin || reqOrigin === localOrigin || reqOrigin === `http://127.0.0.1:${PORT}`)) {
      res.setHeader('Access-Control-Allow-Origin', reqOrigin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  }

  // Admin: Enable/disable MCP, bind household member, rotate Bearer token
  app.post("/api/households/mcp/configure", async (req, res) => {
    try {
      const { householdId, userId, enabled, boundUserId, regenerateToken } = req.body || {};
      const household = householdCache[householdId];
      if (!household) {
        return res.status(404).json({ success: false, error: "Maison introuvable." });
      }

      const identityOk = await verifyCallerIdentity(req, String(userId || ''));
      if (!identityOk) {
        return res.status(401).json({ success: false, error: "Identité utilisateur non vérifiée." });
      }

      const caller = household.membres.find(m => m.userId === userId);
      if (!caller || (!caller.estCreateur && caller.role !== 'chef' && !caller.competences?.gerer_maison)) {
        return res.status(403).json({ success: false, error: "Seul le Chef de maison peut configurer le serveur MCP." });
      }

      const existing = mcpSecrets[householdId];
      const now = new Date().toISOString();
      let plainTokenToReturn: string | undefined;

      let tokenHash = existing?.tokenHash || '';
      let tokenPreview = existing?.tokenPreview || '';
      const nextEnabled = typeof enabled === 'boolean' ? enabled : (existing?.enabled ?? false);

      if (boundUserId !== undefined) {
        const targetExists = household.membres.some(m => m.userId === boundUserId);
        if (!targetExists) {
          return res.status(400).json({ success: false, error: "Le membre sélectionné n'appartient pas à cette Maison." });
        }
      }

      const nextBoundUserId = boundUserId || existing?.boundUserId || household.createurUserId || caller.userId;

      if (regenerateToken || (nextEnabled && !tokenHash)) {
        const generated = generateMcpToken();
        tokenHash = generated.tokenHash;
        tokenPreview = generated.tokenPreview;
        plainTokenToReturn = generated.rawToken;
      }

      mcpSecrets[householdId] = {
        tokenHash,
        tokenPreview,
        enabled: nextEnabled,
        boundUserId: nextBoundUserId,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      saveMcpSecrets();

      if (!nextEnabled || regenerateToken) {
        await closeHouseholdMcpSessions(householdId);
      }

      return res.json({
        success: true,
        household: attachSanitizedMcpConfig(household),
        ...(plainTokenToReturn ? { token: plainTokenToReturn } : {}),
      });
    } catch (err: any) {
      console.error("Error configuring MCP:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Status check for UI diagnostics
  app.get("/api/households/mcp/status", (req, res) => {
    const householdId = typeof req.query.householdId === 'string' ? req.query.householdId.trim() : '';
    const secret = householdId ? mcpSecrets[householdId] : undefined;
    const mirror = householdId ? getMirrorData(householdId) : undefined;

    let activeSessions = 0;
    if (householdId) {
      for (const s of streamableSessions.values()) {
        if (s.householdId === householdId) activeSessions++;
      }
      for (const s of sseSessions.values()) {
        if (s.householdId === householdId) activeSessions++;
      }
    }

    return res.json({
      success: true,
      enabled: Boolean(secret?.enabled),
      activeSessions,
      hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      pendingCount: mirror?.pendingMutations?.length || 0,
      lastSyncedAt: mirror?.lastSyncedAt || 0,
    });
  });

  // Sync household snapshot (recipes, planning, shopping list) from frontend & return pending MCP mutations
  app.post("/api/households/mcp/sync", async (req, res) => {
    try {
      const { householdId, userId, recettes, planning, courses } = req.body || {};
      const household = householdCache[householdId];
      if (!household) {
        return res.status(404).json({ success: false, error: "Maison introuvable." });
      }

      const isMember = household.membres.some(m => m.userId === userId);
      if (!isMember) {
        return res.status(403).json({ success: false, error: "Accès refusé à cette Maison." });
      }

      const mirror = getMirrorData(householdId);
      const pending = [...(mirror.pendingMutations || [])];

      if (Array.isArray(recettes)) {
        mirror.recettes = recettes;
      }
      if (Array.isArray(planning)) {
        // Keep any unacknowledged MCP meal suggestions in mirror until frontend applies them
        const pendingDates = new Set(
          pending.filter(m => m.type === 'suggest_meal' && m.payload?.date).map(m => m.payload.date)
        );
        const preservedPendingEntries = mirror.planning.filter(p => pendingDates.has(p.date));
        const incomingDates = new Set(planning.map((p: any) => p.date));
        mirror.planning = [
          ...planning,
          ...preservedPendingEntries.filter(p => !incomingDates.has(p.date)),
        ];
      }
      if (Array.isArray(courses)) {
        const pendingCreatedIds = new Set<string>();
        pending.forEach(m => {
          if (m.type === 'add_shopping_items' && Array.isArray(m.payload?.createdItems)) {
            m.payload.createdItems.forEach((it: any) => pendingCreatedIds.add(it.id));
          }
        });
        const preservedPendingItems = mirror.courses.filter(c => pendingCreatedIds.has(c.id));
        const incomingIds = new Set(courses.map((c: any) => c.id));
        mirror.courses = [
          ...courses,
          ...preservedPendingItems.filter(c => !incomingIds.has(c.id)),
        ];
      }

      mirror.lastSyncedAt = Date.now();
      saveMcpMirror();

      return res.json({
        success: true,
        pendingMutations: pending,
      });
    } catch (err: any) {
      console.error("Error syncing MCP mirror:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Acknowledge pending MCP mutations once applied to Supabase by frontend
  app.post("/api/households/mcp/ack", (req, res) => {
    try {
      const { householdId, userId, mutationIds } = req.body || {};
      const household = householdCache[householdId];
      if (!household) {
        return res.status(404).json({ success: false, error: "Maison introuvable." });
      }
      const isMember = household.membres.some(m => m.userId === userId);
      if (!isMember) {
        return res.status(403).json({ success: false, error: "Accès refusé." });
      }
      if (Array.isArray(mutationIds) && mutationIds.length > 0) {
        const ackSet = new Set(mutationIds);
        updateMirrorData(householdId, (data) => {
          data.pendingMutations = data.pendingMutations.filter(m => !ackSet.has(m.id));
        });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Preflight for MCP endpoints
  app.options(["/api/mcp", "/api/mcp/sse", "/api/mcp/messages"], (req, res) => {
    applyMcpHeaders(req, res);
    return res.status(204).end();
  });

  // Streamable HTTP MCP Endpoint (POST / GET / DELETE)
  app.all("/api/mcp", async (req, res) => {
    applyMcpHeaders(req, res);

    const auth = authenticateMcpToken(req);
    if (!auth) {
      return res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Jeton MCP manquant, invalide ou serveur MCP désactivé pour cette Maison." },
        id: null,
      });
    }

    const sessionId = req.get('mcp-session-id');

    try {
      if (req.method === 'POST') {
        if (sessionId && streamableSessions.has(sessionId)) {
          const session = streamableSessions.get(sessionId)!;
          if (session.householdId !== auth.household.id) {
            return res.status(403).json({
              jsonrpc: "2.0",
              error: { code: -32003, message: "Session MCP associée à une autre Maison." },
              id: null,
            });
          }
          await session.transport.handleRequest(req, res, req.body);
          return;
        }

        if (!sessionId && isInitializeRequest(req.body)) {
          const server = buildMcpServerForHousehold(auth.household.id);
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (newSessionId) => {
              streamableSessions.set(newSessionId, {
                transport,
                server,
                householdId: auth.household.id,
              });
            },
            onsessionclosed: (closedSessionId) => {
              streamableSessions.delete(closedSessionId);
            },
          });

          transport.onclose = () => {
            if (transport.sessionId) {
              streamableSessions.delete(transport.sessionId);
            }
            server.close().catch(() => {});
          };

          await server.connect(transport);
          await transport.handleRequest(req, res, req.body);
          return;
        }

        return res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Session MCP manquante ou expirée. Envoyez d'abord une requête initialize." },
          id: null,
        });
      }

      if (req.method === 'GET' || req.method === 'DELETE') {
        if (!sessionId || !streamableSessions.has(sessionId)) {
          return res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "En-tête Mcp-Session-Id manquant ou session introuvable." },
            id: null,
          });
        }
        const session = streamableSessions.get(sessionId)!;
        if (session.householdId !== auth.household.id) {
          return res.status(403).json({
            jsonrpc: "2.0",
            error: { code: -32003, message: "Session MCP associée à une autre Maison." },
            id: null,
          });
        }
        await session.transport.handleRequest(req, res);
        return;
      }

      return res.status(405).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Méthode HTTP non supportée sur /api/mcp." },
        id: null,
      });
    } catch (err: any) {
      console.error("[MCP StreamableHTTP] Error:", err);
      if (!res.headersSent) {
        return res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: err?.message || "Erreur interne du serveur MCP." },
          id: null,
        });
      }
    }
  });

  // Classic SSE MCP Endpoint (GET stream)
  app.get("/api/mcp/sse", async (req, res) => {
    applyMcpHeaders(req, res);

    const auth = authenticateMcpToken(req);
    if (!auth) {
      return res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Jeton MCP manquant, invalide ou serveur MCP désactivé." },
        id: null,
      });
    }

    try {
      const transport = new SSEServerTransport("/api/mcp/messages", res);
      const server = buildMcpServerForHousehold(auth.household.id);

      sseSessions.set(transport.sessionId, {
        transport,
        server,
        householdId: auth.household.id,
      });

      res.on("close", () => {
        sseSessions.delete(transport.sessionId);
        server.close().catch(() => {});
      });

      await server.connect(transport);
    } catch (err: any) {
      console.error("[MCP SSE] Connection error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || "Erreur de connexion SSE MCP." });
      }
    }
  });

  // Classic SSE MCP Message Ingestion Endpoint (POST JSON-RPC)
  app.post("/api/mcp/messages", async (req, res) => {
    applyMcpHeaders(req, res);

    const auth = authenticateMcpToken(req);
    if (!auth) {
      return res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Jeton MCP manquant, invalide ou serveur MCP désactivé." },
        id: null,
      });
    }

    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId.trim() : '';
    const session = sessionId ? sseSessions.get(sessionId) : undefined;
    if (!session) {
      return res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Session SSE MCP introuvable ou expirée." },
        id: null,
      });
    }

    if (session.householdId !== auth.household.id) {
      return res.status(403).json({
        jsonrpc: "2.0",
        error: { code: -32003, message: "Session SSE associée à une autre Maison." },
        id: null,
      });
    }

    try {
      await session.transport.handlePostMessage(req, res, req.body);
    } catch (err: any) {
      console.error("[MCP SSE Messages] Error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: err?.message || "Erreur lors du traitement du message MCP." },
          id: null,
        });
      }
    }
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
