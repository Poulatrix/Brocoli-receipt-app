import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Household,
  HouseholdMember,
  HouseholdCompetenceKey,
  Recette,
  PlanningEntry,
  ShoppingItem,
  McpPendingMutation
} from "../types";
import type { WidgetMealData } from "./widgetRenderer";

export interface HouseholdMirrorData {
  recettes: Recette[];
  planning: PlanningEntry[];
  courses: ShoppingItem[];
  pendingMutations: McpPendingMutation[];
  lastSyncedAt: number;
}

export interface McpServiceContext {
  householdId: string;
  getHousehold: () => Household | undefined;
  getBoundMember: () => HouseholdMember | undefined;
  hasMemberCompetence: (member: HouseholdMember, key: HouseholdCompetenceKey) => boolean;
  getParisTodayISO: () => string;
  supabase: SupabaseClient | null;
  getMirrorData: (householdId: string) => HouseholdMirrorData;
  updateMirrorData: (householdId: string, updater: (data: HouseholdMirrorData) => void) => void;
  enqueuePendingMutation: (householdId: string, mutation: McpPendingMutation) => void;
  getWidgetMealsForMembers: (memberIds: string[]) => Record<string, WidgetMealData>;
}

function safeParseArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return dt.toISOString().split('T')[0];
}

function formatFrenchDay(dateISO: string): string {
  try {
    const [y, m, d] = dateISO.split('-').map(Number);
    const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC'
    }).format(dt);
  } catch {
    return dateISO;
  }
}

function pickSuggestionDateSlot(existingPlanning: PlanningEntry[]): string {
  const used = new Set(existingPlanning.map(p => p.date));
  for (let attempt = 0; attempt < 100; attempt++) {
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    const candidate = `1900-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  return `1900-12-${String((existingPlanning.length % 28) + 1).padStart(2, '0')}`;
}

async function loadHouseholdSnapshot(ctx: McpServiceContext): Promise<{
  recettes: Recette[];
  planning: PlanningEntry[];
  courses: ShoppingItem[];
}> {
  const household = ctx.getHousehold();
  const mirror = ctx.getMirrorData(ctx.householdId);
  const memberIds = household?.membres?.map(m => m.userId).filter(Boolean) || [];

  let recettes: Recette[] = [...mirror.recettes];
  let planning: PlanningEntry[] = [...mirror.planning];
  let courses: ShoppingItem[] = [...mirror.courses];

  if (ctx.supabase && memberIds.length > 0) {
    try {
      const idFilter = `${memberIds.map(id => `user_id.eq.${id}`).join(',')},user_id.is.null`;
      const [recRes, planRes, shopRes] = await Promise.all([
        ctx.supabase.from('recipes').select('*').or(idFilter),
        ctx.supabase.from('planning').select('*').or(idFilter),
        ctx.supabase.from('shopping_items').select('*').or(idFilter),
      ]);

      if (!recRes.error && recRes.data && recRes.data.length > 0) {
        recettes = recRes.data.map((r: any) => ({
          id: r.id,
          nom: r.nom || 'Sans nom',
          categorie: r.categorie || 'Autre',
          portions: Number(r.portions) || 4,
          prepMin: Number(r.prepMin ?? r.prep_min ?? 0),
          cuissonMin: Number(r.cuissonMin ?? r.cuisson_min ?? 0),
          calories: r.calories ? Number(r.calories) : undefined,
          ingredients: safeParseArray(r.ingredients),
          instructions: safeParseArray(r.instructions),
          estIA: r.estIA ?? r.est_ia ?? false,
          favori: r.favori ?? false,
          saison: r.saison || 'toute_annee',
          image: r.image ?? r.image_url ?? '',
          dateCreation: r.created_at || r.dateCreation || new Date().toISOString()
        }));
      }

      if (!planRes.error && planRes.data && planRes.data.length > 0) {
        const dbPlanning: PlanningEntry[] = planRes.data.map((p: any) => ({
          date: p.date,
          recetteId: p.recette_id ?? null,
          suggestionLibre: p.suggestion_libre ?? null,
        }));
        // Merge any unapplied mirror entries (e.g. pending MCP suggestions)
        const seenDates = new Set(dbPlanning.map(p => p.date));
        for (const mEntry of mirror.planning) {
          if (!seenDates.has(mEntry.date)) {
            dbPlanning.push(mEntry);
          }
        }
        planning = dbPlanning;
      }

      if (!shopRes.error && shopRes.data && shopRes.data.length > 0) {
        const dbCourses: ShoppingItem[] = shopRes.data.map((s: any) => ({
          id: s.id,
          quantite: Number(s.quantite) || 1,
          unite: s.unite || '',
          nom: s.nom || '',
          achete: Boolean(s.achete),
        }));
        const seenIds = new Set(dbCourses.map(c => c.id));
        for (const mItem of mirror.courses) {
          if (!seenIds.has(mItem.id)) {
            dbCourses.push(mItem);
          }
        }
        courses = dbCourses;
      }
    } catch (err) {
      console.warn("[MCP] Supabase query fallback to mirror cache:", err);
    }
  }

  // Merge widget cache meals for scheduled dates if not already present in planning
  const widgetMeals = ctx.getWidgetMealsForMembers(memberIds);
  const plannedDates = new Set(planning.map(p => p.date));
  for (const [dateStr, meal] of Object.entries(widgetMeals)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !dateStr.startsWith('1900-') && !plannedDates.has(dateStr)) {
      planning.push({
        date: dateStr,
        recetteId: null,
        suggestionLibre: meal.nom,
      });
    }
  }

  return { recettes, planning, courses };
}

async function buildWeeklyMealsText(
  ctx: McpServiceContext,
  startDate?: string,
  daysCount = 7,
  includeSuggestions = true
) {
  const household = ctx.getHousehold();
  const baseDate = startDate || ctx.getParisTodayISO();
  const { recettes, planning } = await loadHouseholdSnapshot(ctx);

  const schedule: Array<{
    date: string;
    jour: string;
    statut: 'planifie' | 'vide';
    plat: string | null;
    categorie: string | null;
    type: 'recette' | 'idee_libre' | null;
    tempsTotalMin: number | null;
    portions: number | null;
  }> = [];

  for (let i = 0; i < daysCount; i++) {
    const dateISO = addDaysISO(baseDate, i);
    const entry = planning.find(p => p.date === dateISO);
    const recette = entry?.recetteId ? recettes.find(r => r.id === entry.recetteId) : null;

    if (recette) {
      schedule.push({
        date: dateISO,
        jour: formatFrenchDay(dateISO),
        statut: 'planifie',
        plat: recette.nom,
        categorie: recette.categorie,
        type: 'recette',
        tempsTotalMin: (recette.prepMin || 0) + (recette.cuissonMin || 0),
        portions: recette.portions || 4,
      });
    } else if (entry?.suggestionLibre) {
      schedule.push({
        date: dateISO,
        jour: formatFrenchDay(dateISO),
        statut: 'planifie',
        plat: entry.suggestionLibre,
        categorie: 'Idée libre',
        type: 'idee_libre',
        tempsTotalMin: null,
        portions: null,
      });
    } else {
      schedule.push({
        date: dateISO,
        jour: formatFrenchDay(dateISO),
        statut: 'vide',
        plat: null,
        categorie: null,
        type: null,
        tempsTotalMin: null,
        portions: null,
      });
    }
  }

  const suggestions = includeSuggestions
    ? planning
        .filter(p => p.date.startsWith('1900-'))
        .map(p => {
          const r = p.recetteId ? recettes.find(rec => rec.id === p.recetteId) : null;
          return {
            slotId: p.date,
            plat: r ? r.nom : (p.suggestionLibre || 'Suggestion'),
            categorie: r?.categorie || 'Idée libre',
            note: r && p.suggestionLibre ? p.suggestionLibre : null,
          };
        })
    : [];

  const lines: string[] = [
    `Planning des repas — ${household?.nom || 'Maison Familiale'} (du ${formatFrenchDay(baseDate)} sur ${daysCount} jours)`,
    '',
    ...schedule.map(s => {
      if (s.statut === 'vide') {
        return `- ${s.jour} (${s.date}) : Aucun repas planifié`;
      }
      const details = s.tempsTotalMin ? ` [${s.categorie} · ${s.tempsTotalMin} min]` : ` [${s.categorie}]`;
      return `- ${s.jour} (${s.date}) : ${s.plat}${details}`;
    })
  ];

  if (includeSuggestions) {
    lines.push('');
    if (suggestions.length > 0) {
      lines.push(`Boîte à suggestions (${suggestions.length}) :`);
      suggestions.forEach(sg => {
        lines.push(`- ${sg.plat}${sg.note ? ` (${sg.note})` : ''}`);
      });
    } else {
      lines.push('Boîte à suggestions : aucune suggestion en attente.');
    }
  }

  return {
    text: lines.join('\n'),
    data: {
      maison: household?.nom || 'Maison Familiale',
      startDate: baseDate,
      days: daysCount,
      schedule,
      suggestions
    }
  };
}

export function createBrocoliMcpServer(ctx: McpServiceContext): McpServer {
  const server = new McpServer({
    name: "brocoli-maison-mcp",
    version: "2.1.0",
  });

  // Resource: Weekly meal plan summary
  server.registerResource(
    "planning-semaine",
    "brocoli://planning/semaine",
    {
      title: "Menu de la semaine et boîte à suggestions",
      description: "Résumé en lecture seule des repas planifiés pour les 7 prochains jours et des suggestions de la Maison.",
      mimeType: "text/plain",
    },
    async (uri) => {
      const member = ctx.getBoundMember();
      if (!member || !ctx.hasMemberCompetence(member, 'voir_recettes')) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: "text/plain",
            text: "Accès refusé par la matrice de compétences de la Maison (compétence 'voir_recettes' requise)."
          }]
        };
      }
      const summary = await buildWeeklyMealsText(ctx, undefined, 7, true);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain",
          text: summary.text
        }]
      };
    }
  );

  // Tool 1: Consulter les repas de la semaine
  server.registerTool(
    "get_weekly_meals",
    {
      title: "Consulter les repas de la semaine",
      description: "Retourne les repas planifiés de la semaine (ou à partir d'une date donnée) ainsi que les suggestions de repas en attente pour la Maison.",
      inputSchema: {
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : YYYY-MM-DD")
          .optional()
          .describe("Date de début au format YYYY-MM-DD (par défaut : aujourd'hui)"),
        days: z
          .number()
          .int()
          .min(1)
          .max(21)
          .optional()
          .describe("Nombre de jours à consulter entre 1 et 21 (défaut : 7)"),
        includeSuggestions: z
          .boolean()
          .optional()
          .describe("Inclure la boîte à suggestions de la famille (défaut : true)"),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ startDate, days, includeSuggestions }) => {
      const member = ctx.getBoundMember();
      if (!member) {
        return {
          isError: true,
          content: [{ type: "text", text: "Membre associé au jeton MCP introuvable dans cette Maison." }]
        };
      }
      if (!ctx.hasMemberCompetence(member, 'voir_recettes')) {
        return {
          isError: true,
          content: [{ type: "text", text: "Accès refusé par la matrice de compétences : la compétence 'Consulter les recettes' (voir_recettes) est désactivée pour ce profil." }]
        };
      }

      const result = await buildWeeklyMealsText(
        ctx,
        startDate,
        days ?? 7,
        includeSuggestions ?? true
      );

      return {
        content: [
          { type: "text", text: result.text },
          { type: "text", text: JSON.stringify(result.data, null, 2) }
        ]
      };
    }
  );

  // Tool 2: Lire la liste de courses
  server.registerTool(
    "get_shopping_list",
    {
      title: "Lire la liste de courses",
      description: "Retourne les articles de la liste de courses familiale avec leurs quantités, unités et statut d'achat.",
      inputSchema: {
        filter: z
          .enum(["all", "to_buy", "bought"])
          .optional()
          .describe("Filtre : 'all' (tous), 'to_buy' (à acheter), 'bought' (déjà achetés). Défaut : 'all'"),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ filter }) => {
      const member = ctx.getBoundMember();
      if (!member) {
        return {
          isError: true,
          content: [{ type: "text", text: "Membre associé au jeton MCP introuvable dans cette Maison." }]
        };
      }
      const canReadShopping =
        ctx.hasMemberCompetence(member, 'voir_recettes') ||
        ctx.hasMemberCompetence(member, 'gerer_courses') ||
        ctx.hasMemberCompetence(member, 'cocher_courses');

      if (!canReadShopping) {
        return {
          isError: true,
          content: [{ type: "text", text: "Accès refusé par la matrice de compétences de la Maison." }]
        };
      }

      const { courses } = await loadHouseholdSnapshot(ctx);
      const mode = filter || "all";
      const filtered = courses.filter(item => {
        if (mode === "to_buy") return !item.achete;
        if (mode === "bought") return item.achete;
        return true;
      });

      const toBuy = filtered.filter(i => !i.achete);
      const bought = filtered.filter(i => i.achete);

      const lines: string[] = [
        `Liste de courses (${filtered.length} article${filtered.length > 1 ? 's' : ''}) :`,
      ];

      if (toBuy.length > 0) {
        lines.push('', `À acheter (${toBuy.length}) :`);
        toBuy.forEach(i => {
          const qty = i.unite ? `${i.quantite} ${i.unite}` : `${i.quantite}`;
          lines.push(`- [ ] ${i.nom} (${qty}) [id: ${i.id}]`);
        });
      }

      if (bought.length > 0) {
        lines.push('', `Déjà achetés (${bought.length}) :`);
        bought.forEach(i => {
          const qty = i.unite ? `${i.quantite} ${i.unite}` : `${i.quantite}`;
          lines.push(`- [x] ${i.nom} (${qty}) [id: ${i.id}]`);
        });
      }

      if (filtered.length === 0) {
        lines.push('Aucun article dans cette catégorie.');
      }

      return {
        content: [
          { type: "text", text: lines.join('\n') },
          { type: "text", text: JSON.stringify({ total: filtered.length, items: filtered }, null, 2) }
        ]
      };
    }
  );

  // Tool 3: Compléter la liste de courses (ajouter des articles)
  server.registerTool(
    "add_shopping_items",
    {
      title: "Ajouter des articles à la liste de courses",
      description: "Ajoute un ou plusieurs articles à la liste de courses familiale. Fusionne automatiquement les quantités si un article non acheté identique (même nom et unité) existe déjà.",
      inputSchema: {
        items: z
          .array(
            z.object({
              nom: z.string().trim().min(1).max(120).describe("Nom de l'article (ex: Lait demi-écrémé, Pommes)"),
              quantite: z.number().positive().default(1).describe("Quantité numérique (ex: 2)"),
              unite: z.string().trim().max(30).default("").describe("Unité (ex: L, g, kg, pièce(s), ou vide)"),
            })
          )
          .min(1)
          .max(50)
          .describe("Liste des articles à ajouter"),
      },
    },
    async ({ items }) => {
      const member = ctx.getBoundMember();
      if (!member) {
        return {
          isError: true,
          content: [{ type: "text", text: "Membre associé au jeton MCP introuvable dans cette Maison." }]
        };
      }
      if (!ctx.hasMemberCompetence(member, 'gerer_courses')) {
        return {
          isError: true,
          content: [{ type: "text", text: "Action refusée par la matrice de compétences : le droit 'Gérer les Courses' (gerer_courses) est désactivé pour ce profil." }]
        };
      }

      const { courses } = await loadHouseholdSnapshot(ctx);
      const workingCourses = [...courses];
      const addedItems: ShoppingItem[] = [];
      const mergedItems: ShoppingItem[] = [];
      let needsBrowserSync = false;

      for (const raw of items) {
        const cleanNom = raw.nom.trim();
        const cleanUnite = (raw.unite || '').trim();
        const qty = Number(raw.quantite) > 0 ? Number(raw.quantite) : 1;

        const existing = workingCourses.find(
          c =>
            !c.achete &&
            c.nom.trim().toLowerCase() === cleanNom.toLowerCase() &&
            (c.unite || '').trim().toLowerCase() === cleanUnite.toLowerCase()
        );

        if (existing) {
          existing.quantite = Number((existing.quantite + qty).toFixed(2));
          mergedItems.push({ ...existing });

          if (ctx.supabase) {
            const { error } = await ctx.supabase
              .from('shopping_items')
              .update({ quantite: existing.quantite })
              .eq('id', existing.id);
            if (error) needsBrowserSync = true;
          } else {
            needsBrowserSync = true;
          }
        } else {
          const newItem: ShoppingItem = {
            id: randomUUID(),
            nom: cleanNom,
            quantite: qty,
            unite: cleanUnite,
            achete: false,
          };
          workingCourses.push(newItem);
          addedItems.push(newItem);

          if (ctx.supabase) {
            const { error } = await ctx.supabase
              .from('shopping_items')
              .insert([{ ...newItem, user_id: member.userId }]);
            if (error) needsBrowserSync = true;
          } else {
            needsBrowserSync = true;
          }
        }
      }

      ctx.updateMirrorData(ctx.householdId, (data) => {
        data.courses = workingCourses;
      });

      if (needsBrowserSync) {
        ctx.enqueuePendingMutation(ctx.householdId, {
          id: randomUUID(),
          type: 'add_shopping_items',
          payload: { items: items.map(i => ({ nom: i.nom.trim(), quantite: Number(i.quantite) || 1, unite: (i.unite || '').trim() })), createdItems: addedItems },
          createdAt: new Date().toISOString(),
        });
      }

      const summaryParts: string[] = [];
      if (addedItems.length > 0) {
        summaryParts.push(`Ajouté(s) : ${addedItems.map(i => `${i.quantite}${i.unite ? ' ' + i.unite : ''} ${i.nom}`).join(', ')}`);
      }
      if (mergedItems.length > 0) {
        summaryParts.push(`Quantité(s) mise(s) à jour : ${mergedItems.map(i => `${i.nom} (total ${i.quantite}${i.unite ? ' ' + i.unite : ''})`).join(', ')}`);
      }

      return {
        content: [
          { type: "text", text: summaryParts.join('\n') || 'Liste de courses mise à jour.' },
          { type: "text", text: JSON.stringify({ added: addedItems, merged: mergedItems }, null, 2) }
        ]
      };
    }
  );

  // Tool 4: Cocher / décocher un article
  server.registerTool(
    "toggle_shopping_item",
    {
      title: "Cocher ou décocher un article de courses",
      description: "Marque un article de la liste de courses comme acheté ou à acheter à partir de son identifiant ou de son nom.",
      inputSchema: {
        itemId: z.string().optional().describe("Identifiant UUID de l'article"),
        itemName: z.string().optional().describe("Nom (ou partie du nom) de l'article"),
        achete: z.boolean().optional().describe("État cible (true = acheté, false = à acheter). Si omis, inverse l'état actuel."),
      },
    },
    async ({ itemId, itemName, achete }) => {
      const member = ctx.getBoundMember();
      if (!member) {
        return {
          isError: true,
          content: [{ type: "text", text: "Membre associé au jeton MCP introuvable dans cette Maison." }]
        };
      }
      if (!ctx.hasMemberCompetence(member, 'cocher_courses')) {
        return {
          isError: true,
          content: [{ type: "text", text: "Action refusée par la matrice de compétences : le droit 'Cocher en magasin' (cocher_courses) est désactivé pour ce profil." }]
        };
      }

      if (!itemId && !itemName) {
        return {
          isError: true,
          content: [{ type: "text", text: "Veuillez fournir 'itemId' ou 'itemName' pour identifier l'article." }]
        };
      }

      const { courses } = await loadHouseholdSnapshot(ctx);
      let target: ShoppingItem | undefined;

      if (itemId) {
        target = courses.find(c => c.id === itemId);
      }
      if (!target && itemName) {
        const needle = itemName.trim().toLowerCase();
        target =
          courses.find(c => c.nom.trim().toLowerCase() === needle) ||
          courses.find(c => c.nom.toLowerCase().includes(needle));
      }

      if (!target) {
        return {
          isError: true,
          content: [{ type: "text", text: `Aucun article correspondant trouvé dans la liste de courses (${itemName || itemId}).` }]
        };
      }

      const nextAchete = typeof achete === 'boolean' ? achete : !target.achete;
      target.achete = nextAchete;

      let needsBrowserSync = false;
      if (ctx.supabase) {
        const { error } = await ctx.supabase
          .from('shopping_items')
          .update({ achete: nextAchete })
          .eq('id', target.id);
        if (error) needsBrowserSync = true;
      } else {
        needsBrowserSync = true;
      }

      ctx.updateMirrorData(ctx.householdId, (data) => {
        data.courses = data.courses.map(c => c.id === target!.id ? { ...c, achete: nextAchete } : c);
      });

      if (needsBrowserSync) {
        ctx.enqueuePendingMutation(ctx.householdId, {
          id: randomUUID(),
          type: 'toggle_shopping_item',
          payload: { id: target.id, nom: target.nom, achete: nextAchete },
          createdAt: new Date().toISOString(),
        });
      }

      return {
        content: [
          { type: "text", text: `Article "${target.nom}" marqué comme ${nextAchete ? 'acheté [x]' : 'à acheter [ ]'}.` },
          { type: "text", text: JSON.stringify(target, null, 2) }
        ]
      };
    }
  );

  // Tool 5: Suggérer un plat
  server.registerTool(
    "suggest_meal",
    {
      title: "Suggérer un plat pour le planning familial",
      description: "Dépose une suggestion de repas dans la boîte à suggestions de la Maison (sans modifier directement le planning officiel). Relie automatiquement une recette du carnet si le nom correspond.",
      inputSchema: {
        dishName: z.string().trim().min(1).max(160).describe("Nom du plat ou de la recette suggérée (ex: Lasagnes bolognaises, Soirée crêpes)"),
        preferredDay: z.string().trim().max(40).optional().describe("Jour souhaité optionnel (ex: Vendredi, Samedi soir)"),
        authorName: z.string().trim().max(60).optional().describe("Nom de la personne qui suggère (par défaut le membre associé au jeton)"),
      },
    },
    async ({ dishName, preferredDay, authorName }) => {
      const member = ctx.getBoundMember();
      if (!member) {
        return {
          isError: true,
          content: [{ type: "text", text: "Membre associé au jeton MCP introuvable dans cette Maison." }]
        };
      }
      if (!ctx.hasMemberCompetence(member, 'suggerer_repas')) {
        return {
          isError: true,
          content: [{ type: "text", text: "Action refusée par la matrice de compétences : le droit 'Suggérer des plats' (suggerer_repas) est désactivé pour ce profil." }]
        };
      }

      const { recettes, planning } = await loadHouseholdSnapshot(ctx);
      const needle = dishName.trim().toLowerCase();

      const matchedRecipe =
        recettes.find(r => r.nom.trim().toLowerCase() === needle) ||
        recettes.find(r => r.nom.toLowerCase().includes(needle));

      const slotDate = pickSuggestionDateSlot(planning);
      const author = authorName?.trim() || member.nom || 'Assistant MCP';
      const dayPart = preferredDay?.trim() ? ` (pour ${preferredDay.trim()})` : '';

      const recetteId = matchedRecipe ? matchedRecipe.id : null;
      const suggestionLibre = matchedRecipe
        ? `Suggéré par ${author}${dayPart}`
        : `${dishName.trim()}${dayPart} • par ${author}`;

      let needsBrowserSync = false;
      if (ctx.supabase) {
        const { error } = await ctx.supabase
          .from('planning')
          .upsert({
            date: slotDate,
            recette_id: recetteId,
            suggestion_libre: suggestionLibre,
            user_id: member.userId,
          }, { onConflict: 'user_id,date' });

        if (error) {
          needsBrowserSync = true;
        }
      } else {
        needsBrowserSync = true;
      }

      const newEntry: PlanningEntry = {
        date: slotDate,
        recetteId,
        suggestionLibre,
      };

      ctx.updateMirrorData(ctx.householdId, (data) => {
        data.planning = [...data.planning.filter(p => p.date !== slotDate), newEntry];
      });

      if (needsBrowserSync) {
        ctx.enqueuePendingMutation(ctx.householdId, {
          id: randomUUID(),
          type: 'suggest_meal',
          payload: newEntry,
          createdAt: new Date().toISOString(),
        });
      }

      const responseText = matchedRecipe
        ? `Suggestion ajoutée à la boîte à idées : "${matchedRecipe.nom}" (recette du carnet)${dayPart} par ${author}. Un membre autorisé à gérer le planning pourra la placer dans le calendrier.`
        : `Suggestion libre ajoutée à la boîte à idées : "${dishName.trim()}"${dayPart} par ${author}. Un membre autorisé à gérer le planning pourra la placer dans le calendrier.`;

      return {
        content: [
          { type: "text", text: responseText },
          { type: "text", text: JSON.stringify({ slotDate, matchedRecipe: matchedRecipe?.nom || null, entry: newEntry }, null, 2) }
        ]
      };
    }
  );

  return server;
}
