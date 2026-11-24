import fs from "node:fs";
import path from "node:path";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  Household,
  HouseholdMember,
  HouseholdRole,
  HouseholdCompetenceKey,
  HouseholdCompetences,
  HouseholdMcpConfig,
  McpPendingMutation,
  DEFAULT_ROLE_COMPETENCES,
} from "../types";
import type { HouseholdMirrorData } from "./mcpService";

export interface McpSecretRecord {
  tokenHash: string;
  tokenPreview: string;
  enabled: boolean;
  boundUserId: string;
  createdAt: string;
  updatedAt: string;
}

export class MissingSchemaError extends Error {
  needsSetup = true;
  constructor(message = "Les tables Supabase pour la Maison Familiale ne sont pas encore créées.") {
    super(message);
    this.name = "MissingSchemaError";
  }
}

const IS_VERCEL = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const CACHE_DIR = path.join(process.cwd(), "data");
const HOUSEHOLDS_FILE = path.join(CACHE_DIR, "households.json");
const MCP_SECRETS_FILE = path.join(CACHE_DIR, "mcp-secrets.json");
const MCP_MIRROR_FILE = path.join(CACHE_DIR, "mcp-mirror.json");

function getSupabaseEnv() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  return { url, serviceKey, anonKey };
}

export function getServerSupabase(userJwt?: string): SupabaseClient | null {
  const { url, serviceKey, anonKey } = getSupabaseEnv();
  if (!url) return null;

  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  if (anonKey) {
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      ...(userJwt
        ? {
            global: {
              headers: {
                Authorization: `Bearer ${userJwt}`,
              },
            },
          }
        : {}),
    });
  }

  return null;
}

export function extractBearerToken(authHeader?: string | string[]): string | undefined {
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!raw || typeof raw !== "string") return undefined;
  if (!raw.toLowerCase().startsWith("bearer ")) return undefined;
  const token = raw.slice(7).trim();
  return token || undefined;
}

export async function verifyCallerIdentity(userJwt: string | undefined, expectedUserId: string): Promise<boolean> {
  if (!expectedUserId) return false;
  if (!userJwt) return true;
  const { url, anonKey, serviceKey } = getSupabaseEnv();
  const key = serviceKey || anonKey;
  if (!url || !key) return true;
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(userJwt);
    if (error || !data?.user || data.user.id !== expectedUserId) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isMissingTableOrRlsError(err: any): { missingTable: boolean; rlsBlocked: boolean } {
  const code = String(err?.code || "");
  const msg = String(err?.message || "").toLowerCase();
  const missingTable =
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table");
  const rlsBlocked =
    code === "42501" ||
    msg.includes("row-level security") ||
    msg.includes("permission denied");
  return { missingTable, rlsBlocked };
}

// ========================================================
// LOCAL DISK CACHE HELPERS (DEV FALLBACK ONLY)
// ========================================================
function readJsonSafe<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
    }
  } catch {}
  return fallback;
}

function writeJsonSafe(filePath: string, data: unknown): void {
  if (IS_VERCEL) return;
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Local disk write skipped:", err);
  }
}

function loadDiskHouseholds(): Record<string, Household> {
  const parsed = readJsonSafe<{ households?: Record<string, Household> }>(HOUSEHOLDS_FILE, {});
  return parsed.households || {};
}

function saveDiskHouseholds(households: Record<string, Household>): void {
  writeJsonSafe(HOUSEHOLDS_FILE, { households });
}

function loadDiskSecrets(): Record<string, McpSecretRecord> {
  const parsed = readJsonSafe<{ secrets?: Record<string, McpSecretRecord> }>(MCP_SECRETS_FILE, {});
  return parsed.secrets || {};
}

function saveDiskSecrets(secrets: Record<string, McpSecretRecord>): void {
  writeJsonSafe(MCP_SECRETS_FILE, { secrets });
}

function loadDiskMirrors(): Record<string, HouseholdMirrorData> {
  const parsed = readJsonSafe<{ mirrors?: Record<string, HouseholdMirrorData> }>(MCP_MIRROR_FILE, {});
  return parsed.mirrors || {};
}

function saveDiskMirrors(mirrors: Record<string, HouseholdMirrorData>): void {
  writeJsonSafe(MCP_MIRROR_FILE, { mirrors });
}

// ========================================================
// NORMALIZATION & COMPETENCE HELPERS
// ========================================================
export function hasMemberCompetence(member: HouseholdMember, key: HouseholdCompetenceKey): boolean {
  if (member.estCreateur || member.role === "chef") return true;
  if (member.competences && member.competences[key] !== undefined) {
    return Boolean(member.competences[key]);
  }
  const role = member.role || "cuisinier";
  const roleDefaults = DEFAULT_ROLE_COMPETENCES[role] || DEFAULT_ROLE_COMPETENCES.cuisinier;
  return Boolean(roleDefaults[key] ?? true);
}

export function normalizeHousehold(h: Household): { household: Household; changed: boolean } {
  let changed = false;
  const presets: Record<HouseholdRole, HouseholdCompetences> = h.roleCompetencesPreset
    ? { ...h.roleCompetencesPreset }
    : { ...DEFAULT_ROLE_COMPETENCES };

  if (!h.roleCompetencesPreset) changed = true;

  for (const roleKey of Object.keys(DEFAULT_ROLE_COMPETENCES) as HouseholdRole[]) {
    if (!presets[roleKey]) {
      presets[roleKey] = { ...DEFAULT_ROLE_COMPETENCES[roleKey] };
      changed = true;
    } else if (presets[roleKey].suggerer_repas === undefined) {
      presets[roleKey] = {
        ...presets[roleKey],
        suggerer_repas: DEFAULT_ROLE_COMPETENCES[roleKey].suggerer_repas,
      };
      changed = true;
    }
  }

  const membres = (h.membres || []).map((m) => {
    if (m.competences && m.competences.suggerer_repas === undefined) {
      const roleDef = DEFAULT_ROLE_COMPETENCES[m.role] || DEFAULT_ROLE_COMPETENCES.cuisinier;
      changed = true;
      return {
        ...m,
        competences: {
          ...m.competences,
          suggerer_repas: roleDef.suggerer_repas,
        },
      };
    }
    return m;
  });

  return {
    household: {
      ...h,
      roleCompetencesPreset: presets,
      membres,
    },
    changed,
  };
}

export function hashMcpToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function generateMcpToken(): { rawToken: string; tokenHash: string; tokenPreview: string } {
  const rawToken = `brc_mcp_${randomBytes(24).toString("hex")}`;
  const tokenHash = hashMcpToken(rawToken);
  const tokenPreview = `${rawToken.slice(0, 12)}...${rawToken.slice(-4)}`;
  return { rawToken, tokenHash, tokenPreview };
}

export function attachSanitizedMcpConfig(household: Household, secret?: McpSecretRecord | null): Household {
  const fallbackBoundUserId = household.createurUserId || household.membres[0]?.userId || "";
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

function generateHouseholdCode(existingCodes: string[]): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const takenSet = new Set(existingCodes.map((c) => c.toUpperCase()));
  for (let i = 0; i < 30; i++) {
    let rand = "";
    for (let c = 0; c < 4; c++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `MAISON-${rand}`;
    if (!takenSet.has(code)) return code;
  }
  return `FAM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function mapRowToHousehold(row: any): Household {
  return {
    id: row.id,
    nom: row.nom,
    codeInvitation: row.code_invitation,
    createurUserId: row.createur_user_id,
    dateCreation: row.date_creation || new Date().toISOString(),
    roleCompetencesPreset: row.role_competences_preset || { ...DEFAULT_ROLE_COMPETENCES },
    membres: Array.isArray(row.membres) ? row.membres : [],
  };
}

function mapRowToSecret(row: any): McpSecretRecord | null {
  if (!row) return null;
  return {
    tokenHash: row.token_hash || "",
    tokenPreview: row.token_preview || "",
    enabled: Boolean(row.enabled),
    boundUserId: row.bound_user_id || "",
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// ========================================================
// PERSISTENCE ABSTRACTION (SUPABASE + DEV DISK FALLBACK)
// ========================================================
async function listAllHouseholds(userJwt?: string): Promise<{ source: "supabase" | "disk"; list: Household[] }> {
  const sb = getServerSupabase(userJwt);
  if (sb) {
    const { data, error } = await sb.from("households").select("*");
    if (!error && Array.isArray(data)) {
      return { source: "supabase", list: data.map(mapRowToHousehold) };
    }
    if (error) {
      const { missingTable, rlsBlocked } = isMissingTableOrRlsError(error);
      if (IS_VERCEL) {
        if (missingTable) throw new MissingSchemaError();
        if (rlsBlocked) {
          throw new Error("Accès Supabase refusé (RLS). Vérifiez votre connexion ou configurez SUPABASE_SERVICE_ROLE_KEY sur Vercel.");
        }
        throw new Error(error.message);
      }
      if (!missingTable && !rlsBlocked) {
        console.warn("[Households] Supabase fallback to disk:", error.message);
      }
    }
  } else if (IS_VERCEL) {
    throw new MissingSchemaError("Configuration Supabase manquante sur Vercel (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
  }

  return { source: "disk", list: Object.values(loadDiskHouseholds()) };
}

async function getHouseholdById(householdId: string, userJwt?: string): Promise<{ source: "supabase" | "disk"; household: Household | null }> {
  const sb = getServerSupabase(userJwt);
  if (sb) {
    const { data, error } = await sb.from("households").select("*").eq("id", householdId).maybeSingle();
    if (!error) {
      return { source: "supabase", household: data ? mapRowToHousehold(data) : null };
    }
    const { missingTable, rlsBlocked } = isMissingTableOrRlsError(error);
    if (IS_VERCEL) {
      if (missingTable) throw new MissingSchemaError();
      if (rlsBlocked) throw new Error("Accès Supabase refusé (RLS).");
      throw new Error(error.message);
    }
  } else if (IS_VERCEL) {
    throw new MissingSchemaError("Configuration Supabase manquante sur Vercel.");
  }

  const disk = loadDiskHouseholds();
  return { source: "disk", household: disk[householdId] || null };
}

async function upsertHousehold(household: Household, source: "supabase" | "disk", userJwt?: string): Promise<void> {
  if (source === "supabase") {
    const sb = getServerSupabase(userJwt);
    if (!sb) throw new Error("Supabase non initialisé");
    const { error } = await sb.from("households").upsert(
      {
        id: household.id,
        nom: household.nom,
        code_invitation: household.codeInvitation,
        createur_user_id: household.createurUserId,
        date_creation: household.dateCreation,
        role_competences_preset: household.roleCompetencesPreset,
        membres: household.membres,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) {
      const { missingTable } = isMissingTableOrRlsError(error);
      if (missingTable) throw new MissingSchemaError();
      throw new Error(error.message);
    }
    return;
  }

  const disk = loadDiskHouseholds();
  disk[household.id] = household;
  saveDiskHouseholds(disk);
}

async function deleteHouseholdRecord(householdId: string, source: "supabase" | "disk", userJwt?: string): Promise<void> {
  if (source === "supabase") {
    const sb = getServerSupabase(userJwt);
    if (!sb) return;
    await sb.from("households").delete().eq("id", householdId);
    return;
  }
  const disk = loadDiskHouseholds();
  delete disk[householdId];
  saveDiskHouseholds(disk);
}

async function getSecretRecord(householdId: string, source: "supabase" | "disk", userJwt?: string): Promise<McpSecretRecord | null> {
  if (source === "supabase") {
    const sb = getServerSupabase(userJwt);
    if (!sb) return null;
    const { data, error } = await sb
      .from("household_mcp_secrets")
      .select("*")
      .eq("household_id", householdId)
      .maybeSingle();
    if (error) {
      const { missingTable } = isMissingTableOrRlsError(error);
      if (missingTable && IS_VERCEL) throw new MissingSchemaError();
      return null;
    }
    return mapRowToSecret(data);
  }
  const secrets = loadDiskSecrets();
  return secrets[householdId] || null;
}

async function upsertSecretRecord(householdId: string, secret: McpSecretRecord, source: "supabase" | "disk", userJwt?: string): Promise<void> {
  if (source === "supabase") {
    const sb = getServerSupabase(userJwt);
    if (!sb) throw new Error("Supabase non initialisé");
    const { error } = await sb.from("household_mcp_secrets").upsert(
      {
        household_id: householdId,
        token_hash: secret.tokenHash,
        token_preview: secret.tokenPreview,
        enabled: secret.enabled,
        bound_user_id: secret.boundUserId,
        created_at: secret.createdAt,
        updated_at: secret.updatedAt,
      },
      { onConflict: "household_id" }
    );
    if (error) {
      const { missingTable } = isMissingTableOrRlsError(error);
      if (missingTable) throw new MissingSchemaError();
      throw new Error(error.message);
    }
    return;
  }

  const secrets = loadDiskSecrets();
  secrets[householdId] = secret;
  saveDiskSecrets(secrets);
}

export async function getMirrorRecord(householdId: string, userJwt?: string): Promise<{ source: "supabase" | "disk"; mirror: HouseholdMirrorData }> {
  const sb = getServerSupabase(userJwt);
  if (sb) {
    const { data, error } = await sb
      .from("household_mcp_mirrors")
      .select("*")
      .eq("household_id", householdId)
      .maybeSingle();
    if (!error) {
      const mirror: HouseholdMirrorData = data
        ? {
            recettes: Array.isArray(data.recettes) ? data.recettes : [],
            planning: Array.isArray(data.planning) ? data.planning : [],
            courses: Array.isArray(data.courses) ? data.courses : [],
            pendingMutations: Array.isArray(data.pending_mutations) ? data.pending_mutations : [],
            lastSyncedAt: Number(data.last_synced_at) || 0,
          }
        : { recettes: [], planning: [], courses: [], pendingMutations: [], lastSyncedAt: 0 };
      return { source: "supabase", mirror };
    }
    const { missingTable } = isMissingTableOrRlsError(error);
    if (IS_VERCEL && missingTable) throw new MissingSchemaError();
  }

  const mirrors = loadDiskMirrors();
  const mirror = mirrors[householdId] || {
    recettes: [],
    planning: [],
    courses: [],
    pendingMutations: [],
    lastSyncedAt: 0,
  };
  return { source: "disk", mirror };
}

export async function saveMirrorRecord(householdId: string, mirror: HouseholdMirrorData, source: "supabase" | "disk", userJwt?: string): Promise<void> {
  if (source === "supabase") {
    const sb = getServerSupabase(userJwt);
    if (!sb) return;
    const { error } = await sb.from("household_mcp_mirrors").upsert(
      {
        household_id: householdId,
        recettes: mirror.recettes,
        planning: mirror.planning,
        courses: mirror.courses,
        pending_mutations: mirror.pendingMutations,
        last_synced_at: mirror.lastSyncedAt,
      },
      { onConflict: "household_id" }
    );
    if (error && IS_VERCEL) {
      const { missingTable } = isMissingTableOrRlsError(error);
      if (missingTable) throw new MissingSchemaError();
      throw new Error(error.message);
    }
    return;
  }

  const mirrors = loadDiskMirrors();
  mirrors[householdId] = mirror;
  saveDiskMirrors(mirrors);
}

// ========================================================
// DOMAIN OPERATIONS (SHARED BY EXPRESS & VERCEL API)
// ========================================================
export async function getOrCreateMyHousehold(userId: string, email: string, userJwt?: string): Promise<Household> {
  const { source, list } = await listAllHouseholds(userJwt);
  let userHousehold = list.find((h) => h.membres.some((m) => m.userId === userId));

  if (!userHousehold) {
    const userName = email ? email.split("@")[0] : "Famille";
    const householdId = `house_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    userHousehold = {
      id: householdId,
      nom: `Maison ${userName}`,
      codeInvitation: generateHouseholdCode(list.map((h) => h.codeInvitation)),
      createurUserId: userId,
      dateCreation: new Date().toISOString(),
      roleCompetencesPreset: { ...DEFAULT_ROLE_COMPETENCES },
      membres: [
        {
          id: `mem_${Date.now()}`,
          userId,
          nom: userName,
          email: email || "",
          avatar: "👑",
          role: "chef",
          competences: { ...DEFAULT_ROLE_COMPETENCES.chef },
          dateRejoint: new Date().toISOString(),
          estCreateur: true,
        },
      ],
    };
    await upsertHousehold(userHousehold, source, userJwt);
  } else {
    const { household: normalized, changed } = normalizeHousehold(userHousehold);
    if (changed) {
      userHousehold = normalized;
      await upsertHousehold(userHousehold, source, userJwt);
    }
  }

  const secret = await getSecretRecord(userHousehold.id, source, userJwt);
  return attachSanitizedMcpConfig(userHousehold, secret);
}

export async function joinHouseholdByCode(
  params: { code: string; userId: string; email?: string; nom?: string; role?: HouseholdRole },
  userJwt?: string
): Promise<{ status: number; body: any }> {
  const cleanCode = String(params.code || "").trim().toUpperCase();
  if (!cleanCode || !params.userId) {
    return { status: 400, body: { success: false, error: "Code d'invitation et identifiant utilisateur requis." } };
  }

  const { source, list } = await listAllHouseholds(userJwt);
  const targetHousehold = list.find((h) => h.codeInvitation.trim().toUpperCase() === cleanCode);

  if (!targetHousehold) {
    return {
      status: 404,
      body: {
        success: false,
        error: `Le code d'invitation "${cleanCode}" est invalide ou a expiré. Demandez un nouveau code au Chef de maison.`,
      },
    };
  }

  const existingMember = targetHousehold.membres.find((m) => m.userId === params.userId);
  if (existingMember) {
    const secret = await getSecretRecord(targetHousehold.id, source, userJwt);
    return {
      status: 200,
      body: {
        success: true,
        household: attachSanitizedMcpConfig(targetHousehold, secret),
        message: "Vous faites déjà partie de cette Maison !",
      },
    };
  }

  // Leave / cleanup any other solo household
  for (const h of list) {
    if (h.id !== targetHousehold.id && h.membres.some((m) => m.userId === params.userId)) {
      const remaining = h.membres.filter((m) => m.userId !== params.userId);
      if (remaining.length === 0) {
        await deleteHouseholdRecord(h.id, source, userJwt);
      } else {
        await upsertHousehold({ ...h, membres: remaining }, source, userJwt);
      }
    }
  }

  const assignedRole: HouseholdRole = params.role || "cuisinier";
  const preset = targetHousehold.roleCompetencesPreset?.[assignedRole] || DEFAULT_ROLE_COMPETENCES[assignedRole];
  const memberName = params.nom || (params.email ? params.email.split("@")[0] : "Nouveau membre");

  const newMember: HouseholdMember = {
    id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: params.userId,
    nom: memberName,
    email: params.email || "",
    avatar: assignedRole === "cuisinier" ? "🍳" : assignedRole === "commis" ? "🧑‍🍳" : assignedRole === "enfant" ? "👶" : "👤",
    role: assignedRole,
    competences: { ...preset },
    dateRejoint: new Date().toISOString(),
    estCreateur: false,
  };

  targetHousehold.membres.push(newMember);
  await upsertHousehold(targetHousehold, source, userJwt);
  const secret = await getSecretRecord(targetHousehold.id, source, userJwt);

  return {
    status: 200,
    body: {
      success: true,
      household: attachSanitizedMcpConfig(targetHousehold, secret),
      message: `Bienvenue dans la ${targetHousehold.nom} !`,
    },
  };
}

export async function updateHouseholdSettings(
  params: { householdId: string; userId: string; nom?: string; roleCompetencesPreset?: Record<HouseholdRole, HouseholdCompetences> },
  userJwt?: string
): Promise<{ status: number; body: any }> {
  const { source, household } = await getHouseholdById(params.householdId, userJwt);
  if (!household) {
    return { status: 404, body: { success: false, error: "Maison introuvable." } };
  }

  const caller = household.membres.find((m) => m.userId === params.userId);
  if (!caller || (!caller.estCreateur && !caller.competences.gerer_maison)) {
    return { status: 403, body: { success: false, error: "Vous n'avez pas l'autorisation d'administrer cette Maison." } };
  }

  if (params.nom && typeof params.nom === "string" && params.nom.trim()) {
    household.nom = params.nom.trim();
  }

  if (params.roleCompetencesPreset && typeof params.roleCompetencesPreset === "object") {
    household.roleCompetencesPreset = {
      ...household.roleCompetencesPreset,
      ...params.roleCompetencesPreset,
    };

    household.membres.forEach((m) => {
      if (m.role !== "custom" && !m.estCreateur && household.roleCompetencesPreset?.[m.role]) {
        m.competences = { ...household.roleCompetencesPreset[m.role] };
      }
    });
  }

  await upsertHousehold(household, source, userJwt);
  const secret = await getSecretRecord(household.id, source, userJwt);
  return { status: 200, body: { success: true, household: attachSanitizedMcpConfig(household, secret) } };
}

export async function updateHouseholdMemberRecord(
  params: {
    householdId: string;
    userId: string;
    targetMemberId: string;
    role?: HouseholdRole;
    competences?: Partial<HouseholdCompetences>;
    nom?: string;
    avatar?: string;
  },
  userJwt?: string
): Promise<{ status: number; body: any }> {
  const { source, household } = await getHouseholdById(params.householdId, userJwt);
  if (!household) {
    return { status: 404, body: { success: false, error: "Maison introuvable." } };
  }

  const caller = household.membres.find((m) => m.userId === params.userId);
  const target = household.membres.find((m) => m.id === params.targetMemberId);
  if (!target) {
    return { status: 404, body: { success: false, error: "Membre introuvable." } };
  }

  const isSelf = target.userId === params.userId;
  const canManage = Boolean(caller && (caller.estCreateur || caller.competences.gerer_maison));

  if ((params.role !== undefined || params.competences !== undefined) && !canManage) {
    return { status: 403, body: { success: false, error: "Seul le Chef de maison peut modifier les rôles et permissions." } };
  }

  if (params.nom && typeof params.nom === "string" && (isSelf || canManage)) {
    target.nom = params.nom.trim();
  }
  if (params.avatar && typeof params.avatar === "string" && (isSelf || canManage)) {
    target.avatar = params.avatar;
  }

  if (params.role && canManage) {
    target.role = params.role;
    if (params.role !== "custom") {
      const preset = household.roleCompetencesPreset?.[params.role] || DEFAULT_ROLE_COMPETENCES[params.role];
      target.competences = { ...preset };
    }
  }

  if (params.competences && canManage) {
    target.competences = {
      ...target.competences,
      ...params.competences,
    };
  }

  await upsertHousehold(household, source, userJwt);
  const secret = await getSecretRecord(household.id, source, userJwt);
  return {
    status: 200,
    body: { success: true, household: attachSanitizedMcpConfig(household, secret), targetMember: target },
  };
}

export async function removeHouseholdMemberRecord(
  params: { householdId: string; userId: string; targetMemberId: string },
  userJwt?: string
): Promise<{ status: number; body: any }> {
  const { source, household } = await getHouseholdById(params.householdId, userJwt);
  if (!household) {
    return { status: 404, body: { success: false, error: "Maison introuvable." } };
  }

  const caller = household.membres.find((m) => m.userId === params.userId);
  const target = household.membres.find((m) => m.id === params.targetMemberId);
  if (!target) {
    return { status: 404, body: { success: false, error: "Membre introuvable." } };
  }

  const isSelf = target.userId === params.userId;
  const canManage = Boolean(caller && (caller.estCreateur || caller.competences.gerer_maison));
  if (!isSelf && !canManage) {
    return { status: 403, body: { success: false, error: "Action non autorisée." } };
  }

  if (target.estCreateur && household.membres.length > 1) {
    return { status: 400, body: { success: false, error: "Le créateur ne peut pas quitter la maison tant qu'il y a d'autres membres." } };
  }

  household.membres = household.membres.filter((m) => m.id !== params.targetMemberId);
  if (household.membres.length === 0) {
    await deleteHouseholdRecord(household.id, source, userJwt);
    return { status: 200, body: { success: true, household } };
  }

  await upsertHousehold(household, source, userJwt);
  const secret = await getSecretRecord(household.id, source, userJwt);
  return { status: 200, body: { success: true, household: attachSanitizedMcpConfig(household, secret) } };
}

export async function leaveHouseholdRecord(
  params: { householdId: string; userId: string },
  userJwt?: string
): Promise<{ status: number; body: any }> {
  const { source, household } = await getHouseholdById(params.householdId, userJwt);
  if (!household) {
    return { status: 404, body: { success: false, error: "Maison introuvable." } };
  }
  const target = household.membres.find((m) => m.userId === params.userId);
  if (!target) {
    return { status: 200, body: { success: true } };
  }
  if (target.estCreateur && household.membres.length > 1) {
    return { status: 400, body: { success: false, error: "Le créateur ne peut pas quitter la maison tant qu'il y a d'autres membres." } };
  }
  return removeHouseholdMemberRecord(
    { householdId: params.householdId, userId: params.userId, targetMemberId: target.id },
    userJwt
  );
}

export async function regenerateHouseholdInviteCode(
  params: { householdId: string; userId: string },
  userJwt?: string
): Promise<{ status: number; body: any }> {
  const { source, list } = await listAllHouseholds(userJwt);
  const household = list.find((h) => h.id === params.householdId);
  if (!household) {
    return { status: 404, body: { success: false, error: "Maison introuvable." } };
  }

  const caller = household.membres.find((m) => m.userId === params.userId);
  if (!caller || (!caller.estCreateur && !caller.competences.inviter_membres && !caller.competences.gerer_maison)) {
    return { status: 403, body: { success: false, error: "Vous n'avez pas l'autorisation de renouveler le code d'invitation." } };
  }

  household.codeInvitation = generateHouseholdCode(list.map((h) => h.codeInvitation));
  await upsertHousehold(household, source, userJwt);
  const secret = await getSecretRecord(household.id, source, userJwt);

  return {
    status: 200,
    body: {
      success: true,
      codeInvitation: household.codeInvitation,
      household: attachSanitizedMcpConfig(household, secret),
    },
  };
}

export async function configureHouseholdMcp(
  params: { householdId: string; userId: string; enabled?: boolean; boundUserId?: string; regenerateToken?: boolean },
  userJwt?: string
): Promise<{ status: number; body: any; closeSessions?: boolean }> {
  const { source, household } = await getHouseholdById(params.householdId, userJwt);
  if (!household) {
    return { status: 404, body: { success: false, error: "Maison introuvable." } };
  }

  const caller = household.membres.find((m) => m.userId === params.userId);
  if (!caller || (!caller.estCreateur && caller.role !== "chef" && !caller.competences?.gerer_maison)) {
    return { status: 403, body: { success: false, error: "Seul le Chef de maison peut configurer le serveur MCP." } };
  }

  const existing = await getSecretRecord(household.id, source, userJwt);
  const now = new Date().toISOString();
  let plainTokenToReturn: string | undefined;

  let tokenHash = existing?.tokenHash || "";
  let tokenPreview = existing?.tokenPreview || "";
  const nextEnabled = typeof params.enabled === "boolean" ? params.enabled : (existing?.enabled ?? false);

  if (params.boundUserId !== undefined) {
    const targetExists = household.membres.some((m) => m.userId === params.boundUserId);
    if (!targetExists) {
      return { status: 400, body: { success: false, error: "Le membre sélectionné n'appartient pas à cette Maison." } };
    }
  }

  const nextBoundUserId = params.boundUserId || existing?.boundUserId || household.createurUserId || caller.userId;

  if (params.regenerateToken || (nextEnabled && !tokenHash)) {
    const generated = generateMcpToken();
    tokenHash = generated.tokenHash;
    tokenPreview = generated.tokenPreview;
    plainTokenToReturn = generated.rawToken;
  }

  const nextSecret: McpSecretRecord = {
    tokenHash,
    tokenPreview,
    enabled: nextEnabled,
    boundUserId: nextBoundUserId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await upsertSecretRecord(household.id, nextSecret, source, userJwt);

  return {
    status: 200,
    closeSessions: !nextEnabled || Boolean(params.regenerateToken),
    body: {
      success: true,
      household: attachSanitizedMcpConfig(household, nextSecret),
      ...(plainTokenToReturn ? { token: plainTokenToReturn } : {}),
    },
  };
}

export async function getHouseholdMcpStatus(
  householdId: string,
  activeSessions = 0,
  userJwt?: string
): Promise<{ status: number; body: any }> {
  if (!householdId) {
    return {
      status: 200,
      body: {
        success: true,
        enabled: false,
        activeSessions,
        hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        pendingCount: 0,
        lastSyncedAt: 0,
      },
    };
  }

  const { source } = await getHouseholdById(householdId, userJwt);
  const secret = await getSecretRecord(householdId, source, userJwt);
  const { mirror } = await getMirrorRecord(householdId, userJwt);

  return {
    status: 200,
    body: {
      success: true,
      enabled: Boolean(secret?.enabled),
      activeSessions,
      hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      pendingCount: mirror.pendingMutations.length,
      lastSyncedAt: mirror.lastSyncedAt,
    },
  };
}

export async function syncHouseholdMirror(
  params: { householdId: string; userId: string; recettes?: any[]; planning?: any[]; courses?: any[] },
  userJwt?: string
): Promise<{ status: number; body: any }> {
  const { household } = await getHouseholdById(params.householdId, userJwt);
  if (!household) {
    return { status: 404, body: { success: false, error: "Maison introuvable." } };
  }

  const isMember = household.membres.some((m) => m.userId === params.userId);
  if (!isMember) {
    return { status: 403, body: { success: false, error: "Accès refusé à cette Maison." } };
  }

  const { source, mirror } = await getMirrorRecord(params.householdId, userJwt);
  const pending = [...(mirror.pendingMutations || [])];

  if (Array.isArray(params.recettes)) {
    mirror.recettes = params.recettes;
  }
  if (Array.isArray(params.planning)) {
    const pendingDates = new Set(
      pending.filter((m) => m.type === "suggest_meal" && m.payload?.date).map((m) => m.payload.date)
    );
    const preservedPendingEntries = mirror.planning.filter((p) => pendingDates.has(p.date));
    const incomingDates = new Set(params.planning.map((p: any) => p.date));
    mirror.planning = [
      ...params.planning,
      ...preservedPendingEntries.filter((p) => !incomingDates.has(p.date)),
    ];
  }
  if (Array.isArray(params.courses)) {
    const pendingCreatedIds = new Set<string>();
    pending.forEach((m) => {
      if (m.type === "add_shopping_items" && Array.isArray(m.payload?.createdItems)) {
        m.payload.createdItems.forEach((it: any) => pendingCreatedIds.add(it.id));
      }
    });
    const preservedPendingItems = mirror.courses.filter((c) => pendingCreatedIds.has(c.id));
    const incomingIds = new Set(params.courses.map((c: any) => c.id));
    mirror.courses = [
      ...params.courses,
      ...preservedPendingItems.filter((c) => !incomingIds.has(c.id)),
    ];
  }

  mirror.lastSyncedAt = Date.now();
  await saveMirrorRecord(params.householdId, mirror, source, userJwt);

  return {
    status: 200,
    body: {
      success: true,
      pendingMutations: pending,
    },
  };
}

export async function ackHouseholdMirror(
  params: { householdId: string; userId: string; mutationIds?: string[] },
  userJwt?: string
): Promise<{ status: number; body: any }> {
  const { household } = await getHouseholdById(params.householdId, userJwt);
  if (!household) {
    return { status: 404, body: { success: false, error: "Maison introuvable." } };
  }
  const isMember = household.membres.some((m) => m.userId === params.userId);
  if (!isMember) {
    return { status: 403, body: { success: false, error: "Accès refusé." } };
  }

  if (Array.isArray(params.mutationIds) && params.mutationIds.length > 0) {
    const { source, mirror } = await getMirrorRecord(params.householdId, userJwt);
    const ackSet = new Set(params.mutationIds);
    mirror.pendingMutations = mirror.pendingMutations.filter((m) => !ackSet.has(m.id));
    await saveMirrorRecord(params.householdId, mirror, source, userJwt);
  }

  return { status: 200, body: { success: true } };
}

export async function authenticateMcpBearerToken(
  rawToken: string
): Promise<{ household: Household; secret: McpSecretRecord; source: "supabase" | "disk" } | null> {
  if (!rawToken) return null;
  const incomingBuf = Buffer.from(hashMcpToken(rawToken), "hex");

  const sb = getServerSupabase();
  if (sb) {
    const { data: secretsList, error } = await sb
      .from("household_mcp_secrets")
      .select("*")
      .eq("enabled", true);

    if (!error && Array.isArray(secretsList)) {
      for (const row of secretsList) {
        if (!row.token_hash) continue;
        try {
          const storedBuf = Buffer.from(row.token_hash, "hex");
          if (storedBuf.length === incomingBuf.length && timingSafeEqual(storedBuf, incomingBuf)) {
            const { household } = await getHouseholdById(row.household_id);
            const secret = mapRowToSecret(row);
            if (household && secret) {
              return { household, secret, source: "supabase" };
            }
          }
        } catch {
          continue;
        }
      }
      if (IS_VERCEL) return null;
    }
  }

  if (IS_VERCEL) return null;

  const diskSecrets = loadDiskSecrets();
  const diskHouseholds = loadDiskHouseholds();
  for (const [householdId, secret] of Object.entries(diskSecrets)) {
    if (!secret.enabled || !secret.tokenHash) continue;
    try {
      const storedBuf = Buffer.from(secret.tokenHash, "hex");
      if (storedBuf.length === incomingBuf.length && timingSafeEqual(storedBuf, incomingBuf)) {
        const household = diskHouseholds[householdId];
        if (!household) return null;
        return { household, secret, source: "disk" };
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function getParisTodayISO(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}
